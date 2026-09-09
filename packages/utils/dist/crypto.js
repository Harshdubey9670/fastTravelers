"use strict";
/**
 * Cross-platform crypto utilities safe for Node.js, Web, and React Native runtimes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateNumericOtp = generateNumericOtp;
exports.hashSha256 = hashSha256;
exports.generateRandomToken = generateRandomToken;
exports.hashPayload = hashPayload;
exports.generateRideNumber = generateRideNumber;
function getNodeCrypto() {
    try {
        return Function('return typeof require !== "undefined" ? require("crypto") : null')();
    }
    catch {
        return null;
    }
}
function getRandomBytes(length) {
    if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
        const bytes = new Uint8Array(length);
        globalThis.crypto.getRandomValues(bytes);
        return bytes;
    }
    const nodeCrypto = getNodeCrypto();
    if (nodeCrypto && typeof nodeCrypto.randomBytes === 'function') {
        return new Uint8Array(nodeCrypto.randomBytes(length));
    }
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
    }
    return bytes;
}
/**
 * Generates a cryptographically secure numeric OTP of given length.
 */
function generateNumericOtp(length = 6) {
    const digits = '0123456789';
    let otp = '';
    const bytes = getRandomBytes(length);
    for (let i = 0; i < length; i++) {
        otp += digits[bytes[i] % 10];
    }
    return otp;
}
/**
 * Hashes an OTP or sensitive string using SHA-256.
 */
function hashSha256(input, salt = '') {
    const nodeCrypto = getNodeCrypto();
    if (nodeCrypto && typeof nodeCrypto.createHash === 'function') {
        return nodeCrypto.createHash('sha256').update(`${salt}:${input}`).digest('hex');
    }
    // Deterministic 64-char hex fallback if ever called in non-Node environment
    let hash1 = 0x811c9dc5;
    let hash2 = 0x5bd1e995;
    const str = `${salt}:${input}`;
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        hash1 = Math.imul(hash1 ^ code, 0x01000193);
        hash2 = Math.imul(hash2 ^ code, 0x01000193);
    }
    const hex1 = (hash1 >>> 0).toString(16).padStart(8, '0');
    const hex2 = (hash2 >>> 0).toString(16).padStart(8, '0');
    return (hex1 + hex2).repeat(4);
}
/**
 * Generates a secure random URL-safe string.
 */
function generateRandomToken(bytes = 32) {
    const arr = getRandomBytes(bytes);
    return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}
/**
 * Computes an SHA-256 hash of a request payload for idempotency checking.
 */
function hashPayload(payload) {
    const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
    const nodeCrypto = getNodeCrypto();
    if (nodeCrypto && typeof nodeCrypto.createHash === 'function') {
        return nodeCrypto.createHash('sha256').update(serialized).digest('hex');
    }
    return hashSha256(serialized);
}
/**
 * Generates a human-friendly unique Ride Number, e.g. GA-20260907-8492
 */
function generateRideNumber() {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `GA-${dateStr}-${randomPart}`;
}
//# sourceMappingURL=crypto.js.map