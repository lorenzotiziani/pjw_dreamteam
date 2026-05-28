import * as z from 'zod';

export const createCoperturaSchema = z.object({
  body: z.object({
    nome: z.string().min(2, 'Il nome è obbligatorio').trim(),
    descrizione: z.string().min(5, 'La descrizione è obbligatoria').trim(),
    prezzo: z
      .number({ message: 'Il prezzo è obbligatorio' })
      .positive('Il prezzo deve essere positivo'),
  }),
});

export const updateCoperturaSchema = z.object({
  body: z.object({
    nome: z.string().min(2).trim().optional(),
    descrizione: z.string().min(5).trim().optional(),
    prezzo: z.number().positive('Il prezzo deve essere positivo').optional(),
  }),
});

export type CreateCoperturaDTO = z.infer<typeof createCoperturaSchema>['body'];
export type UpdateCoperturaDTO = z.infer<typeof updateCoperturaSchema>['body'];
