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
  getChartDataSchema,
  approveWithdrawalSchema,
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
  getChartData,
  getTransactionReceiptWhatsappLink,
  getWithdrawalRequestWhatsappLink,
} = require('../../controllers/v1/transaction.controller');
const { cacheResponse } = require('../../middlewares/cache.middleware');

router.get(
  '/',
  auth,
  permit('transaction', 'read'),
  validate(getTransactionsSchema, 'query'),
  cacheResponse({ prefix: 'transactions:list' }),
  getTransactions,
);
router.get(
  '/total-amounts',
  auth,
  permit('transaction', 'read'),
  cacheResponse({ prefix: 'transactions:total' }),
  getTotalAmounts,
);
router.get(
  '/chart',
  auth,
  permit('transaction', 'read'),
  validate(getChartDataSchema, 'query'),
  cacheResponse({ prefix: 'transactions:chart' }),
  getChartData,
);
router.get(
  '/:transactionId',
  auth,
  permit('transaction', 'read'),
  validate(transactionParamsSchema, 'params'),
  cacheResponse({ prefix: 'transactions:detail' }),
  getTransactionById,
);
router.get(
  '/:transactionId/whatsapp-link/receipt',
  auth,
  permit('whatsapp-link', 'generate-transaction-receipt'),
  validate(transactionParamsSchema, 'params'),
  getTransactionReceiptWhatsappLink,
);
router.get(
  '/:transactionId/whatsapp-link/withdrawal-request',
  auth,
  permit('whatsapp-link', 'generate-withdrawal-request'),
  validate(transactionParamsSchema, 'params'),
  getWithdrawalRequestWhatsappLink,
);
router.patch(
  '/:transactionId',
  auth,
  permit('transaction', 'update'),
  validate(transactionParamsSchema, 'params'),
  validate(updateTransactionSchema, 'body'),
  updateTransaction,
);
router.delete(
  '/:transactionId',
  auth,
  permit('transaction', 'delete'),
  validate(transactionParamsSchema, 'params'),
  deleteTransaction,
);

// Deposit and Withdrawal Routes
router.post('/deposit', auth, permit('deposit', 'create'), validate(depositSchema, 'body'), deposit);
router.post('/withdraw', auth, permit('withdrawal', 'create'), validate(withdrawSchema, 'body'), withdraw);
router.post(
  '/withdraw/approve',
  auth,
  permit('withdrawal', 'approve'),
  validate(approveWithdrawalSchema, 'body'),
  approveWithdrawal,
);

module.exports = router;
