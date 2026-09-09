"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.idempotencyMiddleware = idempotencyMiddleware;
const SecurityModels_js_1 = require("../models/SecurityModels.js");
const utils_1 = require("@gaon-auto/utils");
const config_1 = require("@gaon-auto/config");
/**
 * Express middleware to guarantee request idempotency using the Idempotency-Key header.
 */
function idempotencyMiddleware() {
    return async (req, res, next) => {
        const key = req.headers['idempotency-key'];
        if (!key || req.method === 'GET' || req.method === 'HEAD') {
            return next();
        }
        const payloadHash = (0, utils_1.hashPayload)(req.body);
        const endpoint = req.originalUrl;
        const userId = req.user?.id;
        try {
            const existing = await SecurityModels_js_1.IdempotencyRecordModel.findOne({ key });
            if (existing) {
                // If payload matches, return cached response
                if (existing.payloadHash === payloadHash) {
                    res.setHeader('X-Cache', 'HIT-IDEMPOTENT');
                    return res.status(existing.responseStatus).json(existing.responseBody);
                }
                else {
                    return res.status(409).json({
                        success: false,
                        error: {
                            code: 'IDEMPOTENCY_KEY_REUSE',
                            message: 'Idempotency key was previously used with different request parameters',
                        },
                    });
                }
            }
            // Intercept res.json to capture response and persist in idempotency cache
            const originalJson = res.json.bind(res);
            res.json = function (body) {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    const expiresAt = new Date(Date.now() + config_1.SYSTEM_CONFIG.IDEMPOTENCY_TTL_SECONDS * 1000);
                    SecurityModels_js_1.IdempotencyRecordModel.create({
                        key,
                        endpoint,
                        userId: userId,
                        payloadHash,
                        responseStatus: res.statusCode,
                        responseBody: body,
                        expiresAt,
                    }).catch((err) => {
                        console.error('[Idempotency] Failed to cache response:', err);
                    });
                }
                return originalJson(body);
            };
            next();
        }
        catch (err) {
            console.error('[Idempotency] Middleware error:', err);
            next();
        }
    };
}
//# sourceMappingURL=idempotency.middleware.js.map