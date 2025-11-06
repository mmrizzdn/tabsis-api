const createSuccess = require('../../utils/http-success');
const {
    createParentUser,
    getParentUsers,
    updateParentUser,
    deleteParentUser,
    getParentUserById,
    createTeacherUser,
    getTeacherUsers,
    getTeacherUserById,
} = require('../../services/v1/user.service');

module.exports = {
    createParentUser: async (req, res, next) => {
        try {
            let { nisn, studentName, parentName, grade, username, password, phoneNumber } =
                req.body;

            let result = await createParentUser({
                user: req.user,
                nisn,
                studentName,
                parentName,
                grade,
                username,
                password,
                phoneNumber,
            });

            return createSuccess.created(res, 'Parent user created', result);
        } catch (err) {
            next(err);
        }
    },

    getParentUsers: async (req, res, next) => {
        try {
            let { page, limit, search, sort, order } = req.query;
            let user = req.user;

            let result = await getParentUsers({ user, page, limit, search, sort, order });

            if (result.data.length === 0) {
                return createSuccess.noContent(res, 'No parent user data', result.meta);
            }

            return createSuccess.ok(res, 'OK', result.data, result.meta);
        } catch (err) {
            next(err);
        }
    },

    getParentUserById: async (req, res, next) => {
        try {
            let result = await getParentUserById({ id: req.params.userId, user: req.user });

            return createSuccess.ok(res, 'OK', result);
        } catch (err) {
            next(err);
        }
    },

    updateParentUser: async (req, res, next) => {
        try {
            let { nisn, studentName, parentName, username, phoneNumber } = req.body;

            let result = await updateParentUser({
                id: req.params.userId,
                user: req.user,
                nisn,
                studentName,
                parentName,
                username,
                phoneNumber,
            });

            return createSuccess.ok(res, 'Parent user updated', result);
        } catch (err) {
            next(err);
        }
    },

    deleteParentUser: async (req, res, next) => {
        try {
            await deleteParentUser({
                id: req.params.userId,
                user: req.user,
            });

            return createSuccess.noContent(res, 'Parent user deleted');
        } catch (err) {
            next(err);
        }
    },

    createTeacherUser: async (req, res, next) => {
        try {
            let { name, grade, username, password } = req.body;

            let result = await createTeacherUser({
                name,
                grade,
                username,
                password,
            });

            return createSuccess.created(res, 'Teacher user created', result);
        } catch (err) {
            next(err);
        }
    },

    getTeacherUsers: async (req, res, next) => {
        try {
            let result = await getTeacherUsers();

            if (result.data.length === 0) {
                return createSuccess.noContent(res, 'No teacher user data', result.meta);
            }

            return createSuccess.ok(res, 'OK', result.data, result.meta);
        } catch (err) {
            next(err);
        }
    },

    getTeacherUserById: async (req, res, next) => {
        try {
            let result = await getTeacherUserById({ id: req.params.userId });

            return createSuccess.ok(res, 'OK', result);
        } catch (err) {
            next(err);
        }
    },
};
