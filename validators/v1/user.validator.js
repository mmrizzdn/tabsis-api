const { z } = require('zod');

const baseUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/),
  password: z.string().trim().min(8).max(128),
  confirmPassword: z.string().trim().min(8).max(128),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^((\+62)|62|0)8[1-9][0-9]{7,11}$/),
});

module.exports = {
  userParamsSchema: () => z.object({ userId: z.string().trim().uuidv4() }),

  getParentUsersSchema: () =>
    z.object({
      page: z.coerce.number().int().positive().min(1).catch(1),
      limit: z.coerce.number().int().positive().min(1).max(100).catch(10),
      search: z.string().trim().max(100).optional(),
      sort: z.enum(['nisn', 'studentName', 'parentName', 'username', 'createdAt', 'updatedAt']).catch('updatedAt'),
      order: z.enum(['asc', 'desc']).catch('desc'),
    }),

  createParentUserSchema: (req) =>
    baseUserSchema
      .extend({
        nisn: z
          .string()
          .trim()
          .regex(/^(?!0{10})[0-9]{10}$/),
        studentName: z.string().trim().min(3).max(100),
        parentName: z.string().trim().min(3).max(100),
        grade: z.coerce.number().int().positive().min(1).max(6).optional(),
      })
      .superRefine((data, ctx) => {
        let isSuperadmin = req.user?.role === 'Superadmin';
        if (isSuperadmin && data.grade === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Grade is required',
            path: ['grade'],
          });
        } else if (!isSuperadmin && data.grade) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Only superadmin can add parent user with grade',
            path: ['grade'],
          });
        } else if (data.password !== data.confirmPassword) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Passwords do not match',
            path: ['confirmPassword'],
          });
        }
      }),

  updateParentUserSchema: () =>
    z.object({
      nisn: z
        .string()
        .trim()
        .regex(/^(?!0{10})[0-9]{10}$/)
        .optional(),
      studentName: z.string().trim().min(3).max(100).optional(),
      parentName: z.string().trim().min(3).max(100).optional(),
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
    }),

  createTeacherUserSchema: () =>
    baseUserSchema
      .extend({
        name: z.string().trim().min(3).max(100),
        grade: z.coerce.number().int().positive().min(1).max(6),
      })
      .superRefine((data, ctx) => {
        if (data.password !== data.confirmPassword) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Passwords do not match',
            path: ['confirmPassword'],
          });
        }
      }),
};
