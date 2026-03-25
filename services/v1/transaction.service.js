const createError = require('http-errors');

const prisma = require('../../libs/prisma');
const { TransactionType, TransactionStatus } = require('@prisma/client');

module.exports = {
  getTransactions: async (payload) => {
    let { page, limit, search, sort, order, dayRange, grade, type, status, user } = payload;

    let offsetNumber = (page - 1) * limit;

    let orderBy;
    if (sort === 'studentName') {
      orderBy = { student: { name: order } };
    } else if (sort === 'grade') {
      orderBy = { student: { grade: order } };
    } else if (sort === 'amount') {
      orderBy = { amount: order };
    } else if (sort === 'balance') {
      orderBy = { student: { balance: order } };
    } else if (sort === 'date') {
      orderBy = { date: order };
    } else {
      orderBy = { updatedAt: order };
    }

    let conditions = { AND: [] };

    return await prisma.$transaction(async (tx) => {
      if (user.role === 'Teacher') {
        let currUser = await tx.user.findUnique({
          where: { id: user.id },
          select: { teacher: { select: { grade: true } } },
        });

        conditions.AND.push({ student: { grade: currUser.teacher.grade } });
      } else if (grade && user.role === 'Superadmin') {
        conditions.AND.push({ student: { grade } });
      } else if (user.role === 'Parent') {
        conditions.AND.push({ student: { parentId: user.id } });
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

      let filter = {};

      if (dayRange) {
        let endDate = new Date();
        let startDate = new Date();
        startDate.setDate(startDate.getDate() - dayRange);

        conditions.AND.push({
          date: {
            gte: startDate,
            lte: endDate,
          },
        });

        filter.dayRange = dayRange;
      }

      console.log('type:', type);

      if (type) {
        conditions.AND.push({
          type: type === 'deposit' ? TransactionType.DEPOSIT : TransactionType.WITHDRAWAL,
        });
        filter.type = type;
      }

      if (status) {
        if (type === 'deposit') {
          conditions.AND.push({ status: TransactionStatus.SUCCESS });
          filter.status = 'success';
        } else {
          let statusEnum;
          if (status === 'pending') {
            statusEnum = TransactionStatus.PENDING;
          } else if (status === 'success') {
            statusEnum = TransactionStatus.SUCCESS;
          } else if (status === 'failed') {
            statusEnum = TransactionStatus.FAILED;
          }
          conditions.AND.push({ status: statusEnum });
          filter.status = status;
        }
      } else if (type === 'deposit') {
        conditions.AND.push({ status: TransactionStatus.SUCCESS });
        filter.status = 'success';
      }

      let result = await tx.transaction.findMany({
        take: limit,
        skip: offsetNumber,
        where: conditions,
        select: {
          id: true,
          amount: true,
          date: true,
          status: true,
          type: true,
          details: true,
          updatedAt: true,
        },
        orderBy,
      });

      let data = result.map((r) => ({
        id: r.id,
        name: r.details.studentName,
        grade: r.details.studentGrade,
        amount: r.amount,
        type: r.type,
        balance: r.details.balance,
        date: r.date,
        phoneNumber: r.details.phoneNumber,
        status: r.status,
        updatedAt: r.updatedAt,
      }));

      let total = await tx.transaction.count({ where: conditions });

      let meta = {
        page,
        limit,
        totalPages: total > 0 ? Math.ceil(total / limit) : 1,
        totalResults: total,
        ...(search ? { search } : {}),
        sort,
        order,
        ...(filter ? filter : {}),
      };

      return { data, meta };
    });
  },

  getTransactionById: async (payload) => {
    let { id, user } = payload;

    let conditions = { AND: [{ id }] };
    if (user.role === 'Teacher') {
      let currUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { teacher: { select: { grade: true } } },
      });

      conditions.AND.push({ student: { grade: currUser.teacher.grade } });
    } else if (user.role === 'Parent') {
      conditions.AND.push({ student: { parentId: user.id } });
    }

    let result = await prisma.transaction.findFirst({
      where: conditions,
      select: {
        id: true,
        amount: true,
        date: true,
        status: true,
        type: true,
        details: true,
        withdrawalReason: { select: { reason: true } },
        approvedBy: true,
        approvedAt: true,
        updatedAt: true,
      },
    });

    if (!result) {
      throw createError(404, 'Transaction not found');
    }

    return {
      id: result.id,
      name: result.details.studentName,
      grade: result.details.grade,
      amount: result.amount,
      type: result.type,
      date: result.date,
      phoneNumber: result.details.phoneNumber,
      status: result.status,
      withdrawalReason: result.withdrawalReason?.reason,
      approvedBy: result.approvedBy,
      approvedAt: result.approvedAt,
      updatedAt: result.updatedAt,
    };
  },

  updateTransaction: async (payload) => {
    let { id, amount, user } = payload;

    return prisma.$transaction(async (tx) => {
      let conditions = { AND: [{ id }] };

      if (user.role === 'Teacher') {
        let currUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { teacher: { select: { grade: true } } },
        });

        conditions.AND.push({ student: { grade: currUser.teacher.grade } });
      }

      let existingTransaction = await tx.transaction.findFirst({
        where: conditions,
        select: {
          amount: true,
          type: true,
          student: { select: { id: true } },
          details: true,
        },
      });

      if (!existingTransaction) {
        throw createError(404, 'Transaction not found');
      }

      let balanceDiff;

      if (existingTransaction.type === TransactionType.DEPOSIT) {
        balanceDiff = amount - existingTransaction.amount;
      } else if (existingTransaction.type === TransactionType.WITHDRAWAL) {
        balanceDiff = existingTransaction.amount - amount;
      }

      let updatedStudent = await tx.student.update({
        where: { id: existingTransaction.student.id },
        data: { balance: { increment: balanceDiff } },
        select: { balance: true },
      });

      let result = await tx.transaction.update({
        where: { id },
        data: {
          amount,
          details: { ...existingTransaction.details, balance: updatedStudent.balance },
        },
        select: {
          id: true,
          amount: true,
          date: true,
          type: true,
          details: true,
          updatedAt: true,
        },
      });

      return {
        id: result.id,
        name: result.details.studentName,
        amount: result.amount,
        balance: result.details.balance,
        type: result.type,
        date: result.date,
        updatedAt: result.updatedAt,
      };
    });
  },

  deleteTransaction: async (payload) => {
    let { id, user } = payload;

    return prisma.$transaction(async (tx) => {
      let conditions = { AND: [{ id }] };
      if (user.role === 'Teacher') {
        let currUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { teacher: { select: { grade: true } } },
        });

        conditions.AND.push({ student: { grade: currUser.teacher.grade } });
      }

      let transaction = await tx.transaction.findFirst({
        where: conditions,
        select: {
          type: true,
          amount: true,
          student: { select: { id: true, balance: true } },
        },
      });

      if (!transaction) {
        throw createError(404, 'Transaction not found');
      }
      if (transaction.type === TransactionType.DEPOSIT) {
        await tx.student.update({
          where: { id: transaction.student.id },
          data: { balance: { decrement: transaction.amount } },
        });
      } else if (transaction.type === TransactionType.WITHDRAWAL) {
        await tx.student.update({
          where: { id: transaction.student.id },
          data: { balance: { increment: transaction.amount } },
        });
      }

      await tx.transaction.delete({
        where: { id },
      });

      return null;
    });
  },

  getTotalAmounts: async (payload) => {
    let { user } = payload;

    return await prisma.$transaction(async (tx) => {
      let conditions = { AND: [] };
      let studentConditions = { AND: [] };

      if (user.role === 'Teacher') {
        let currUser = await tx.user.findUnique({
          where: { id: user.id },
          select: { teacher: { select: { grade: true } } },
        });

        conditions.AND.push({ student: { grade: currUser.teacher.grade } });
        studentConditions.AND.push({ grade: currUser.teacher.grade });
      } else if (user.role === 'Parent') {
        conditions.AND.push({ student: { parentId: user.id } });
        studentConditions.AND.push({ parentId: user.id });
      }
      let totalDeposits = await tx.transaction.aggregate({
        _sum: {
          amount: true,
        },
        where: { ...conditions, type: TransactionType.DEPOSIT },
      });
      let totalWithdrawals = await tx.transaction.aggregate({
        _sum: {
          amount: true,
        },
        where: { ...conditions, type: TransactionType.WITHDRAWAL, status: TransactionStatus.SUCCESS },
      });
      let totalBalances = await tx.student.aggregate({
        _sum: {
          balance: true,
        },
        where: studentConditions,
      });

      return {
        totalDeposits: totalDeposits._sum.amount ?? 0,
        totalWithdrawals: totalWithdrawals._sum.amount ?? 0,
        totalBalances: totalBalances._sum.balance ?? 0,
      };
    });
  },

  deposit: async (payload) => {
    let { studentId, amount, user } = payload;

    return prisma.$transaction(async (tx) => {
      let student = await tx.student.findUnique({
        where: { id: studentId },
        select: {
          name: true,
          grade: true,
          parent: { select: { profile: { select: { phoneNumber: true } } } },
        },
      });

      if (!student) {
        throw createError(404, 'Student not found');
      }

      if (user.role === 'Teacher') {
        let currTeacher = await tx.user.findUnique({
          where: { id: user.id },
          select: { teacher: { select: { grade: true } } },
        });

        if (student.grade !== currTeacher.teacher.grade) {
          throw createError(404, 'Student not found');
        }
      }

      let updatedStudent = await tx.student.update({
        where: { id: studentId },
        data: { balance: { increment: amount } },
        select: { balance: true },
      });

      let data = {
        amount,
        date: new Date(),
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.SUCCESS,
        details: {
          studentName: student.name,
          studentGrade: student.grade,
          parentPhoneNumber: student.parent.profile.phoneNumber,
          balance: updatedStudent.balance,
        },
        student: { connect: { id: studentId } },
      };

      let result = await tx.transaction.create({
        data,
        select: {
          id: true,
          amount: true,
          date: true,
          type: true,
          details: true,
          updatedAt: true,
        },
      });

      return {
        id: result.id,
        name: result.details.studentName,
        amount: result.amount,
        balance: updatedStudent.balance,
        type: result.type,
        date: result.date,
        updatedAt: result.updatedAt,
      };
    });
  },

  withdraw: async (payload) => {
    let { amount, reason, user, studentId } = payload;

    return prisma.$transaction(async (tx) => {
      if (user.role === 'Parent') {
        let parent = await tx.user.findUnique({
          where: { id: user.id },
          select: {
            student: { select: { id: true } },
          },
        });

        if (!parent || !parent.student) {
          throw createError(404, 'No student associated with this parent account');
        }

        studentId = parent.student.id;
      }

      let student = await tx.student.findUnique({
        where: { id: studentId },
        select: {
          balance: true,
          name: true,
          grade: true,
          parent: { select: { profile: { select: { phoneNumber: true } } } },
        },
      });

      if (!student) {
        throw createError(404, 'Student not found');
      }

      if (student.balance < amount) {
        throw createError(400, `Insufficient balance. Current balance is ${student.balance}`);
      }

      let data = {
        amount,
        date: new Date(),
        type: TransactionType.WITHDRAWAL,
        details: {
          studentName: student.name,
          studentGrade: student.grade,
          parentPhoneNumber: student.parent.profile.phoneNumber,
        },
        withdrawalReason: { create: { reason } },
        student: { connect: { id: studentId } },
      };

      let result = await tx.transaction.create({
        data,
        select: {
          id: true,
          amount: true,
          date: true,
          type: true,
          status: true,
          details: true,
          withdrawalReason: { select: { reason: true } },
          updatedAt: true,
        },
      });

      return {
        id: result.id,
        name: result.details.studentName,
        amount: result.amount,
        type: result.type,
        date: result.date,
        status: result.status,
        withdrawalReason: result.withdrawalReason.reason,
        updatedAt: result.updatedAt,
      };
    });
  },

  approveWithdrawal: async (payload) => {
    let { ids, user } = payload;

    return await prisma.$transaction(async (tx) => {
      let conditions = {
        id: { in: ids },
        type: TransactionType.WITHDRAWAL,
        status: TransactionStatus.PENDING,
      };

      if (user.role === 'Teacher') {
        let currUser = await tx.user.findUnique({
          where: { id: user.id },
          select: { teacher: { select: { grade: true } } },
        });

        conditions.student = { grade: currUser.teacher.grade };
      }

      let transactions = await tx.transaction.findMany({
        where: conditions,
        select: {
          id: true,
          amount: true,
          date: true,
          type: true,
          status: true,
          details: true,
          student: { select: { id: true, balance: true } },
          withdrawalReason: { select: { reason: true } },
          updatedAt: true,
        },
      });

      if (transactions.length === 0) {
        throw createError(404, 'No transactions found to approve');
      }

      if (transactions.length !== ids.length) {
        throw createError(
          400,
          `Only ${transactions.length} out of ${ids.length} transactions are eligible for approval`,
        );
      }

      let approver = await tx.user.findUnique({
        where: { id: user.id },
        select: { profile: { select: { name: true } } },
      });

      let results = [];

      for (let transaction of transactions) {
        let updatedStudent = await tx.student.update({
          where: { id: transaction.student.id },
          data: { balance: { decrement: transaction.amount } },
          select: { balance: true },
        });

        let result = await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.SUCCESS,
            approvedBy: approver.profile.name,
            approvedAt: new Date(),
            details: { ...transaction.details, balance: updatedStudent.balance },
            approver: { connect: { id: user.id } },
          },
          select: {
            id: true,
            amount: true,
            date: true,
            status: true,
            type: true,
            details: true,
            withdrawalReason: { select: { reason: true } },
            approvedBy: true,
            approvedAt: true,
            updatedAt: true,
          },
        });

        results.push({
          id: result.id,
          name: result.details.studentName,
          amount: result.amount,
          balance: updatedStudent.balance,
          type: result.type,
          date: result.date,
          status: result.status,
          approvedBy: result.approvedBy,
          approvedAt: result.approvedAt,
          withdrawalReason: result.withdrawalReason.reason,
          updatedAt: result.updatedAt,
        });
      }

      return results;
    });
  },

  getChartData: async (payload) => {
    let { type, groupBy, startDate, endDate, grade, user } = payload;

    return await prisma.$transaction(async (tx) => {
      let conditions = { AND: [{ status: TransactionStatus.SUCCESS }] };

      if (user.role === 'Teacher') {
        let currUser = await tx.user.findUnique({
          where: { id: user.id },
          select: { teacher: { select: { grade: true } } },
        });

        conditions.AND.push({ student: { grade: currUser.teacher.grade } });
      } else if (grade && user.role === 'Superadmin') {
        conditions.AND.push({ student: { grade } });
      } else if (user.role === 'Parent') {
        conditions.AND.push({ student: { parentId: user.id } });
      }

      if (startDate && endDate) {
        conditions.AND.push({
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        });
      }

      if (type === 'deposit' || type === 'withdrawal') {
        conditions.AND.push({
          type: type === 'deposit' ? TransactionType.DEPOSIT : TransactionType.WITHDRAWAL,
        });
      }

      let transactions = await tx.transaction.findMany({
        where: conditions,
        select: {
          date: true,
          amount: true,
          type: true,
        },
        orderBy: { date: 'asc' },
      });

      console.log('getChartData conditions:', JSON.stringify(conditions, null, 2));
      console.log('getChartData user role:', user.role);
      console.log('getChartData user id:', user.id);
      console.log('getChartData transactions count:', transactions.length);

      let chartData = {};

      if (type === 'balance') {
        let cumulativeBalance = 0;

        transactions.forEach((transaction) => {
          let dateKey;
          if (groupBy === 'month') {
            let date = new Date(transaction.date);
            dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          } else {
            let date = new Date(transaction.date);
            dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          }

          if (transaction.type === TransactionType.DEPOSIT) {
            cumulativeBalance += Number(transaction.amount);
          } else if (transaction.type === TransactionType.WITHDRAWAL) {
            cumulativeBalance -= Number(transaction.amount);
          }

          chartData[dateKey] = {
            period: dateKey,
            value: cumulativeBalance,
          };
        });
      } else {
        transactions.forEach((transaction) => {
          let dateKey;
          if (groupBy === 'month') {
            let date = new Date(transaction.date);
            dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          } else {
            let date = new Date(transaction.date);
            dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          }

          if (!chartData[dateKey]) {
            chartData[dateKey] = {
              period: dateKey,
              value: 0,
            };
          }

          chartData[dateKey].value += Number(transaction.amount);
        });
      }

      return Object.values(chartData);
    });
  },

  getTransactionReceiptWhatsappLink: async (payload) => {
    let { id, user } = payload;

    let conditions = { AND: [{ id }, { status: TransactionStatus.SUCCESS }] };

    if (user.role === 'Teacher') {
      let currUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { teacher: { select: { grade: true } } },
      });
      conditions.AND.push({ student: { grade: currUser.teacher.grade } });
    }

    let transaction = await prisma.transaction.findFirst({
      where: conditions,
      select: {
        amount: true,
        date: true,
        type: true,
        details: true,
        student: {
          select: {
            name: true,
            balance: true,
            parent: { select: { profile: { select: { phoneNumber: true } } } },
          },
        },
      },
    });

    if (!transaction) {
      throw createError(404, 'Transaction not found or not yet approved');
    }

    let phoneNumber = transaction.student.parent.profile?.phoneNumber;
    if (!phoneNumber) {
      throw createError(400, 'Parent phone number not available');
    }

    let date = new Date(transaction.date);
    let formattedDate = `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;

    let amount = Number(transaction.amount);
    let balance = Number(transaction.student.balance);
    let formatCurrency = (val) => `Rp. ${val.toLocaleString('id-ID')},-`;

    let message;
    if (transaction.type === TransactionType.DEPOSIT) {
      message =
        `Hai ${transaction.student.name}, transaksi tabungan berhasil ditambahkan\n\n` +
        `================\n` +
        `Tanggal : ${formattedDate}\n` +
        `Jumlah setoran hari ini : ${formatCurrency(amount)}\n` +
        `Jumlah total tabungan : ${formatCurrency(balance)}`;
    } else {
      message =
        `Hai ${transaction.student.name}, penarikan tabungan berhasil diproses\n\n` +
        `================\n` +
        `Tanggal : ${formattedDate}\n` +
        `Jumlah penarikan : ${formatCurrency(amount)}\n` +
        `Jumlah total tabungan : ${formatCurrency(balance)}`;
    }

    let whatsappLink = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

    return {
      whatsappLink,
    };
  },

  getWithdrawalRequestWhatsappLink: async (payload) => {
    let { id, user } = payload;

    let conditions = { AND: [{ id }, { type: TransactionType.WITHDRAWAL }, { status: TransactionStatus.PENDING }] };

    if (user.role === 'Parent') {
      conditions.AND.push({ student: { parentId: user.id } });
    }

    let transaction = await prisma.transaction.findFirst({
      where: conditions,
      select: {
        amount: true,
        date: true,
        type: true,
        student: {
          select: {
            name: true,
            teacher: {
              select: {
                user: {
                  select: {
                    profile: {
                      select: {
                        phoneNumber: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!transaction) {
      throw createError(404, 'Transaction not found or not a pending withdrawal');
    }

    let teacherPhoneNumber = transaction.student.teacher?.user?.profile?.phoneNumber;

    if (!teacherPhoneNumber) {
      throw createError(400, 'Teacher phone number not available');
    }

    let date = new Date(transaction.date);
    let monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    let formattedDate = `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;

    let amount = Number(transaction.amount);
    let formatCurrency = (val) => `Rp. ${val.toLocaleString('id-ID')},-`;

    let message =
      `Halo,\n\n` +
      `Saya orang tua dari ${transaction.student.name} ingin memberitahukan bahwa saya telah mengajukan penarikan tabungan sebesar ${formatCurrency(amount)} pada ${formattedDate}.\n` +
      `Mohon bantuannya untuk memeriksa dan menyetujui pengajuan tersebut di aplikasi.\n\n` +
      `Terima kasih.`;

    let whatsappLink = `https://wa.me/${teacherPhoneNumber}?text=${encodeURIComponent(message)}`;

    return {
      whatsappLink,
    };
  },
};
