const path = require('path');

const { getProfile, updateProfile, updateAvatar, deleteAvatar } = require('../../services/v1/profile.service');
const createSuccess = require('../../utils/http-success');

module.exports = {
    getProfile: async (req, res, next) => {
        try {
            let result = await getProfile({ user: req.user });

            return createSuccess.ok(res, 'OK', result);
        } catch (err) {
            next(err);
        }
    },

    updateProfile: async (req, res, next) => {
        try {
            let { name, username, phoneNumber, password } = req.body;

            let result = await updateProfile({
                name,
                username,
                phoneNumber,
                password,
                user: req.user,
            });

            req.user.name = result.name;
            req.user.username = result.username;

            return createSuccess.ok(res, 'Profile updated', result);
        } catch (err) {
            next(err);
        }
    },

    updateAvatar: async (req, res, next) => {
        try {
            let result = await updateAvatar({
                strFile: req.file.buffer.toString('base64'),
                user: req.user,
            });

            return createSuccess.ok(res, 'Avatar updated', result);
        } catch (err) {
            next(err);
        }
    },

    deleteAvatar: async (req, res, next) => {
        try {
            let result = await deleteAvatar({ user: req.user });

            return createSuccess.ok(res, 'Avatar deleted', result);
        } catch (err) {
            next(err);
        }
    },
};
