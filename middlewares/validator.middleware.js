const createError = require('http-errors');
module.exports = {
  validate: (schema, property) => {
    return (req, res, next) => {
      let result = schema(req).safeParse(req[property]);

      if (!result.success) {
        let errDetails = result.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message.replace(/['"]/g, ''),
        }));

        if (schema.name === 'loginSchema') {
          return next(
            createError(400, {
              message: 'Invalid username or password',
              details: errDetails,
            }),
          );
        }

        return next(createError(400, { message: 'Validation error', details: errDetails }));
      }

      req[property] = result.data;
      next();
    };
  },

  validateFile: (schema) => {
    return (req, res, next) => {
      if (!req.file) {
        return next(
          createError(400, {
            message: 'File is required',
            details: [{ field: 'file', message: 'File is required' }],
          }),
        );
      }

      let result = schema(req).safeParse({ file: req.file });

      if (!result.success) {
        let errDetails = result.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message.replace(/['"]/g, ''),
        }));

        return next(createError(400, { message: 'Validation error', details: errDetails }));
      }

      next();
    };
  },
};
