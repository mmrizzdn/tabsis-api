const { z } = require('zod');

module.exports = {
    loginSchema: (req) =>
        z.object({
            username: z
                .string()
                .trim()
                .min(3)
                .max(30)
                .regex(/^[a-z0-9_]+$/),

            password: z.string().trim().min(8).max(128),
        }),
};
