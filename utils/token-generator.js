const jwt = require('jsonwebtoken');
const config = require('../config');

const generateAccessToken = (id, username, role) => {
  return jwt.sign({ id: id, username: username, role: role }, config.jwtSecret, {
    expiresIn: '15m',
  });
};

module.exports = generateAccessToken;
