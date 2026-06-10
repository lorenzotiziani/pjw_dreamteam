import { RigaAccessorio, StatoPrenotazione } from "@prisma/client";
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
import { BadRequestError } from "../../errors";

function buildOraRitiro(dataRitiro: Date, oraRitiro: string): Date {
  const [hours, minutes, seconds] = oraRitiro.split(":").map(Number);
  const date = new Date(dataRitiro);
  date.setUTCHours(hours, minutes, seconds, 0);
  return date;
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
    subtotale += Number(accessorio.prezzo) * acc.quantita * mezzeGiornate;
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
          dataOraRiconsegna: body.dataOraRiconsegna,
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
    const nuovaDataOraRiconsegna =
      body.dataOraRiconsegna ?? prenotazione.dataOraRiconsegna;
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