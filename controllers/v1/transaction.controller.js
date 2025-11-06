const { transaction } = require('../../libs/prisma');
const {
    getTransactions,
    getTransactionById,
    withdraw,
    deposit,
    getTotalAmounts,
    deleteTransaction,
    updateTransaction,
    approveWithdrawal,
} = require('../../services/v1/transaction.service');
const createSuccess = require('../../utils/http-success');

module.exports = {
    getTransactions: async (req, res, next) => {
        try {
            let { page, limit, search, sort, order, dayRange, grade } = req.query;
            let user = req.user;

            let result = await getTransactions({
                page,
                limit,
                search,
                sort,
                order,
                dayRange,
                grade,
                user,
            });

            if (result.data.length === 0) {
                return createSuccess.noContent(res, 'No transaction data', result.meta);
            }

            return createSuccess.ok(res, 'OK', result.data, result.meta);
        } catch (err) {
            next(err);
        }
    },

    getTransactionById: async (req, res, next) => {
        try {
            let result = await getTransactionById({ id: req.params.transactionId, user: req.user });

            return createSuccess.ok(res, 'OK', result);
        } catch (err) {
            next(err);
        }
    },

    updateTransaction: async (req, res, next) => {
        try {
            let result = await updateTransaction({
                id: req.params.transactionId,
                amount: req.body.amount,
                user: req.user,
            });

            return createSuccess.ok(res, 'Transaction updated', result);
        } catch (err) {
            next(err);
        }
    },

    deleteTransaction: async (req, res, next) => {
        try {
            let result = await deleteTransaction({ id: req.params.transactionId, user: req.user });

            return createSuccess.ok(res, 'OK', result);
        } catch (err) {
            next(err);
        }
    },

    getTotalAmounts: async (req, res, next) => {
        try {
            let result = await getTotalAmounts({ user: req.user });

            return createSuccess.ok(res, 'OK', result);
        } catch (err) {
            next(err);
        }
    },

    deposit: async (req, res, next) => {
        try {
            let { amount, studentId } = req.body;

            let result = await deposit({
                studentId,
                amount,
                user: req.user,
            });

            return createSuccess.created(res, 'Deposit trransaction created', result);
        } catch (err) {
            next(err);
        }
    },

    withdraw: async (req, res, next) => {
        try {
            let { amount, reason, studentId } = req.body;

            let result = await withdraw({
                amount,
                reason,
                user: req.user,
                studentId,
            });

            return createSuccess.created(res, 'Withdrawal transaction created', result);
        } catch (err) {
            next(err);
        }
    },

    approveWithdrawal: async (req, res, next) => {
        try {
            let result = await approveWithdrawal({
                id: req.params.transactionId,
                user: req.user,
            });

            return createSuccess.ok(res, 'Withdrawal approved', result);
        } catch (err) {
            next(err);
        }
    },
};
