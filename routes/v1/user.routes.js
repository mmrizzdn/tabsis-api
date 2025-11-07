var express = require('express');
var router = express.Router();

const { auth } = require('../../middlewares/auth.middleware');
const { permit } = require('../../middlewares/permission.middleware');
const { validate } = require('../../middlewares/validator.middleware');
const {
    createParentUserSchema,
    getParentUsersSchema,
    updateParentUserSchema,
    userParamsSchema,
    createTeacherUserSchema,
} = require('../../validators/v1/user.validator');
const {
    createParentUser,
    getParentUsers,
    getParentUserById,
    updateParentUser,
    deleteParentUser,
    createTeacherUser,
    getTeacherUsers,
    getTeacherUserById,
} = require('../../controllers/v1/user.controller');
const { cacheResponse } = require('../../middlewares/cache.middleware');

// Parent User Routes
router.post('/parents', auth, permit('parent', 'create '), validate(createParentUserSchema, 'body'), createParentUser);
router.get(
    '/parents',
    auth,
    permit('parent', 'read'),
    validate(getParentUsersSchema, 'query'),
    cacheResponse({ prefix: 'users:parents:list' }),
    getParentUsers
);
router.get(
    '/parents/:userId',
    auth,
    permit('parent', 'read'),
    validate(userParamsSchema, 'params'),
    cacheResponse({ prefix: 'users:parents:detail' }),
    getParentUserById
);
router.patch(
    '/parents/:userId',
    auth,
    permit('parent', 'update'),
    validate(userParamsSchema, 'params'),
    validate(updateParentUserSchema, 'body'),
    updateParentUser
);
router.delete(
    '/parents/:userId',
    auth,
    permit('parent', 'delete'),
    validate(userParamsSchema, 'params'),
    deleteParentUser
);

// Teacher User Routes
router.post(
    '/teachers',
    auth,
    permit('teacher', 'create'),
    validate(createTeacherUserSchema, 'body'),
    createTeacherUser
);
router.get(
    '/teachers',
    auth,
    permit('teacher', 'read'),
    cacheResponse({ prefix: 'users:teachers:list' }),
    getTeacherUsers
);
router.get(
    '/teachers/:userId',
    auth,
    permit('teacher', 'read'),
    validate(userParamsSchema, 'params'),
    cacheResponse({ prefix: 'users:teachers:detail' }),
    getTeacherUserById
);

module.exports = router;
