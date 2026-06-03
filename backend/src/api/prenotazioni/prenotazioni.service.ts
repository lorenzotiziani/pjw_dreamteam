import { PrismaClient, StatoPrenotazione } from '@prisma/client';
import {
  PrenotazioneCreateDTO,
  PrenotazioneUpdateDTO,
  PrenotazioneByFiltersDTO
} from './prenotazioni.dto';
import { prisma } from "../../config/prisma";
import { startOfDay, endOfDay } from 'date-fns';


function buildOraRitiro(dataRitiro: Date, oraRitiro: string): Date {
  const [hours, minutes, seconds] = oraRitiro.split(':').map(Number);
  const date = new Date(dataRitiro);
  date.setHours(hours, minutes, seconds, 0);
  return date;
}

function twoHoursFromNow(): Date {
  return new Date(Date.now() + 2 * 60 * 60 * 1000);
}

export class PrenotazioniService {
  static async getAll(filters: PrenotazioneByFiltersDTO) {
    return prisma.prenotazione.findMany({
      where: {
        ...(filters.query.utenteId && {
          utenteId: Number(filters.query.utenteId),
        }),
  
        ...(filters.query.puntoVenditaId && {
          puntoVenditaId: Number(filters.query.puntoVenditaId),
        }),
  
        ...(filters.query.dataRitiro && {
          dataRitiro: {
            gte: startOfDay(new Date(filters.query.dataRitiro)),
            lt: endOfDay(new Date(filters.query.dataRitiro)),
          },
        }),
      },
      include: {
        utente: {
          select: { id: true, nome: true, cognome: true, email: true, ruolo: true },
        },
        puntoVendita: true,
        righe: {
          include: {
            tipoBici:  true,
            copertura: true,
            accessori: {
              include: { accessorio: true },
            },
          },
        },
      },
      orderBy: { creataIl: 'desc' },
    });
  }

  static async getById(id: number) {
    const prenotazione = await prisma.prenotazione.findUnique({
      where: { id },
      include: {
        utente:      true,
        puntoVendita: true,
        righe: {
          include: {
            tipoBici:  true,
            copertura: true,
            accessori: {
              include: { accessorio: true },
            },
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
            tipoBici:  true,
            copertura: true,
            accessori: {
              include: { accessorio: true },
            },
          },
        },
      },
      orderBy: { creataIl: 'desc' },
    });
  }

  static async create(data: PrenotazioneCreateDTO): Promise<void> {
    const { body } = data;

    for (const riga of body.righe) {
      const stock = await prisma.stockBici.findFirst({
        where: {
          puntoVenditaId: body.puntoVenditaId,
          tipoBiciId:     riga.tipoBiciId,
        },
      });

      if (!stock) {
        throw new Error(`Tipo bici ${riga.tipoBiciId} non disponibile in questo punto vendita`);
      }

      const disponibili = stock.quantitaTotale - stock.quantitaManutenzione;

      const prenotate = await prisma.rigaPrenotazione.count({
        where: {
          tipoBiciId: riga.tipoBiciId,
          prenotazione: {
            puntoVenditaId: body.puntoVenditaId,
            stato: { not: StatoPrenotazione.CANCELLATA },
            dataRitiro:        { lte: body.dataOraRiconsegna },
            dataOraRiconsegna: { gte: body.dataRitiro },
          },
        },
      });

      if (prenotate >= disponibili) {
        throw new Error(`Nessuna bici di tipo ${riga.tipoBiciId} disponibile nel periodo selezionato`);
      }
    }

    await prisma.prenotazione.create({
      data: {
        utenteId:          body.utenteId,
        puntoVenditaId:    body.puntoVenditaId,
        dataRitiro:        body.dataRitiro,
        oraRitiro:         buildOraRitiro(body.dataRitiro, body.oraRitiro),
        dataOraRiconsegna: body.dataOraRiconsegna,
        stato:             body.stato,
        totale:            body.totale,
        righe: {
          create: body.righe.map((riga) => ({
            tipoBiciId:  riga.tipoBiciId,
            coperturaId: riga.coperturaId ?? null,
            subtotale:   riga.subtotale,
            accessori: {
              create: riga.accessori.map((acc) => ({
                accessorioId: acc.accessorioId,
                quantita:     acc.quantita,
              })),
            },
          })),
        },
      },
    });
  }

  static async update(data: PrenotazioneUpdateDTO): Promise<void> {
    const { params, body } = data;

    const prenotazione = await PrenotazioniService.getById(params.id);

    if (prenotazione.dataRitiro <= twoHoursFromNow()) {
      throw new Error('non si può modificare la seguente prenotazione visto che mancano meno di 2h');
    }
    
    await prisma.$transaction(async (tx) => {
      if (body.righe) {
        await tx.rigaPrenotazione.deleteMany({
          where: { prenotazioneId: params.id },
        });
      }

      await tx.prenotazione.update({
        where: { id: params.id },
        data: {
          ...(body.dataRitiro        && { dataRitiro: body.dataRitiro }),
          ...(body.oraRitiro         && { oraRitiro: buildOraRitiro(body.dataRitiro ?? new Date(), body.oraRitiro) }),
          ...(body.dataOraRiconsegna && { dataOraRiconsegna: body.dataOraRiconsegna }),
          ...(body.stato             && { stato: body.stato }),
          ...(body.totale !== undefined && { totale: body.totale }),
          ...(body.righe && {
            righe: {
              create: body.righe.map((riga) => ({
                tipoBiciId:  riga.tipoBiciId,
                coperturaId: riga.coperturaId ?? null,
                subtotale:   riga.subtotale,
                accessori: {
                  create: riga.accessori.map((acc) => ({
                    accessorioId: acc.accessorioId,
                    quantita:     acc.quantita,
                  })),
                },
              })),
            },
          }),
        },
      });
    });
  }

  static async delete(id: number): Promise<void> {
    const prenotazione = await PrenotazioniService.getById(id);

    if (prenotazione.dataRitiro <= twoHoursFromNow()) {
      throw new Error('non si può eliminare la seguente prenotazione visto che mancano meno di 2h');
    }
    
    await prisma.prenotazione.delete({ where: { id } });
  }

  static async aggiornaStato(id: number, stato: StatoPrenotazione): Promise<void> {
    await PrenotazioniService.getById(id);
    await prisma.prenotazione.update({
      where: { id },
      data:  { stato },
    });
  }
}