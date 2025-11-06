const createError = require('http-errors');

module.exports = {
    permit: (resource, action) => (req, res, next) => {
        if (!req.user) return next(createError(401, 'Not authenticated'));

        if (req.user.role === 'Superadmin') {
            return next();
        }

        let perms =
            req.user.permissions instanceof Set
                ? req.user.permissions
                : new Set(req.user.permissions || []);

        if (perms.has(`${resource}:${action}`)) return next();

        return next(createError(403, 'Forbidden'));
    },
};
