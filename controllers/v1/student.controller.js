const {
    getTotalStudents,
    getStudents,
    promoteToNextGrade,
    graduate,
} = require('../../services/v1/student.service');
const createSuccess = require('../../utils/http-success');
const cache = require('../../libs/cache');

module.exports = {
    getTotalStudents: async (req, res, next) => {
        try {
            let result = await getTotalStudents();

            return createSuccess.ok(res, 'OK', result);
        } catch (err) {
            next(err);
        }
    },
    getStudents: async (req, res, next) => {
        try {
            let { page, limit, search, sort, order, grade } = req.query;

            let result = await getStudents({ page, limit, search, sort, order, grade, user: req.user });

            if (result.data.length === 0) {
                return createSuccess.noContent(res, 'No student data', result.meta);
            }

            return createSuccess.ok(res, 'OK', result.data, result.meta);
        } catch (err) {
            next(err);
        }
    },

    promoteToNextGrade: async (req, res, next) => {
        try {
            let result = await promoteToNextGrade({ studentIds: req.body.studentIds });

            await cache.delByPattern('students:*');

            return createSuccess.ok(res, 'OK', result);
        } catch (err) {
            next(err);
        }
    },

    graduate: async (req, res, next) => {
        try {
            let result = await graduate({ studentIds: req.body.studentIds });

            await cache.delByPattern('students:*');

            return createSuccess.ok(res, 'OK', result);
        } catch (err) {
            next(err);
        }
    },
};
