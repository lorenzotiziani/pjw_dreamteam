import * as z from 'zod';

export const createPuntoVenditaSchema = z.object({
  body: z.object({
    nome: z.string().min(2, 'Il nome è obbligatorio').trim(),
    indirizzo: z.string().min(2, "L'indirizzo è obbligatorio").trim(),
    citta: z.string().min(2, 'La città è obbligatoria').trim(),
    attivo: z.boolean().optional(),
  }),
});

export const updatePuntoVenditaSchema = z.object({
  body: z.object({
    nome: z.string().min(2).trim().optional(),
    indirizzo: z.string().min(2).trim().optional(),
    citta: z.string().min(2).trim().optional(),
    attivo: z.boolean().optional(),
  }),
});

export type CreatePuntoVenditaDTO = z.infer<typeof createPuntoVenditaSchema>['body'];
export type UpdatePuntoVenditaDTO = z.infer<typeof updatePuntoVenditaSchema>['body'];
