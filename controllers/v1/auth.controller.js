const config = require('../../config/index');
const createSuccess = require('../../utils/http-success');
const { login, refreshToken, logout } = require('../../services/v1/auth.service');

module.exports = {
  login: async (req, res, next) => {
    try {
      let { username, password } = req.body;

      let result = await login({
        username,
        password,
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      });

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/v1',
      });

      delete result.refreshToken;

      return createSuccess.ok(res, 'Logged in', result);
    } catch (err) {
      next(err);
    }
  },

  refreshToken: async (req, res, next) => {
    try {
      let token = req.cookies && req.cookies.refreshToken;
      let result = await refreshToken({ refreshToken: token });
      let data = { accessToken: result.accessToken };

      return createSuccess.ok(res, 'Token refreshed', data);
    } catch (err) {
      next(err);
    }
  },

  logout: async (req, res, next) => {
    try {
      let refreshToken = req.cookies.refreshToken;
      let authorization = req.headers.authorization;
      let userId = req.user.id;
      let userExp = req.user.exp;
      let ip = req.ip;
      let userAgent = req.headers['user-agent'];

      await logout({
        refreshToken,
        authorization,
        userId,
        userExp,
        ip,
        userAgent,
      });

      delete req.user;

      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'strict',
        path: '/api/v1',
      });

      return createSuccess.ok(res, 'Logged out');
    } catch (err) {
      next(err);
    }
  },
};
