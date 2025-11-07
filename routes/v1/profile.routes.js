var express = require('express');
var router = express.Router();

const { getProfile, updateProfile, updateAvatar, deleteAvatar } = require('../../controllers/v1/profile.controller');
const { auth } = require('../../middlewares/auth.middleware');
const { permit } = require('../../middlewares/permission.middleware');
const { image } = require('../../libs/multer');
const { validate } = require('../../middlewares/validator.middleware');
const { validateFile } = require('../../middlewares/validator.middleware');
const { updateProfileSchema, updateAvatarSchema } = require('../../validators/v1/profile.validator');

router.get('/', auth, permit('profile', 'read'), getProfile);
router.patch('/', auth, permit('profile', 'update'), validate(updateProfileSchema, 'body'), updateProfile);
router.post(
    '/avatar',
    auth,
    permit('profile', 'update'),
    image.single('avatar'),
    validateFile(updateAvatarSchema),
    updateAvatar
);
router.delete('/avatar', auth, permit('profile', 'update'), deleteAvatar);

module.exports = router;
