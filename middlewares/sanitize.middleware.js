const sanitizeHtml = require('sanitize-html');
const striptags = require('striptags');
const emojiRegex = require('emoji-regex');

function stripmoji(text) {
    if (typeof text !== 'string') return text;
    const regex = emojiRegex();
    return text.replace(regex, '');
}

function sanitizeString(value) {
    if (typeof value !== 'string') return value;

    let sanitized = sanitizeHtml(value, {
        allowedTags: [],
        allowedAttributes: {},
    });

    sanitized = striptags(sanitized);
    sanitized = stripmoji(sanitized);

    return sanitized.trim();
}

function sanitizeObject(obj) {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'string') {
        return sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
        return obj.map((item) => sanitizeObject(item));
    }

    if (typeof obj === 'object') {
        const sanitized = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                sanitized[key] = sanitizeObject(obj[key]);
            }
        }
        return sanitized;
    }

    return obj;
}

const sanitize = (req, res, next) => {
    if (req.body) {
        req.body = sanitizeObject(req.body);
    }

    if (req.query) {
        req.query = sanitizeObject(req.query);
    }

    if (req.params) {
        req.params = sanitizeObject(req.params);
    }

    next();
};

module.exports = { sanitize, sanitizeString, sanitizeObject };
