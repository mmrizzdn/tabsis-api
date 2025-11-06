const createError = require('http-errors');
const prisma = require('../../libs/prisma');

module.exports = {
    getTotalStudents: async () => {
        let grade1 = await prisma.student.count({
            where: { grade: 1 },
        });
        let grade2 = await prisma.student.count({
            where: { grade: 2 },
        });
        let grade3 = await prisma.student.count({
            where: { grade: 3 },
        });
        let grade4 = await prisma.student.count({
            where: { grade: 4 },
        });
        let grade5 = await prisma.student.count({
            where: { grade: 5 },
        });
        let grade6 = await prisma.student.count({
            where: { grade: 6 },
        });

        return {
            grade1,
            grade2,
            grade3,
            grade4,
            grade5,
            grade6,
        };
    },

    getStudents: async (payload) => {
        let { page, limit, search, sort, order, grade, user } = payload;

        let offsetNumber = (page - 1) * limit;

        let orderBy;
        if (sort === 'studentName') {
            orderBy = { name: order };
        } else if (sort === 'teacherName') {
            orderBy = { teacher: { user: { profile: { name: order } } } };
        } else if (sort === 'createdAt') {
            orderBy = { createdAt: order };
        } else {
            orderBy = { updatedAt: order };
        }

        let conditions = { AND: [] };
        let filter = {};

        if (user.role === 'Teacher') {
            let currUser = await prisma.user.findUnique({
                where: { id: user.id },
                select: { teacher: { select: { grade: true } } },
            });
            
            conditions.AND.push({ grade: currUser.teacher.grade });
        }

        
        if (grade) {
            conditions.AND.push({ grade });
            filter.grade = grade;
        }

        if (search) {
            conditions.AND.push({
                OR: [
                    {
                        name: { contains: search, mode: 'insensitive' },
                    },
                ],
            });
        }

        let result = await prisma.student.findMany({
            take: limit,
            skip: offsetNumber,
            where: conditions,
            select: {
                id: true,
                name: true,
                teacher: { select: { user: { select: { profile: { select: { name: true } } } } } },
                grade: true,
                isGraduated: true,
                parent: { select: { profile: { select: { phoneNumber: true } } } },
                createdAt: true,
                updatedAt: true,
            },
            orderBy,
        });

        let data = result.map((r) => ({
            id: r.id,
            studentName: r.name,
            teacherName: r.teacher?.user.profile.name,
            grade: r.grade,
            isGraduated: r.isGraduated,
            phoneNumber: r.parent.profile.phoneNumber,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
        }));

        let total = await prisma.student.count({ where: conditions });

        let meta = {
            page,
            limit,
            totalPages: total > 0 ? Math.ceil(total / limit) : 1,
            totalResults: total,
            ...(search ? { search } : {}),
            ...(filter ? { filter } : {}),
            sort,
            order,
        };

        return { data, meta };
    },

    promoteToNextGrade: async (payload) => {
        let studentIds = payload.studentIds;

        return await prisma.$transaction(async (tx) => {
            let students = await tx.student.findMany({
                where: { id: { in: studentIds }, isGraduated: false },
                select: { id: true, grade: true },
            });

            if (students.length !== payload.studentIds.length) {
                throw createError(404, 'Some students not found');
            }

            let grade6Students = students.filter((s) => s.grade === 6);
            if (grade6Students.length > 0) {
                let studentIds = grade6Students.map((s) => s.id).join(', ');
                throw createError(400, `Cannot promote students with grade 6: ${studentIds}`);
            }

            let nextGrades = [...new Set(students.map((s) => s.grade + 1))];

            let teachers = await tx.teacher.findMany({
                where: { grade: { in: nextGrades } },
                select: { id: true, grade: true },
            });

            let teachersMap = new Map(teachers.map((t) => [t.grade, t.id]));

            let updatedStudents = students.map((s) => {
                let newGrade = s.grade + 1;
                let newTeacherId = teachersMap.get(newGrade);

                if (!newTeacherId) {
                    throw createError(404, `No teacher found for grade ${newGrade}`);
                }

                return tx.student.update({
                    where: { id: s.id, grade: { lt: 6 } },
                    data: { teacherId: newTeacherId, grade: newGrade },
                    select: {
                        id: true,
                        name: true,
                        grade: true,
                        teacher: {
                            select: { user: { select: { profile: { select: { name: true } } } } },
                        },
                        parent: { select: { profile: { select: { phoneNumber: true } } } },
                    },
                });
            });

            let promotedStudents = await Promise.all(updatedStudents);

            return promotedStudents.map((s) => ({
                id: s.id,
                studentName: s.name,
                teacherName: s.teacher.user.profile.name,
                grade: s.grade,
                phoneNumber: s.parent.profile.phoneNumber,
            }));
        });
    },

    graduate: async (payload) => {
        let studentIds = payload.studentIds;

        return await prisma.$transaction(async (tx) => {
            let students = await tx.student.findMany({
                where: { id: { in: studentIds }, isGraduated: false },
                select: { id: true, teacherId: true },
            });

            if (students.length !== payload.studentIds.length) {
                throw createError(404, 'Some students not found');
            }

            await tx.student.updateMany({
                where: { id: { in: studentIds } },
                data: { teacherId: null, grade: null, isGraduated: true },
            });

            let graduatedStudents = await tx.student.findMany({
                where: { id: { in: studentIds } },
                select: {
                    id: true,
                    name: true,
                    isGraduated: true,
                    parent: { select: { profile: { select: { phoneNumber: true } } } },
                },
            });

            return graduatedStudents.map((s) => ({
                id: s.id,
                studentName: s.name,
                isGraduated: s.isGraduated,
                phoneNumber: s.parent.profile.phoneNumber,
            }));
        });
    },
};
