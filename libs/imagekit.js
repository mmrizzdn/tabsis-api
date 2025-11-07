const ImageKit = require('imagekit');
const config = require('../config');
const logger = require('./logger');

const imagekit = new ImageKit(config.imagekit);

module.exports = {
    uploadFile: (options) => {
        return new Promise((resolve, reject) => {
            imagekit.upload(options, (err, result) => {
                if (err) {
                    logger.error('ImageKit upload error', {
                        error: err.message,
                        stack: err.stack,
                        fileName: options.fileName,
                        folder: options.folder,
                    });
                    reject(err);
                } else {
                    logger.debug('ImageKit upload success', { fileId: result.fileId, fileName: result.name });
                    resolve(result);
                }
            });
        });
    },

    deleteFile: (fileId) => {
        return new Promise((resolve, reject) => {
            imagekit.deleteFile(fileId, (err, result) => {
                if (err) {
                    logger.error('ImageKit delete error', {
                        error: err.message,
                        stack: err.stack,
                        fileId: fileId,
                    });
                    reject(err);
                } else {
                    logger.debug('ImageKit delete success', { fileId: fileId });
                    resolve(result);
                }
            });
        });
    },
};
