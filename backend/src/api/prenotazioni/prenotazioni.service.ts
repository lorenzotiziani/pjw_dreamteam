import { RigaAccessorio, StatoPrenotazione, TipoLogPrenotazione } from "@prisma/client";
import {
  PrenotazioneCreateDTO,
  PrenotazioneUpdateDTO,
  PrenotazioneByFiltersDTO,
} from "./prenotazioni.dto";
import { prisma } from "../../config/prisma";
import { startOfDay, addDays } from "date-fns";
import { TipiBiciService } from "../tipi-bici/tipiBici.service";
import { CopertureService } from "../coperture/coperture.service";
import { AccessoriService } from "../accessori/accessori.service";

function buildOraRitiro(dataRitiro: Date, oraRitiro: string): Date {
  const [hours, minutes, seconds] = oraRitiro.split(":").map(Number);
  const date = new Date(dataRitiro);
  date.setHours(hours, minutes, seconds, 0);
  return date;
}

function twoDaysFromNow(): Date {
  return new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
}

//TODO: DA FIXARE, CONTROLLARE LE MEZZE GIORNATE
function calcolaGiorni(dataOraRitiro: Date, dataOraRiconsegna: Date): number {
  const diffMs = dataOraRiconsegna.getTime() - dataOraRitiro.getTime();
  if (diffMs <= 0) {
    throw new Error("La data di riconsegna deve essere successiva al ritiro.");
  }
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

async function prenotaBici(
  tx: any,
  puntoVenditaId: number,
  tipoBiciId: number
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
    throw new Error(`Bici ${tipoBiciId} non disponibile nel punto vendita.`);
  }
}

async function rilasciaBici(
  tx: any,
  puntoVenditaId: number,
  tipoBiciId: number
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

async function calcolaRiga(
  riga: any,
  giorniNoleggio: number
) {
  const tipoBici = await TipiBiciService.getById(riga.tipoBiciId);
  if (!tipoBici) throw new Error(`Tipo bici ${riga.tipoBiciId} non trovato`);

  const prezzoGiornaliero = Number(tipoBici.prezzoMezzaGiornata) * 2;
  let subtotale = prezzoGiornaliero * giorniNoleggio;

  if (riga.coperturaId) {
    const copertura = await CopertureService.getById(riga.coperturaId);
    if (!copertura)
      throw new Error(`Copertura ${riga.coperturaId} non trovata`);
    subtotale += Number(copertura.prezzo);
  }

  for (const acc of riga.accessori) {
    const accessorio = await AccessoriService.getById(acc.accessorioId);
    if (!accessorio)
      throw new Error(`Accessorio ${acc.accessorioId} non trovato`);
    subtotale += Number(accessorio.prezzo) * acc.quantita * giorniNoleggio;
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

export class PrenotazioniService {
  static async getAll(filters: PrenotazioneByFiltersDTO) {
    const where: any = {};
    if (filters.query.utenteId)
      where.utenteId = Number(filters.query.utenteId);
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
        utente: { select: { id: true, nome: true, cognome: true, email: true, ruolo: true } },
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
        utente: { select: { id: true, nome: true, cognome: true, email: true, ruolo: true } },
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
    if (!prenotazione) throw new Error(`Prenotazione ${id} non trovata`);
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
    const giorniNoleggio = calcolaGiorni(dataOraRitiro, body.dataOraRiconsegna);

    await prisma.$transaction(async (tx) => {
      for (const riga of body.righe) {
        await prenotaBici(tx, body.puntoVenditaId, riga.tipoBiciId);
      }

      const righeCalcolate = await Promise.all(
        body.righe.map((riga) => calcolaRiga(riga, giorniNoleggio))
      );

      const totale = righeCalcolate.reduce((somma, r) => somma + r.subtotale, 0);

      await tx.prenotazione.create({
        data: {
          utenteId,
          puntoVenditaId: body.puntoVenditaId,
          dataRitiro: body.dataRitiro,
          oraRitiro: dataOraRitiro,
          dataOraRiconsegna: body.dataOraRiconsegna,
          totale,
          righe: {
            create: righeCalcolate,
          },
        },
      });
    });
  }

  static async update(data: PrenotazioneUpdateDTO): Promise<void> {
    const { params, body } = data;

    const prenotazione = await PrenotazioniService.getById(params.id);

    if (prenotazione.dataRitiro <= twoDaysFromNow()) {
      throw new Error(
        "Impossibile modificare: mancano meno di 2 giorni al ritiro."
      );
    }

    const nuovaDataRitiro = body.dataRitiro ?? prenotazione.dataRitiro;
    const nuovaOraRitiro = body.oraRitiro
      ? buildOraRitiro(nuovaDataRitiro, body.oraRitiro)
      : prenotazione.oraRitiro;
    const nuovaDataOraRiconsegna = body.dataOraRiconsegna ?? prenotazione.dataOraRiconsegna;
    const giorniNoleggio = calcolaGiorni(nuovaOraRitiro, nuovaDataOraRiconsegna);
    const nuovoPuntoVenditaId = body.puntoVenditaId ?? prenotazione.puntoVenditaId;

    await prisma.$transaction(async (tx) => {
      for (const riga of prenotazione.righe) {
        await rilasciaBici(tx, prenotazione.puntoVenditaId, riga.tipoBiciId);
      }

      if (body.righe) {
        for (const riga of body.righe) {
          await prenotaBici(tx, nuovoPuntoVenditaId, riga.tipoBiciId);
        }

        const righeCalcolate = await Promise.all(
          body.righe.map((riga) => calcolaRiga(riga, giorniNoleggio))
        );
        const totale = righeCalcolate.reduce((somma, r) => somma + r.subtotale, 0);

        await tx.rigaPrenotazione.deleteMany({
          where: { prenotazioneId: params.id },
        });

        await tx.prenotazione.update({
          where: { id: params.id },
          data: {
            totale,
            dataRitiro: nuovaDataRitiro,
            oraRitiro: nuovaOraRitiro,
            dataOraRiconsegna: nuovaDataOraRiconsegna,
            puntoVenditaId: nuovoPuntoVenditaId,
            righe: { create: righeCalcolate },
          },
        });
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
      throw new Error(
        "Impossibile eliminare: mancano meno di 2 giorni al ritiro."
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
    stato: StatoPrenotazione | TipoLogPrenotazione,
    operatoreId: number,
    note?: string,
  ): Promise<void> {
    const existing = await PrenotazioniService.getById(id);
    if (!existing) {
      throw new Error(`La prenotazione non esiste`);
    }
  
    if (
      stato === TipoLogPrenotazione.DANNO ||
      stato === TipoLogPrenotazione.RITARDO
    ) {
      await prisma.logPrenotazione.create({
        data: {
          prenotazioneId: id,
          operatoreId,
          tipo: stato,
          note,
        },
      });
      return;
    }
  
    if (existing.stato === stato) {
      throw new Error(`La prenotazione è già ${stato}`);
    }
  
    if (stato === StatoPrenotazione.RESTITUITA) {
      await prisma.$transaction(async (tx) => {
        await tx.prenotazione.update({
          where: { id },
          data: { stato },
        });
        await tx.logPrenotazione.create({
          data: {
            prenotazioneId: id,
            operatoreId,
            tipo: TipoLogPrenotazione.RESTITUITA,
            note,
          },
        });
        for (const riga of existing.righe) {
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
      });
    } else {
      await prisma.$transaction(async (tx) => {
        await tx.prenotazione.update({
          where: { id },
          data: { stato },
        });
        await tx.logPrenotazione.create({
          data: {
            prenotazioneId: id,
            operatoreId,
            tipo: stato as TipoLogPrenotazione,
            note,
          },
        });
      });
    }
  }
}