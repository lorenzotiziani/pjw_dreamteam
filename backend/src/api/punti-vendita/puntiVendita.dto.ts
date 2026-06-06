import * as z from 'zod';
import { id } from 'zod/v4/locales';

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

// ─── Stock ────────────────────────────────────────────────

export const createStockSchema = z.object({
  body: z.object({
    tipoBiciId: z.number({ message: 'tipoBiciId è obbligatorio' }).int().positive(),
    quantitaTotale: z.number({ message: 'quantitaTotale è obbligatorio' }).int().min(0),
    quantitaManutenzione: z.number().int().min(0).optional(),
  }),
});

export const updateStockSchema = z.object({
  body: z.object({
    quantitaAttuale: z.number().int().min(0).optional(),
    quantitaTotale: z.number().int().min(0).optional(),
    quantitaManutenzione: z.number().int().min(0).optional(),
  }).refine(
    data => data.quantitaTotale !== undefined || data.quantitaManutenzione !== undefined,
    { message: 'Almeno un campo è obbligatorio' }
  ),
});

export const idRequirements = z.object({
  params: z.object({
    id: z.coerce.number(),
    stockId: z.coerce.number(),
  }),
});

export type CreateStockDTO = z.infer<typeof createStockSchema>['body'];
export type UpdateStockDTO = z.infer<typeof updateStockSchema>['body'];
