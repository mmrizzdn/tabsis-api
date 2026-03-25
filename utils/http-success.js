const { StatusCodes, getReasonPhrase } = require('http-status-codes');

const sendResponse = (res, code, status, message, data, meta) => {
  return res.status(code).json({
    status,
    code,
    message,
    data,
    meta,
  });
};

const success = {
  ok: (res, message = getReasonPhrase(StatusCodes.OK), data, meta) =>
    sendResponse(res, StatusCodes.OK, true, message, data, meta),

  created: (res, message = getReasonPhrase(StatusCodes.CREATED), data) =>
    sendResponse(res, StatusCodes.CREATED, true, message, data),

  noContent: (res, message = getReasonPhrase(StatusCodes.NO_CONTENT), meta) =>
    sendResponse(res, StatusCodes.OK, true, message, null, meta),
};

module.exports = success;
