import * as z from 'zod';
import { CategoriaBici, StatoPrenotazione } from '@prisma/client';

export const filtersStatisticheSchema = z.object({
  params: z.object({
    nominativo: z.string().optional(),
    email: z.string().optional(),
    stato: z.nativeEnum(StatoPrenotazione).optional(),
    ritiro: z.date().optional(),
    punto_vendita: z.string().optional(),
    indirizzo: z.string().optional(),
    citta: z.string().optional(),
    attivo: z.boolean().optional(),
    categoria: z.nativeEnum(CategoriaBici).optional(),
    taglia: z.string().optional(),
    motorizzazione: z.string().optional(),
    quantitaTotale: z.number().optional(),
    quantitaAttuale: z.number().optional(),
    quantitaManutenzione: z.number().optional(),
    accessorio: z.string().optional(),
    copertura_assicurativa: z.string().optional(),
    tipo: z.string().optional(),
  }),
});

export type FiltersStatisticheDTO = z.infer<typeof filtersStatisticheSchema>['params'];
