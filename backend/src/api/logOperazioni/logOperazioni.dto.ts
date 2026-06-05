import * as z from "zod";
import { StatoPrenotazione } from "@prisma/client";
const TipoLogOperazioneEnum = z.enum([
  StatoPrenotazione.CONFERMATA,
  StatoPrenotazione.RITIRATA,
  StatoPrenotazione.RESTITUITA,
  StatoPrenotazione.CANCELLATA,
  StatoPrenotazione.DANNO,
  StatoPrenotazione.RITARDO,
]);

export const idRequirements = z.object({
  params: z.object({
    id: z.coerce.number(),
  }),
});

export const operazioniCreateSchema = z.object({
  body: z.object({
    prenotazioneId: z.number().nonoptional(),
    operatoreId: z.number().nonoptional(),
    tipo: TipoLogOperazioneEnum.nonoptional(),
    eseguitaIl: z.date().optional(),
    note: z.string().optional(),
  }),
});

export const operazioniUpdateSchema = z.object({
  body: z.object({
    tipo: TipoLogOperazioneEnum.optional(),
    eseguitaIl: z.date().optional(),
    note: z.string().optional(),
  }),
});

export type OperazioneCreateDTO = z.infer<typeof operazioniCreateSchema>["body"];
export type OperazioneUpdateDTO = z.infer<typeof operazioniUpdateSchema>["body"];
export type OperazioneIdDTO = z.infer<typeof idRequirements>["params"];
