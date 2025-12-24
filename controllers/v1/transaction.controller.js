const {
    getTransactions,
    getTransactionById,
    withdraw,
    deposit,
    getTotalAmounts,
    deleteTransaction,
    updateTransaction,
    approveWithdrawal,
    getChartData,
} = require('../../services/v1/transaction.service');
const createSuccess = require('../../utils/http-success');
const cache = require('../../libs/cache');

module.exports = {
    getTransactions: async (req, res, next) => {
        try {
            let { page, limit, search, sort, order, dayRange, grade, type, status } = req.query;
            let user = req.user;

            let result = await getTransactions({
                page,
                limit,
                search,
                sort,
                order,
                dayRange,
                grade,
                type,
                status,
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

            await cache.delByPattern('transactions:*');
            await cache.delByPattern('students:list:*');

            return createSuccess.ok(res, 'Transaction updated', result);
        } catch (err) {
            next(err);
        }
    },

    deleteTransaction: async (req, res, next) => {
        try {
            let result = await deleteTransaction({ id: req.params.transactionId, user: req.user });

            await cache.delByPattern('transactions:*');
            await cache.delByPattern('students:list:*');

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

            await cache.delByPattern('transactions:*');
            await cache.delByPattern('students:list:*');

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

            await cache.delByPattern('transactions:*');

            return createSuccess.created(res, 'Withdrawal transaction created', result);
        } catch (err) {
            next(err);
        }
    },

    approveWithdrawal: async (req, res, next) => {
        try {
            let result = await approveWithdrawal({
                ids: req.body.transactionIds,
                user: req.user,
            });

            await cache.delByPattern('transactions:*');
            await cache.delByPattern('students:list:*');

            return createSuccess.ok(res, `${result.length} withdrawal(s) approved`, result);
        } catch (err) {
            next(err);
        }
    },

    getChartData: async (req, res, next) => {
        try {
            let { type, groupBy, startDate, endDate, grade } = req.query;

            let result = await getChartData({
                type,
                groupBy,
                startDate,
                endDate,
                grade,
                user: req.user,
            });

            if (result.length === 0) {
                return createSuccess.noContent(res, 'No chart data available');
            }

            return createSuccess.ok(res, 'OK', result);
        } catch (err) {
            next(err);
        }
    },
};
