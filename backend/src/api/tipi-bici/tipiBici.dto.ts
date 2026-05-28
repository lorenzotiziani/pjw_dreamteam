import * as z from 'zod';

export const createTipoBiciSchema = z.object({
  body: z.object({
    categoria: z.enum(['CITY_BIKE', 'MOUNTAIN_BIKE', 'GRAVEL', 'ROAD_BIKE'], {
      message: 'Categoria non valida',
    }),
    motorizzazione: z.enum(['NORMALE', 'ELETTRICA']).optional(),
    taglia: z.enum(['S', 'M', 'L', 'XL'], {
      message: 'Taglia non valida',
    }),
    prezzoMezzaGiornata: z
      .number({ message: 'Il prezzo è obbligatorio' })
      .positive('Il prezzo deve essere positivo'),
  }),
});

export const updateTipoBiciSchema = z.object({
  body: z.object({
    categoria: z.enum(['CITY_BIKE', 'MOUNTAIN_BIKE', 'GRAVEL', 'ROAD_BIKE']).optional(),
    motorizzazione: z.enum(['NORMALE', 'ELETTRICA']).optional(),
    taglia: z.enum(['S', 'M', 'L', 'XL']).optional(),
    prezzoMezzaGiornata: z.number().positive('Il prezzo deve essere positivo').optional(),
  }),
});

export type CreateTipoBiciDTO = z.infer<typeof createTipoBiciSchema>['body'];
export type UpdateTipoBiciDTO = z.infer<typeof updateTipoBiciSchema>['body'];
