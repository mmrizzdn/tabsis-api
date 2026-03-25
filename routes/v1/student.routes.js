var express = require('express');
var router = express.Router();

const { auth } = require('../../middlewares/auth.middleware');
const {
  getTotalStudents,
  getStudents,
  promoteToNextGrade,
  graduate,
} = require('../../controllers/v1/student.controller');
const { validate } = require('../../middlewares/validator.middleware');
const { getStudentsSchema, studentIdsSchema } = require('../../validators/v1/student.validator');
const { permit } = require('../../middlewares/permission.middleware');
const { cacheResponse } = require('../../middlewares/cache.middleware');

router.get(
  '/',
  auth,
  permit('student', 'read'),
  validate(getStudentsSchema, 'query'),
  cacheResponse({ prefix: 'students:list' }),
  getStudents,
);
router.get('/total', auth, permit('student', 'read'), cacheResponse({ prefix: 'students:total' }), getTotalStudents);
router.patch(
  '/promote-to-next-grade',
  auth,
  permit('student', 'promote'),
  validate(studentIdsSchema, 'body'),
  promoteToNextGrade,
);
router.patch('/graduate', auth, permit('student', 'graduate'), validate(studentIdsSchema, 'body'), graduate);

module.exports = router;
