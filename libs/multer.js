const multer = require('multer');
const createError = require('http-errors');

const generateFileFilter = (mimetypes) => (req, file, cb) => {
  if (mimetypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(createError(400, `Only ${mimetypes.join(', ')} files are allowed`), false);
  }
};

module.exports = {
  image: multer({
    fileFilter: generateFileFilter(['image/jpeg', 'image/png', 'image/jpg', 'image/webp']),

    onError: (err, next) => {
      next(err);
    },
  }),
};
