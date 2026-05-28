import * as z from "zod";

const passwordRequirements =  z.string().min(8).nonempty()
    .refine((password) => /[A-Z]/.test(password), {
        message: "Needs an uppercase character",
    })
    .refine((password) => /[a-z]/.test(password), {
        message: "Needs a lowercase character",
    })
    .refine((password) => /[0-9]/.test(password), {
        message: "Needs a number"
    })
    .refine((password) => /[!@#$%^&*]/.test(password), {
        message: "Needs a special char",
    })

export const changePasswordRequirements = z.object({
    body: z.object({
        currentPassword: passwordRequirements,
        newPassword: passwordRequirements,
    })
});


export type changePasswordDTO = z.infer<typeof changePasswordRequirements>['body'];