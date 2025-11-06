const ImageKit = require('imagekit');
const config = require('../config');

const imagekit = new ImageKit(config.imagekit);

module.exports = {
    uploadFile: (options) => {
        return new Promise((resolve, reject) => {
            imagekit.upload(options, (err, result) => {
                if (err) {
                    console.error('ImageKit upload error:', err);
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    },

    deleteFile: (fileId) => {
        return new Promise((resolve, reject) => {
            imagekit.deleteFile(fileId, (err, result) => {
                if (err) {
                    console.error('ImageKit delete error:', err);
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    },
};
