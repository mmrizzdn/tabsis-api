const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const geoip = require('geoip-lite');
const crypto = require('crypto');
const uap = require('ua-parser-js');
const createError = require('http-errors');
const prisma = require('../../libs/prisma');
const redis = require('../../libs/redis');
const { LoginStatus } = require('@prisma/client');
const generateAccessToken = require('../../utils/token-generator');

module.exports = {
  login: async (payload) => {
    let { username, password, ip, userAgent } = payload;

    let user = await prisma.user.findUnique({
      where: { username },
      include: {
        role: {
          select: { name: true },
        },
      },
    });

    let ua = uap(userAgent);
    let geo = geoip.lookup(ip);

    let data = {
      userId: user?.id ?? null,
      ipAddress: ip,
      userAgent,
      browser: ua.browser.name ?? 'Unknown',
      os: `${ua.os.name ?? ''} ${ua.os.version ?? ''}`.trim(),
      device: ua.device.vendor ? `${ua.device.vendor} ${ua.device.model}`.trim() : 'Desktop',
      country: geo?.country ?? 'Unknown',
      city: geo?.city ?? 'Unknown',
    };

    if (!user) {
      await prisma.loginActivity.create({
        data: {
          ...data,
          status: LoginStatus.FAILED,
          failReason: 'INVALID_USERNAME',
        },
      });

      throw createError(400, 'Invalid username or password');
    }

    if (!(await bcrypt.compare(password, user.password))) {
      await prisma.loginActivity.create({
        data: {
          ...data,
          status: LoginStatus.FAILED,
          failReason: 'INVALID_PASSWORD',
        },
      });

      throw createError(400, 'Invalid username or password');
    }

    let accessToken = generateAccessToken(user.id, user.username, user.role.name);

    let refreshToken = crypto.randomBytes(64).toString('hex');

    await redis.setex(`refresh_token:${refreshToken}`, 7 * 24 * 60 * 60, user.id.toString());

    await prisma.loginActivity.create({
      data: { ...data, status: LoginStatus.SUCCESS },
    });

    delete user.password;

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role.name,
      accessToken,
      refreshToken,
    };
  },

  refreshToken: async (payload) => {
    let refreshToken = payload.refreshToken;

    if (!refreshToken) {
      throw createError(401, 'No refresh token provided');
    }

    let userId = await redis.get(`refresh_token:${refreshToken}`);

    if (!userId) {
      throw createError(401, 'Invalid or expired refresh token');
    }

    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    let accessToken = generateAccessToken(user.id, user.username, user.role.name);

    return { status: true, accessToken };
  },

  logout: async (payload) => {
    let { refreshToken, authorization, userId, userExp, ip, userAgent } = payload;

    if (refreshToken) {
      await redis.del(`refresh_token:${refreshToken}`);
    }

    if (authorization && authorization.startsWith('Bearer ')) {
      let accessToken = authorization.split(' ')[1];
      let expiresIn = userExp - Math.floor(Date.now() / 1000);

      if (expiresIn > 0) {
        await redis.setex(`revoked_token:${accessToken}`, expiresIn, 'true');
      }
    }

    let ua = uap(userAgent);
    let geo = geoip.lookup(ip);

    let activityData = {
      userId: userId ?? null,
      ipAddress: ip,
      userAgent,
      browser: ua.browser.name ?? 'Unknown',
      os: `${ua.os.name ?? ''} ${ua.os.version ?? ''}`.trim(),
      device: ua.device.vendor ? `${ua.device.vendor} ${ua.device.model}`.trim() : 'Desktop',
      country: geo?.country ?? 'Unknown',
      city: geo?.city ?? 'Unknown',
    };

    await prisma.loginActivity.create({
      data: {
        ...activityData,
        status: LoginStatus.LOGGED_OUT,
      },
    });

    return true;
  },
};
