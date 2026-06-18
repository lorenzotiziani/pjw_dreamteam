import { RigaAccessorio, StatoPrenotazione } from "@prisma/client";
import {
  PrenotazioneCreateDTO,
  PrenotazioneUpdateDTO,
  PrenotazioneByFiltersDTO,
} from "./prenotazioni.dto";
import { prisma } from "../../config/prisma";
import { startOfDay, addDays, format } from "date-fns";
import { it } from "date-fns/locale";
import { TipiBiciService } from "../tipi-bici/tipiBici.service";
import { CopertureService } from "../coperture/coperture.service";
import { AccessoriService } from "../accessori/accessori.service";
import { BadRequestError, NotFoundError } from "../../errors";
import { mailjet } from "../../config/mailSender";
import { UserService } from "../user/user.service";


function buildOraRitiro(dataRitiro: Date, oraRitiro: string): Date {
  const [hours, minutes, seconds] = oraRitiro.split(":").map(Number);
  const date = new Date(dataRitiro);
  date.setUTCHours(hours, minutes, seconds, 0);
  return date;
}

/**
 * Normalizza dataOraRiconsegna in UTC rileggendo le ore LOCALI del server.
 * z.coerce.date() su server CEST (UTC+2) interpreta "2026-06-30T19:00:00" come
 * 19:00 locale = 17:00 UTC. Usando getHours() (ore locali = 19) e
 * setUTCHours(19) si corregge il valore a 19:00 UTC.
 */
function normalizzaRiconsegna(data: Date): Date {
  const result = new Date(data);
  result.setUTCHours(
    data.getHours(),
    data.getMinutes(),
    data.getSeconds(),
    0
  );
  return result;
}

function twoDaysFromNow(): Date {
  return new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
}

function calcolaMezzeGiornate(dataOraRitiro: Date, dataOraRiconsegna: Date): number {
  const diffMs = dataOraRiconsegna.getTime() - dataOraRitiro.getTime();
  if (diffMs <= 0) {
    throw new BadRequestError("La data di riconsegna deve essere successiva al ritiro.");
  }
  const diffOre = diffMs / (1000 * 60 * 60);
  return Math.ceil(diffOre / 6);
}

async function prenotaBici(
  tx: any,
  puntoVenditaId: number,
  tipoBiciId: number,
): Promise<void> {
  const result = await tx.stockBici.updateMany({
    where: {
      puntoVenditaId,
      tipoBiciId,
      quantitaAttuale: { gt: 0 },
    },
    data: { quantitaAttuale: { decrement: 1 } },
  });
  if (result.count === 0) {
    throw new BadRequestError(`Bici ${tipoBiciId} non disponibile nel punto vendita.`);
  }
}

async function rilasciaBici(
  tx: any,
  puntoVenditaId: number,
  tipoBiciId: number,
): Promise<void> {
  await tx.stockBici.update({
    where: {
      puntoVenditaId_tipoBiciId: {
        puntoVenditaId,
        tipoBiciId,
      },
    },
    data: { quantitaAttuale: { increment: 1 } },
  });
}

async function calcolaRiga(riga: any, mezzeGiornate: number) {
  const tipoBici = await TipiBiciService.getById(riga.tipoBiciId);
  if (!tipoBici) throw new BadRequestError(`Tipo bici ${riga.tipoBiciId} non trovato`);

  let subtotale = Number(tipoBici.prezzoMezzaGiornata) * mezzeGiornate;

  if (riga.coperturaId) {
    const copertura = await CopertureService.getById(riga.coperturaId);
    if (!copertura)
      throw new BadRequestError(`Copertura ${riga.coperturaId} non trovata`);
    subtotale += Number(copertura.prezzo);
  }

  for (const acc of riga.accessori) {
    const accessorio = await AccessoriService.getById(acc.accessorioId);
    if (!accessorio)
      throw new BadRequestError(`Accessorio ${acc.accessorioId} non trovato`);
    // Gli accessori NON dipendono dalla durata: prezzo fisso per quantità
    // (la riga rappresenta una singola bici, quindi è già "per bici").
    subtotale += Number(accessorio.prezzo) * acc.quantita;
  }

  return {
    tipoBiciId: riga.tipoBiciId,
    coperturaId: riga.coperturaId ?? null,
    subtotale,
    accessori: {
      create: riga.accessori.map((acc: RigaAccessorio) => ({
        accessorioId: acc.accessorioId,
        quantita: acc.quantita,
      })),
    },
  };
}

const categoriaLabel: Record<string, string> = {
  CITY_BIKE: 'City Bike',
  MOUNTAIN_BIKE: 'Mountain Bike',
  GRAVEL: 'Gravel',
  ROAD_BIKE: 'Road Bike',
};

function buildConfirmationEmail(user: any, p: any): string {
  const righeHtml = p.righe.map((riga: any) => {
    const motLabel = riga.tipoBici.motorizzazione === 'ELETTRICA' ? ' (Elettrica)' : '';
    const biciLabel = `${categoriaLabel[riga.tipoBici.categoria] ?? riga.tipoBici.categoria}${motLabel} — Taglia ${riga.tipoBici.taglia}`;
    const copertura = riga.copertura
      ? `<br><span style="font-size:13px;color:#666;">Assicurazione: ${riga.copertura.nome}</span>`
      : '';
    const accessori = riga.accessori.length > 0
      ? `<br><span style="font-size:13px;color:#666;">Accessori: ${riga.accessori.map((a: any) => `${a.accessorio.nome} ×${a.quantita}`).join(', ')}</span>`
      : '';
    return `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #eee;">${biciLabel}${copertura}${accessori}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;font-weight:600;">€${Number(riga.subtotale).toFixed(2)}</td>
      </tr>`;
  }).join('');

  const dataRitiro = format(new Date(p.dataRitiro), 'dd/MM/yyyy', { locale: it });
  const oraRitiro = format(new Date(p.oraRitiro), 'HH:mm', { locale: it });
  const dataRiconsegna = format(new Date(p.dataOraRiconsegna), 'dd/MM/yyyy', { locale: it });
  const oraRiconsegna = format(new Date(p.dataOraRiconsegna), 'HH:mm', { locale: it });

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#333;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

      <tr>
        <td style="background:#1a1a2e;padding:28px 40px;text-align:center;">
          <p style="margin:0;font-size:26px;font-weight:bold;color:#fff;letter-spacing:1px;">PJW DreamTeam</p>
          <p style="margin:6px 0 0;color:#8892b0;font-size:13px;">Noleggio Bici</p>
        </td>
      </tr>

      <tr>
        <td style="padding:36px 40px;">
          <h2 style="margin:0 0 6px;font-size:22px;">Prenotazione confermata!</h2>
          <p style="margin:0 0 24px;color:#666;">Ciao <strong>${user.nome}</strong>, la tua prenotazione è stata confermata con successo.</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr>
              <td style="background:#eef1ff;border-left:4px solid #4361ee;padding:14px 18px;border-radius:4px;">
                <span style="font-size:12px;color:#666;text-transform:uppercase;letter-spacing:0.5px;">Numero prenotazione</span><br>
                <strong style="font-size:20px;color:#4361ee;">#${p.id}</strong>
              </td>
            </tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:8px;margin-bottom:24px;">
            <tr>
              <td style="padding:16px;border-bottom:1px solid #eee;width:50%;vertical-align:top;">
                <div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px;">Ritiro</div>
                <div style="font-weight:bold;font-size:15px;">${dataRitiro}</div>
                <div style="color:#555;">alle ${oraRitiro}</div>
              </td>
              <td style="padding:16px;border-bottom:1px solid #eee;vertical-align:top;">
                <div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px;">Riconsegna</div>
                <div style="font-weight:bold;font-size:15px;">${dataRiconsegna}</div>
                <div style="color:#555;">alle ${oraRiconsegna}</div>
              </td>
            </tr>
            <tr>
              <td colspan="2" style="padding:16px;">
                <div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px;">Punto di ritiro</div>
                <div style="font-weight:bold;font-size:15px;">${p.puntoVendita.nome}</div>
                <div style="color:#555;">${p.puntoVendita.indirizzo}, ${p.puntoVendita.citta}</div>
              </td>
            </tr>
          </table>

          <p style="margin:0 0 10px;font-size:12px;color:#999;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Dettaglio noleggio</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:8px;margin-bottom:20px;">
            <thead>
              <tr style="background:#f9f9f9;">
                <th style="padding:10px 16px;text-align:left;font-size:12px;color:#888;font-weight:600;">Bici</th>
                <th style="padding:10px 16px;text-align:right;font-size:12px;color:#888;font-weight:600;">Subtotale</th>
              </tr>
            </thead>
            <tbody>${righeHtml}</tbody>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
            <tr>
              <td style="background:#1a1a2e;padding:16px 20px;border-radius:8px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color:#a0aec0;font-size:14px;">Totale da pagare</td>
                    <td style="text-align:right;color:#fff;font-size:22px;font-weight:bold;">€${Number(p.totale).toFixed(2)}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <p style="margin:0;color:#999;font-size:13px;line-height:1.7;">
            Presentati al punto di ritiro con un documento d'identità valido.<br>
            Per qualsiasi informazione rispondi a questa email.
          </p>
        </td>
      </tr>

      <tr>
        <td style="background:#f9f9f9;padding:18px 40px;text-align:center;border-top:1px solid #eee;">
          <p style="margin:0;font-size:12px;color:#bbb;">© ${new Date().getFullYear()} PJW DreamTeam · Noleggio Bici</p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export class PrenotazioniService {
  static async getAll(filters: PrenotazioneByFiltersDTO) {
    const where: any = {};
    if (filters.query.utenteId) where.utenteId = Number(filters.query.utenteId);
    if (filters.query.puntoVenditaId)
      where.puntoVenditaId = Number(filters.query.puntoVenditaId);
    if (filters.query.dataRitiro) {
      const dayStart = startOfDay(new Date(filters.query.dataRitiro));
      const nextDayStart = addDays(dayStart, 1);
      where.dataRitiro = {
        gte: dayStart,
        lt: nextDayStart,
      };
    }

    return prisma.prenotazione.findMany({
      where,
      include: {
        utente: {
          select: {
            id: true,
            nome: true,
            cognome: true,
            email: true,
            ruolo: true,
          },
        },
        puntoVendita: true,
        righe: {
          include: {
            tipoBici: true,
            copertura: true,
            accessori: { include: { accessorio: true } },
          },
        },
      },
      orderBy: { creataIl: "desc" },
    });
  }

  static async getById(id: number) {
    const prenotazione = await prisma.prenotazione.findUnique({
      where: { id },
      include: {
        utente: {
          select: {
            id: true,
            nome: true,
            cognome: true,
            email: true,
            ruolo: true,
          },
        },
        puntoVendita: true,
        righe: {
          include: {
            tipoBici: true,
            copertura: true,
            accessori: { include: { accessorio: true } },
          },
        },
        operazioni: true,
      },
    });
    if (!prenotazione) throw new BadRequestError(`Prenotazione ${id} non trovata`);
    return prenotazione;
  }

  static async getMie(utenteId: number) {
    return prisma.prenotazione.findMany({
      where: { utenteId },
      include: {
        puntoVendita: true,
        righe: {
          include: {
            tipoBici: true,
            copertura: true,
            accessori: { include: { accessorio: true } },
          },
        },
      },
      orderBy: { creataIl: "desc" },
    });
  }

  static async create(
    data: PrenotazioneCreateDTO,
    utenteId: number,
  ): Promise<void> {
    const { body } = data;

    const dataOraRitiro = buildOraRitiro(body.dataRitiro, body.oraRitiro);
    const giorniNoleggio = calcolaMezzeGiornate(dataOraRitiro, body.dataOraRiconsegna);

    let newPrenotazioneId = 0;

    await prisma.$transaction(async (tx) => {
      for (const riga of body.righe) {
        await prenotaBici(tx, body.puntoVenditaId, riga.tipoBiciId);
      }

      const righeCalcolate = await Promise.all(
        body.righe.map((riga) => calcolaRiga(riga, giorniNoleggio)),
      );

      const totale = righeCalcolate.reduce(
        (somma, r) => somma + r.subtotale,
        0,
      );

      const oraRiconsegna = normalizzaRiconsegna(body.dataOraRiconsegna);

      // Step 1: crea prenotazione + righe (senza accessori).
      // Un nested create a 3 livelli (prenotazione → righe[] → accessori[]) causa
      // una violazione FK su righe_accessorio.rigaPrenotazioneId quando le righe
      // sono più di una, perché Prisma assegna gli ID alle righe in batch e non
      // riesce a collegare correttamente gli accessori a ciascuna riga.
      const prenotazioneCreata = await tx.prenotazione.create({
        data: {
          utenteId,
          puntoVenditaId: body.puntoVenditaId,
          dataRitiro: body.dataRitiro,
          oraRitiro: dataOraRitiro,
          dataOraRiconsegna: oraRiconsegna,
          stato: StatoPrenotazione.CONFERMATA,
          totale,
          righe: {
            create: righeCalcolate.map(r => ({
              tipoBiciId: r.tipoBiciId,
              coperturaId: r.coperturaId,
              subtotale: r.subtotale,
            })),
          },
        },
        include: { righe: { orderBy: { id: "asc" } } },
      });

      newPrenotazioneId = prenotazioneCreata.id;

      // Step 2: ora che ogni riga ha il suo ID reale, creiamo gli accessori
      // uno step separato per ogni riga.
      for (let i = 0; i < righeCalcolate.length; i++) {
        const accCreate = righeCalcolate[i].accessori.create;
        if (accCreate.length > 0) {
          await tx.rigaAccessorio.createMany({
            data: accCreate.map((acc: any) => ({
              rigaPrenotazioneId: prenotazioneCreata.righe[i].id,
              accessorioId: acc.accessorioId,
              quantita: acc.quantita,
            })),
          });
        }
      }
    });

    const [user, prenotazione] = await Promise.all([
      UserService.getUserById(utenteId),
      PrenotazioniService.getById(newPrenotazioneId),
    ]);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    await mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: { Email: 'lorenzo.tiziani97@gmail.com', Name: 'PJW DreamTeam' },
          To: [{ Email: user.email, Name: user.nome }],
          Subject: `Prenotazione #${newPrenotazioneId} confermata — PJW DreamTeam`,
          TextPart: `Ciao ${user.nome}, la tua prenotazione #${newPrenotazioneId} è stata confermata. Totale: €${Number(prenotazione.totale).toFixed(2)}`,
          HTMLPart: buildConfirmationEmail(user, prenotazione),
        },
      ],
    });
  }

  static async update(data: PrenotazioneUpdateDTO): Promise<void> {
    const { params, body } = data;

    const prenotazione = await PrenotazioniService.getById(params.id);

    if (prenotazione.dataRitiro <= twoDaysFromNow()) {
      throw new BadRequestError(
        "Impossibile modificare: mancano meno di 2 giorni al ritiro.",
      );
    }

    const nuovaDataRitiro = body.dataRitiro ?? prenotazione.dataRitiro;
    const nuovaOraRitiro = body.oraRitiro
      ? buildOraRitiro(nuovaDataRitiro, body.oraRitiro)
      : prenotazione.oraRitiro;
    const nuovaDataOraRiconsegna = body.dataOraRiconsegna
      ? normalizzaRiconsegna(body.dataOraRiconsegna)
      : prenotazione.dataOraRiconsegna;
    const giorniNoleggio = calcolaMezzeGiornate(
      nuovaOraRitiro,
      nuovaDataOraRiconsegna,
    );
    const nuovoPuntoVenditaId =
      body.puntoVenditaId ?? prenotazione.puntoVenditaId;

    await prisma.$transaction(async (tx) => {
      for (const riga of prenotazione.righe) {
        await rilasciaBici(tx, prenotazione.puntoVenditaId, riga.tipoBiciId);
      }

      if (body.righe) {
        for (const riga of body.righe) {
          await prenotaBici(tx, nuovoPuntoVenditaId, riga.tipoBiciId);
        }

        const righeCalcolate = await Promise.all(
          body.righe.map((riga) => calcolaRiga(riga, giorniNoleggio)),
        );
        const totale = righeCalcolate.reduce(
          (somma, r) => somma + r.subtotale,
          0,
        );

        await tx.rigaPrenotazione.deleteMany({
          where: { prenotazioneId: params.id },
        });

        // Step 1: aggiorna prenotazione + crea righe senza accessori
        const prenotazioneAggiornata = await tx.prenotazione.update({
          where: { id: params.id },
          data: {
            totale,
            dataRitiro: nuovaDataRitiro,
            oraRitiro: nuovaOraRitiro,
            dataOraRiconsegna: nuovaDataOraRiconsegna,
            puntoVenditaId: nuovoPuntoVenditaId,
            righe: {
              create: righeCalcolate.map(r => ({
                tipoBiciId: r.tipoBiciId,
                coperturaId: r.coperturaId,
                subtotale: r.subtotale,
              })),
            },
          },
          include: { righe: { orderBy: { id: "asc" } } },
        });

        // Step 2: crea gli accessori usando gli ID reali delle righe appena create
        for (let i = 0; i < righeCalcolate.length; i++) {
          const accCreate = righeCalcolate[i].accessori.create;
          if (accCreate.length > 0) {
            await tx.rigaAccessorio.createMany({
              data: accCreate.map((acc: any) => ({
                rigaPrenotazioneId: prenotazioneAggiornata.righe[i].id,
                accessorioId: acc.accessorioId,
                quantita: acc.quantita,
              })),
            });
          }
        }
      } else {
        for (const riga of prenotazione.righe) {
          await prenotaBici(tx, nuovoPuntoVenditaId, riga.tipoBiciId);
        }

        await tx.prenotazione.update({
          where: { id: params.id },
          data: {
            dataRitiro: nuovaDataRitiro,
            oraRitiro: nuovaOraRitiro,
            dataOraRiconsegna: nuovaDataOraRiconsegna,
            puntoVenditaId: nuovoPuntoVenditaId,
          },
        });
      }
    });
  }

  static async delete(id: number): Promise<void> {
    const prenotazione = await PrenotazioniService.getById(id);

    if (prenotazione.dataRitiro <= twoDaysFromNow()) {
      throw new BadRequestError(
        "Impossibile eliminare: mancano meno di 2 giorni al ritiro.",
      );
    }

    await prisma.$transaction(async (tx) => {
      for (const riga of prenotazione.righe) {
        await rilasciaBici(tx, prenotazione.puntoVenditaId, riga.tipoBiciId);
      }
      await tx.prenotazione.delete({ where: { id } });
    });
  }

  static async aggiornaStato(
    id: number,
    stato: StatoPrenotazione,
    operatoreId: number,
    note?: string,
  ): Promise<void> {
    const existing = await PrenotazioniService.getById(id);
    if (!existing) {
      throw new BadRequestError(`La prenotazione non esiste`);
    }
  
    if (existing.stato === stato) {
      throw new BadRequestError(`La prenotazione è già ${stato}`);
    }

    
    if (stato === StatoPrenotazione.RITIRATA) {
      await prisma.$transaction(async (tx) => {
        await tx.prenotazione.update({
          where: { id: id },
          data: { stato },
        });
        await tx.logPrenotazione.create({
          data: { prenotazioneId: id, operatoreId, tipo: stato, note },
        });
      });
      return;
    }
  
    if (stato === StatoPrenotazione.DANNO) {
      await prisma.$transaction(async (tx) => {
        for (const riga of existing.righe) {
          const stock = await tx.stockBici.findUnique({
            where: {
              puntoVenditaId_tipoBiciId: {
                puntoVenditaId: existing.puntoVenditaId,
                tipoBiciId: riga.tipoBiciId,
              },
            },
          });
          
          if (!stock) throw new BadRequestError(`Stock non trovato per bici ${riga.tipoBiciId}`);
          if (stock.quantitaAttuale + stock.quantitaManutenzione + 1 > stock.quantitaTotale) {
            throw new BadRequestError(`Impossibile segnalare danno: tutte le bici sono già state restituite`);
          }
          
          await tx.stockBici.update({
            where: {
              puntoVenditaId_tipoBiciId: {
                puntoVenditaId: existing.puntoVenditaId,
                tipoBiciId: riga.tipoBiciId,
              },
            },
            data: { quantitaManutenzione: { increment: 1 } },
          });
        }
        await tx.prenotazione.update({
          where: { id: id },
          data: { stato },
        });
        await tx.logPrenotazione.create({
          data: { prenotazioneId: id, operatoreId, tipo: stato, note },
        });
      });
      return;
    }
  
    if (stato === StatoPrenotazione.RESTITUITA || stato === StatoPrenotazione.RITARDO) {
      await prisma.$transaction(async (tx) => {
        for (const riga of existing.righe) {
          const stock = await tx.stockBici.findUnique({
            where: {
              puntoVenditaId_tipoBiciId: {
                puntoVenditaId: existing.puntoVenditaId,
                tipoBiciId: riga.tipoBiciId,
              },
            },
          });
          
          if (!stock) throw new BadRequestError(`Stock non trovato per bici ${riga.tipoBiciId}`);
          if (stock.quantitaAttuale + 1  + stock.quantitaManutenzione > stock.quantitaTotale) {
            throw new BadRequestError(`Impossibile restituire: si supererebbe la quantità totale`);
          }

          await tx.stockBici.update({
            where: {
              puntoVenditaId_tipoBiciId: {
                puntoVenditaId: existing.puntoVenditaId,
                tipoBiciId: riga.tipoBiciId,
              },
            },
            data: { quantitaAttuale: { increment: 1 } },
          });
        }
        await tx.prenotazione.update({
          where: { id },
          data: { stato },
        });
        await tx.logPrenotazione.create({
          data: {
            prenotazioneId: id,
            operatoreId,
            tipo: stato,
            note,
          },
        });
      });
      return;
    }
  
    await prisma.$transaction(async (tx) => {
      await tx.prenotazione.update({
        where: { id },
        data: { stato },
      });
      await tx.logPrenotazione.create({
        data: { prenotazioneId: id, operatoreId, tipo: stato as StatoPrenotazione, note },
      });
    });
  }
}