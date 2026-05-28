import * as z from 'zod';

export const createAccessorioSchema = z.object({
  body: z.object({
    nome: z.string().min(2, 'Il nome è obbligatorio').trim(),
    prezzo: z
      .number({ message: 'Il prezzo è obbligatorio' })
      .positive('Il prezzo deve essere positivo'),
  }),
});

export const updateAccessorioSchema = z.object({
  body: z.object({
    nome: z.string().min(2).trim().optional(),
    prezzo: z.number().positive('Il prezzo deve essere positivo').optional(),
  }),
});

export type CreateAccessorioDTO = z.infer<typeof createAccessorioSchema>['body'];
export type UpdateAccessorioDTO = z.infer<typeof updateAccessorioSchema>['body'];
