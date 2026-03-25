const { z } = require('zod');

module.exports = {
  studentIdsSchema: () => z.object({ studentIds: z.array(z.string().trim().uuidv4()).min(1) }),
  getStudentsSchema: () =>
    z.object({
      page: z.coerce.number().int().positive().min(1).catch(1),
      limit: z.coerce.number().int().positive().min(1).max(100).catch(10),
      search: z.string().trim().max(100).optional(),
      sort: z.enum(['studentName', 'teacherName', 'createdAt', 'updatedAt']).catch('updatedAt'),
      order: z.enum(['asc', 'desc']).catch('desc'),
      grade: z.coerce.number().int().positive().min(1).max(6).optional(),
    }),
};
