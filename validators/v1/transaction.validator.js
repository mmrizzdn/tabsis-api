const { z } = require('zod');
const { is } = require('zod/locales');

module.exports = {
    transactionParamsSchema: () => z.object({ transactionId: z.string().trim().uuidv4() }),

    getTransactionsSchema: (req) =>
        z
            .object({
                page: z.coerce.number().int().positive().min(1).catch(1),
                limit: z.coerce.number().int().positive().min(1).max(100).catch(10),
                search: z.string().trim().max(100).optional(),
                sort: z
                    .enum(['studentName', 'grade', 'amount', 'balance', 'date', 'updatedAt'])
                    .catch('updatedAt'),
                order: z.enum(['asc', 'desc']).catch('desc'),
                dayRange: z.coerce.number().int().positive().min(1).max(30).optional(),
                grade: z.coerce.number().int().positive().min(1).max(6).optional(),
            })
            .superRefine((data, ctx) => {
                let isSuperadmin = req.user?.role === 'Superadmin';

                if (!isSuperadmin && data.grade) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: 'Only superadmin can filter by grade',
                        path: ['grade'],
                    });
                }
            }),

    depositSchema: () =>
        z.object({
            studentId: z.string().trim().uuidv4(),
            amount: z.coerce.number().positive().min(1).max(1000000),
        }),

    updateTransactionSchema: () =>
        z.object({
            amount: z.coerce.number().positive().min(1).max(1000000),
        }),

    withdrawSchema: (req) =>
        z
            .object({
                amount: z.coerce.number().positive().min(1).max(1000000),
                reason: z.string().trim().min(3).max(100),
                studentId: z.string().trim().uuidv4().optional(),
            })
            .superRefine((data, ctx) => {
                let isSuperadmin = req.user?.role === 'Superadmin';

                if (!isSuperadmin && data.studentId) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: 'Only superadmin can specify student',
                        path: ['studentId'],
                    });
                } else if (isSuperadmin && !data.studentId) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: 'Student ID is required for superadmin',
                        path: ['studentId'],
                    });
                }
            }),
};
