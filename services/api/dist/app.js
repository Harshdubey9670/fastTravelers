"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const errorHandler_middleware_js_1 = require("./middlewares/errorHandler.middleware.js");
const auth_routes_js_1 = __importDefault(require("./routes/auth.routes.js"));
const user_routes_js_1 = __importDefault(require("./routes/user.routes.js"));
const driver_routes_js_1 = __importDefault(require("./routes/driver.routes.js"));
const ride_routes_js_1 = __importDefault(require("./routes/ride.routes.js"));
const location_routes_js_1 = __importDefault(require("./routes/location.routes.js"));
const admin_routes_js_1 = require("./routes/admin.routes.js");
exports.app = (0, express_1.default)();
// Security and CORS
exports.app.use((0, helmet_1.default)());
exports.app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'Accept'],
}));
exports.app.use(express_1.default.json({ limit: '10mb' }));
exports.app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
exports.app.use(errorHandler_middleware_js_1.apiRateLimiter);
// Health Check
exports.app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'gaon-auto-api',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
    });
});
// Mount Versioned API Routes
exports.app.use('/api/v1/auth', auth_routes_js_1.default);
exports.app.use('/api/v1/users', user_routes_js_1.default);
exports.app.use('/api/v1/drivers', driver_routes_js_1.default);
exports.app.use('/api/v1/rides', ride_routes_js_1.default);
exports.app.use('/api/v1/locations', location_routes_js_1.default);
exports.app.use('/api/v1/reports', admin_routes_js_1.reportRouter);
exports.app.use('/api/v1/admin', admin_routes_js_1.adminRouter);
// 404 Handler
exports.app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'ROUTE_NOT_FOUND',
            message: `The endpoint ${req.method} ${req.originalUrl} does not exist.`,
        },
    });
});
// Centralized Error Handler
exports.app.use(errorHandler_middleware_js_1.errorHandler);
//# sourceMappingURL=app.js.map