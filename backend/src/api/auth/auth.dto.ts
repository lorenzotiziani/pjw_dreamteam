import * as z from "zod"
import { Ruolo } from "@prisma/client";


const passwordRequirements = z.string()
    .min(8, "La password deve essere lunga almeno 8 caratteri")
    .max(128, "La password è troppo lunga")
    .refine((password) => /[A-Z]/.test(password), {
      message: "Deve contenere almeno una lettera maiuscola",
    })
    .refine((password) => /[a-z]/.test(password), {
      message: "Deve contenere almeno una lettera minuscola",
    })
    .refine((password) => /[0-9]/.test(password), {
      message: "Deve contenere almeno un numero"
    })
    .refine((password) => /[!@#$%^&*]/.test(password), {
      message: "Deve contenere almeno un carattere speciale (!@#$%^&*)",
    });

export const loginRequirements = z.object({
  body: z.object({
    email: z.string()
        .email("Email non valida")
        .toLowerCase()
        .trim(),
    password: z.string().min(1, "Password richiesta") // Non validare troppo in login
  })
});

export const registerRequirements = z.object({
  body: z.object({
    email: z.string()
        .email("Email non valida")
        .toLowerCase()
        .trim(),
    password: passwordRequirements,
    confirm: passwordRequirements,
    nome: z.string()
        .min(2, "Il nome deve essere lungo almeno 2 caratteri")
        .max(50, "Il nome è troppo lungo")
        .trim()
        .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "Il nome contiene caratteri non validi"),
    cognome: z.string()
        .min(2, "Il cognome deve essere lungo almeno 2 caratteri")
        .max(50, "Il cognome è troppo lungo")
        .trim()
        .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "Il cognome contiene caratteri non validi"),
    ruolo: z.nativeEnum(Ruolo).optional()
  })
      .refine((data) => data.password === data.confirm, {
        message: "Le password non coincidono",
        path: ["confirm"],
      })
});


export const activateAccountRequirements = z.object({
  query: z.object({
    token: z.string().min(1, "Token richiesto")
  })
});


export const refreshTokenRequirements = z.object({
  body: z.object({
    refreshToken: z.string().min(1, "Refresh token richiesto")
  })
});

export const verifyRequirements = z.object({
  query: z.object({
    token: z.string().min(1, "Token richiesto")
  })
});


export type loginDTO = z.infer<typeof loginRequirements>['body'];
export type registerDTO = z.infer<typeof registerRequirements>['body'];
export type verifyDTO = z.infer<typeof verifyRequirements>['query'];

