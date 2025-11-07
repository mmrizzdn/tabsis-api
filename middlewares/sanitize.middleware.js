const sanitizeHtml = require('sanitize-html');
const striptags = require('striptags');
const emojiRegex = require('emoji-regex');

/**
 * Remove emojis from string
 * @param {string} text - Text to remove emojis from
 * @returns {string} - Text without emojis
 */
function stripmoji(text) {
    if (typeof text !== 'string') return text;
    const regex = emojiRegex();
    return text.replace(regex, '');
}

/**
 * Sanitize a string value using sanitize-html, striptags, and stripmoji
 * @param {string} value - Value to sanitize
 * @returns {string} - Sanitized value
 */
function sanitizeString(value) {
    if (typeof value !== 'string') return value;

    // First, sanitize HTML
    let sanitized = sanitizeHtml(value, {
        allowedTags: [],
        allowedAttributes: {},
    });

    // Then strip any remaining tags
    sanitized = striptags(sanitized);

    // Finally, remove emojis
    sanitized = stripmoji(sanitized);

    return sanitized.trim();
}

/**
 * Recursively sanitize an object
 * @param {any} obj - Object to sanitize
 * @returns {any} - Sanitized object
 */
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

/**
 * Middleware to sanitize request body, query, and params
 */
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
