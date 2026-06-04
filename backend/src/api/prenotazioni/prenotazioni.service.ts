import { RigaAccessorio, StatoPrenotazione } from '@prisma/client';
import {
  PrenotazioneCreateDTO,
  PrenotazioneUpdateDTO,
  PrenotazioneByFiltersDTO
} from './prenotazioni.dto';
import { prisma } from "../../config/prisma";
import { startOfDay, endOfDay } from 'date-fns';
import { TipiBiciService } from '../tipi-bici/tipiBici.service';
import { CopertureService } from '../coperture/coperture.service'
import { AccessoriService } from '../accessori/accessori.service'
import { PuntiVenditaService } from '../punti-vendita/puntiVendita.service'


function buildOraRitiro(dataRitiro: Date, oraRitiro: string): Date {
  const [hours, minutes, seconds] = oraRitiro.split(':').map(Number);
  const date = new Date(dataRitiro);
  date.setHours(hours, minutes, seconds, 0);
  return date;
}

function twoDaysFromNow(): Date {
  return new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
}

async function calcolaRiga(
  riga: any,
  puntoVenditaId: number,
  giorniNoleggio: number
) {
  const tipoBici = await TipiBiciService.getById(riga.tipoBiciId);
  if (!tipoBici) throw new Error(`Tipo bici ${riga.tipoBiciId} non trovato`);

  const stock = await PuntiVenditaService.getStock(puntoVenditaId);
  if (!stock) throw new Error(`Stock non trovato`);

  const isBiciAvailable = stock.some(s => s.tipoBiciId === riga.tipoBiciId);
  if (!isBiciAvailable) throw new Error(`Bici non disponibile`);

  let subtotale =
    Number(tipoBici.prezzoMezzaGiornata) * giorniNoleggio;

  if (riga.coperturaId) {
    const copertura = await CopertureService.getById(riga.coperturaId);
    if (!copertura) throw new Error(`Copertura ${riga.coperturaId} non trovata`);

    subtotale += Number(copertura.prezzo);
  }

  for (const acc of riga.accessori) {
    const accessorio = await AccessoriService.getById(acc.accessorioId);
    if (!accessorio) throw new Error(`Accessorio ${acc.accessorioId} non trovato`);

    subtotale +=
      Number(accessorio.prezzo) *
      acc.quantita *
      giorniNoleggio;
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

  static async create(data: PrenotazioneCreateDTO, utenteId: number): Promise<void> {

    const { body } = data;
    
    const dataOraRitiro = buildOraRitiro(
      body.dataRitiro,
      body.oraRitiro
    );
  
    const giorniNoleggio = Math.ceil(
      (new Date(body.dataOraRiconsegna).getTime() - new Date(dataOraRitiro).getTime()) /
      (1000 * 60 * 60 * 24)
    );
    
    const righeCalcolate = await Promise.all(
      body.righe.map((riga) =>
        calcolaRiga(riga, body.puntoVenditaId, giorniNoleggio)
      )
    );

    const totale = righeCalcolate.reduce(
      (somma, riga) => somma + riga.subtotale,
      0
    );
    
    await prisma.prenotazione.create({
      data: {
        utenteId: utenteId,
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
  }

  static async update(data: PrenotazioneUpdateDTO): Promise<void> {
    const { params, body } = data;

    const prenotazione = await PrenotazioniService.getById(params.id);

    if (prenotazione.dataRitiro <= twoDaysFromNow()) {
      throw new Error('non si può modificare la seguente prenotazione visto che mancano meno di 2 giorni');
    }
    
    await prisma.$transaction(async (tx) => {
      if (body.righe) {
        await tx.rigaPrenotazione.deleteMany({
          where: { prenotazioneId: params.id },
        });
      
        const righeCalcolate = await Promise.all(
          body.righe.map((riga) =>
            calcolaRiga(
              riga,
              prenotazione.puntoVenditaId,
              // ricalcolo giorni
              Math.ceil(
                (new Date(prenotazione.dataOraRiconsegna).getTime() -
                  new Date(prenotazione.dataRitiro).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            )
          )
        );

        const totale = righeCalcolate.reduce(
          (somma, riga) => somma + riga.subtotale,
          0
        );
      
        await tx.prenotazione.update({
          where: { id: params.id },
          data: {
            totale: totale,
            righe: {
              create: righeCalcolate,
            },
          },
        });
      }
    });
  }

  static async delete(id: number): Promise<void> {
    const prenotazione = await PrenotazioniService.getById(id);

    if (prenotazione.dataRitiro <= twoDaysFromNow()) {
      throw new Error('non si può eliminare la seguente prenotazione visto che mancano meno di 2 giorni');
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