const { z } = require('zod');

module.exports = {
    updateProfileSchema: () =>
        z
            .object({
                name: z.string().trim().min(3).max(100).optional(),
                username: z
                    .string()
                    .trim()
                    .min(3)
                    .max(30)
                    .regex(/^[a-z0-9_]+$/)
                    .optional(),
                phoneNumber: z
                    .string()
                    .trim()
                    .regex(/^((\+62)|62|0)8[1-9][0-9]{7,11}$/)
                    .optional(),
                password: z.string().trim().min(8).max(128).optional(),
                confirmPassword: z.string().trim().optional(),
            })
            .superRefine((data, ctx) => {
                if (data.password && !data.confirmPassword) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: 'Confirm password is required',
                        path: ['confirmPassword'],
                    });
                } else if (data.password !== data.confirmPassword) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: 'Passwords do not match',
                        path: ['confirmPassword'],
                    });
                }
            }),

    updateAvatarSchema: () =>
        z.object({
            file: z.object({
                fieldname: z.string(),
                originalname: z.string().min(1),
                encoding: z.string(),
                size: z.number(),
                buffer: z.instanceof(Buffer),
            }),
        }),
};
