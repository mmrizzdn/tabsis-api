const createError = require('http-errors');

const prisma = require('../../libs/prisma');
const redis = require('../../libs/redis');
const bcrypt = require('bcrypt');
const { normalizePhone } = require('../../utils/normalizer');

module.exports = {
  createParentUser: async (payload) => {
    let { user, nisn, studentName, parentName, grade, username, password, phoneNumber } = payload;

    return prisma.$transaction(async (tx) => {
      let exist = await tx.student.findUnique({
        where: { nisn },
      });

      if (exist) {
        throw createError(409, 'Student already exists');
      }

      let existingParent = await tx.user.findUnique({ where: { username } });

      if (existingParent) {
        throw createError(400, 'Username already exists');
      }

      let teacher;
      if (user.role === 'Superadmin') {
        teacher = await tx.teacher.findUnique({
          where: { grade },
          select: { id: true, grade: true },
        });
      } else {
        let currTeacher = await tx.user.findUnique({
          where: { id: user.id },
          select: { teacher: { select: { id: true, grade: true } } },
        });

        teacher = currTeacher.teacher;
        grade = teacher.grade;
      }

      let phone = normalizePhone(phoneNumber);

      let hashedPassword = await bcrypt.hash(password, 10);

      let parentData = {
        username,
        password: hashedPassword,
        role: { connect: { name: 'Parent' } },
      };
      let profileData = {
        name: parentName,
        phoneNumber: phone,
      };
      let studentData = {
        nisn,
        name: studentName,
        grade,
        teacher: { connect: { id: teacher.id } },
      };

      let result = await tx.user.create({
        data: {
          ...parentData,
          profile: { create: profileData },
          student: { create: studentData },
        },
        select: {
          id: true,
          username: true,
          profile: { select: { name: true, phoneNumber: true } },
          role: { select: { name: true } },
          student: {
            select: {
              id: true,
              nisn: true,
              name: true,
              grade: true,
              isGraduated: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        id: result.id,
        studentId: result.student.id,
        nisn: result.student.nisn,
        studentName: result.student.name,
        parentName: result.profile.name,
        grade: result.student.grade,
        username: result.username,
        phoneNumber: result.profile.phoneNumber,
        role: result.role.name,
      };
    });
  },

  getParentUsers: async (payload) => {
    let { user, page, limit, search, sort, order } = payload;

    let offsetNumber = (page - 1) * limit;

    let orderBy;
    if (sort === 'nisn') {
      orderBy = { student: { nisn: order } };
    } else if (sort === 'studentName') {
      orderBy = { student: { name: order } };
    } else if (sort === 'parentName') {
      orderBy = { profile: { name: order } };
    } else if (sort === 'username') {
      orderBy = { username: order };
    } else if (sort === 'createdAt') {
      orderBy = { createdAt: order };
    } else {
      orderBy = { updatedAt: order };
    }

    let conditions = { AND: [] };
    conditions.AND.push({ role: { name: 'Parent' } });

    if (user.role === 'Teacher') {
      let currUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { teacher: { select: { grade: true } } },
      });

      conditions.AND.push({ student: { grade: currUser.teacher.grade } });
    }

    if (search) {
      conditions.AND.push({
        OR: [
          {
            student: {
              name: { contains: search, mode: 'insensitive' },
            },
          },
        ],
      });
    }

    let result = await prisma.user.findMany({
      take: limit,
      skip: offsetNumber,
      where: conditions,
      select: {
        id: true,
        student: { select: { id: true, nisn: true, name: true, grade: true } },
        profile: {
          select: {
            name: true,
            phoneNumber: true,
            avatar: { select: { url: true, thumbnailUrl: true } },
          },
        },
        username: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy,
    });

    let data = result.map((r) => ({
      id: r.id,
      studentId: r.student.id,
      nisn: r.student.nisn,
      studentName: r.student.name,
      parentName: r.profile.name,
      grade: r.student.grade,
      username: r.username,
      phoneNumber: r.profile.phoneNumber,
      avatar: r.profile.avatar,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    let total = await prisma.user.count({ where: conditions });

    let meta = {
      page,
      limit,
      totalPages: total > 0 ? Math.ceil(total / limit) : 1,
      totalResults: total,
      ...(search ? { search } : {}),
      sort,
      order,
    };

    return { data, meta };
  },

  getParentUserById: async (payload) => {
    let { user, id } = payload;

    let conditions = { AND: [] };
    conditions.AND.push({ id, role: { name: 'Parent' } });

    if (user.role === 'Teacher') {
      let currUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { teacher: { select: { grade: true } } },
      });

      conditions.AND.push({ student: { grade: currUser.teacher.grade } });
    }

    let result = await prisma.user.findFirst({
      where: conditions,
      select: {
        id: true,
        student: { select: { nisn: true, name: true, grade: true } },
        profile: {
          select: {
            name: true,
            phoneNumber: true,
            avatar: { select: { url: true, thumbnailUrl: true } },
          },
        },
        username: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!result) {
      throw createError(404, 'Parent user not found');
    }

    return {
      id: result.id,
      nisn: result.student.nisn,
      studentName: result.student.name,
      parentName: result.profile.name,
      grade: result.student.grade,
      username: result.username,
      phoneNumber: result.profile.phoneNumber,
      avatar: result.profile.avatar,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  },

  updateParentUser: async (payload) => {
    let { id, user, nisn, studentName, parentName, username, phoneNumber } = payload;

    return prisma.$transaction(async (tx) => {
      let isTeacher = user.role === 'Teacher';
      let currTeacher;

      if (isTeacher) {
        currTeacher = await tx.user.findUnique({
          where: { id: user.id, role: { name: 'Teacher' } },
          select: { teacher: { select: { grade: true } } },
        });
      }

      let parent = await tx.user.findUnique({
        where: { id, role: { name: 'Parent' } },
        select: { student: { select: { grade: true } } },
      });

      if (!parent || (isTeacher && parent.student.grade !== currTeacher.teacher.grade)) {
        throw createError(404, 'Parent user not found');
      }

      let profileData = {
        name: parentName ?? undefined,
        phoneNumber: phoneNumber ? normalizePhone(phoneNumber) : undefined,
      };

      let studentData = {};

      if (nisn) {
        let exist = await tx.student.findUnique({
          where: { nisn, NOT: { parent: { id } } },
        });

        if (exist) {
          throw createError(409, 'Student already exists');
        }

        studentData.nisn = nisn;
      }

      if (username) {
        let exist = await tx.user.findUnique({
          where: { username, NOT: { id } },
        });

        if (exist) {
          throw createError(409, 'Username already exists');
        }
      }

      studentData.name = studentName;

      let result = await tx.user.update({
        where: { id },
        data: {
          username,
          profile: { update: { ...profileData } },
          student: { update: { ...studentData } },
        },
        select: {
          id: true,
          username: true,
          profile: { select: { name: true, phoneNumber: true } },
          student: {
            select: {
              id: true,
              nisn: true,
              name: true,
              grade: true,
              isGraduated: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        id,
        nisn: result.student.nisn,
        studentName: result.student.name,
        parentName: result.profile.name,
        grade: result.student.grade,
        username: result.username,
        phoneNumber: result.profile.phoneNumber,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      };
    });
  },

  deleteParentUser: async (payload) => {
    let { id, user } = payload;

    return prisma.$transaction(async (tx) => {
      let isTeacher = user.role === 'Teacher';
      let currTeacher;

      if (isTeacher) {
        currTeacher = await tx.user.findUnique({
          where: { id: user.id, role: { name: 'Teacher' } },
          select: { teacher: { select: { grade: true } } },
        });
      }

      let parent = await tx.user.findUnique({
        where: { id, role: { name: 'Parent' } },
        select: { student: { select: { grade: true } } },
      });

      if (!parent || (isTeacher && parent.student.grade !== currTeacher.teacher.grade)) {
        throw createError(404, 'Parent user not found');
      }

      await tx.user.delete({
        where: { id },
      });

      return null;
    });
  },

  createTeacherUser: async (payload) => {
    let { name, grade, username, password } = payload;

    return prisma.$transaction(async (tx) => {
      let teacher = await tx.teacher.findUnique({
        where: { grade },
        select: {
          id: true,
          userId: true,
          user: { select: { username: true, profile: { select: { name: true } } } },
        },
      });

      if (!teacher) {
        throw createError(404, `Teacher for grade ${grade} not found`);
      }

      if (teacher.userId) {
        throw createError(409, `Teacher for grade ${grade} already has an account (${teacher.user.username})`);
      }

      let user = await tx.user.findUnique({ where: { username } });

      if (user) {
        throw createError(409, 'Username already exists');
      }

      let hashedPassword = await bcrypt.hash(password, 10);

      let data = {
        username,
        password: hashedPassword,
        profile: { create: { name } },
        role: { connect: { name: 'Teacher' } },
        teacher: { connect: { grade } },
      };

      let result = await tx.user.create({
        data,
        select: {
          id: true,
          username: true,
          profile: { select: { name: true } },
          role: { select: { name: true } },
          teacher: { select: { grade: true } },
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        id: result.id,
        name: result.profile.name,
        grade: result.teacher.grade,
        username: result.username,
        role: result.role.name,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      };
    });
  },

  getTeacherUsers: async () => {
    let conditions = { role: { name: 'Teacher' } };
    let result = await prisma.user.findMany({
      where: conditions,
      select: {
        id: true,
        profile: {
          select: { name: true, avatar: { select: { url: true, thumbnailUrl: true } } },
        },
        teacher: { select: { grade: true } },
        username: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { teacher: { grade: 'asc' } },
    });

    let data = result.map((r) => ({
      id: r.id,
      name: r.profile.name,
      grade: r.teacher.grade,
      username: r.username,
      avatar: r.profile.avatar,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    let total = await prisma.user.count({ where: conditions });

    let meta = {
      totalResults: total,
    };

    return { data, meta };
  },

  getTeacherUserById: async (payload) => {
    let { id } = payload;

    let result = await prisma.user.findUnique({
      where: { id, role: { name: 'Teacher' } },
      select: {
        id: true,
        username: true,
        profile: {
          select: { name: true, avatar: { select: { url: true, thumbnailUrl: true } } },
        },
        teacher: { select: { grade: true } },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!result) {
      throw createError(404, 'Teacher user not found');
    }

    return {
      id: result.id,
      name: result.profile.name,
      grade: result.teacher.grade,
      username: result.username,
      avatar: result.profile.avatar,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  },
};
