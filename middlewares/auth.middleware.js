const redis = require('../libs/redis');
const jwt = require('jsonwebtoken');
const createError = require('http-errors');

const prisma = require('../libs/prisma');
const config = require('../config/index');

module.exports = {
  auth: async (req, res, next) => {
    let authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return next(createError(401, 'No token provided'));
    }

    let token = authorization.split(' ')[1];
    let isRevoked = await redis.get(`revoked_token:${token}`);

    if (isRevoked) {
      return next(createError(401, 'Token has been revoked'));
    }

    jwt.verify(token, config.jwtSecret, async (err, decoded) => {
      if (err) return next(createError(401, err.message));

      if (!decoded) {
        return next(createError(401, 'Invalid token'));
      }

      let id = decoded.id;
      let cacheKey = `user:${id}`;
      let cached = await redis.get(cacheKey);

      if (cached) {
        let user = JSON.parse(cached);
        req.user = {
          ...user,
          permissions: new Set(user.permissions),
        };

        return next();
      }

      let user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          username: true,
          role: {
            select: {
              name: true,
              permissions: {
                select: {
                  permission: { select: { resource: true, action: true } },
                },
              },
            },
          },
        },
      });

      if (!user) {
        return next(createError(401, 'User is not registered'));
      }

      let permissionsList = user.role.permissions.map((p) => `${p.permission.resource}:${p.permission.action}`);
      let userData = {
        id: user.id,
        username: user.username,
        role: user.role.name,
        exp: decoded.exp,
        permissions: permissionsList,
      };

      await redis.setex(cacheKey, 7 * 24 * 60 * 60, JSON.stringify(userData));

      req.user = {
        ...userData,
        permissions: new Set(userData.permissions),
      };

      next();
    });
  },
};
