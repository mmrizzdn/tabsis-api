var express = require('express');
var router = express.Router();

const { auth } = require('../../middlewares/auth.middleware');
const { permit } = require('../../middlewares/permission.middleware');
const { validate } = require('../../middlewares/validator.middleware');
const {
    depositSchema,
    getTransactionsSchema,
    withdrawSchema,
    transactionParamsSchema,
    updateTransactionSchema,
} = require('../../validators/v1/transaction.validator');
const {
    deposit,
    withdraw,
    getTransactions,
    getTotalAmounts,
    getTransactionById,
    deleteTransaction,
    updateTransaction,
    approveWithdrawal,
} = require('../../controllers/v1/transaction.controller');

router.get('/', auth, permit('transaction', 'read'), validate(getTransactionsSchema, 'query'), getTransactions);
router.get('/total-amounts', auth, permit('transaction', 'read'), getTotalAmounts);
router.get(
    '/:transactionId',
    auth,
    permit('transaction', 'read'),
    validate(transactionParamsSchema, 'params'),
    getTransactionById
);
router.patch(
    '/:transactionId',
    auth,
    permit('transaction', 'update'),
    validate(transactionParamsSchema, 'params'),
    validate(updateTransactionSchema, 'body'),
    updateTransaction
);
router.delete(
    '/:transactionId',
    auth,
    permit('transaction', 'delete'),
    validate(transactionParamsSchema, 'params'),
    deleteTransaction
);

// Deposit and Withdrawal Routes
router.post('/deposit', auth, permit('deposit', 'create'), validate(depositSchema, 'body'), deposit);
router.post('/withdraw', auth, permit('withdrawal', 'create'), validate(withdrawSchema, 'body'), withdraw);
router.patch(
    '/withdraw/:transactionId',
    auth,
    permit('withdrawal', 'approve'),
    validate(transactionParamsSchema, 'params'),
    approveWithdrawal
);

module.exports = router;
