import * as z from 'zod';
import { StatoPrenotazione } from '@prisma/client';

const timeHHMMSSSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/, {
    message: "Formato orario non valido. Usa HH:MM:SS (es. 09:00:00)",
  });

const rigaAccessorioSchema = z.object({
  accessorioId: z.number(),
  quantita:     z.number().int().min(1).default(1),
});

const rigaPrenotazioneSchema = z.object({
  tipoBiciId:  z.number(),
  coperturaId: z.number().optional(),
  subtotale:   z.number(),
  accessori:   z.array(rigaAccessorioSchema).default([]),
});

export const prenotazioneCreateSchema = z.object({
  body: z.object({
    dataRitiro:        z.coerce.date(),
    oraRitiro:         timeHHMMSSSchema,
    dataOraRiconsegna: z.coerce.date(),
    stato:             z.nativeEnum(StatoPrenotazione).default(StatoPrenotazione.IN_ATTESA),
    totale:            z.number(),
    utenteId:          z.number(),
    puntoVenditaId:    z.number(),
    righe:             z.array(rigaPrenotazioneSchema).min(1),
  }),
});

export const prenotazioneUpdateSchema = z.object({
  params: z.object({ id: z.coerce.number() }),
  body: z.object({
    dataRitiro:        z.coerce.date().optional(),
    oraRitiro:         timeHHMMSSSchema.optional(),
    dataOraRiconsegna: z.coerce.date().optional(),
    stato:             z.nativeEnum(StatoPrenotazione).optional(),
    totale:            z.number().optional(),
    righe:             z.array(rigaPrenotazioneSchema).min(1).optional(),
  }),
});

export const prenotazioneByFiltersSchema = z.object({
  query: z.object({
    utenteId: z.number().optional(),
    puntoVenditaId: z.number().optional(),
    dataRitiro: z.coerce.date().optional(),
  }),
});

export const prenotazioneParamsSchema = z.object({
  params: z.object({ id: z.coerce.number() }),
});

export type PrenotazioneCreateDTO = z.infer<typeof prenotazioneCreateSchema>;
export type PrenotazioneUpdateDTO = z.infer<typeof prenotazioneUpdateSchema>;
export type PrenotazioneParamsDTO = z.infer<typeof prenotazioneParamsSchema>;
export type PrenotazioneByFiltersDTO = z.infer<typeof prenotazioneByFiltersSchema>;