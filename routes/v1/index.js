var express = require('express');
var router = express.Router();

const authRouter = require('./auth.routes');
const userRouter = require('./user.routes');
const profileRouter = require('./profile.routes');
const transactionRouter = require('./transaction.routes');
const studentRouter = require('./student.routes');
const createSuccess = require('../../utils/http-success');

router.get('/', (req, res) => {
  return createSuccess.ok(res, 'OK');
});
router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use('/profile', profileRouter);
router.use('/transactions', transactionRouter);
router.use('/students', studentRouter);

module.exports = router;
