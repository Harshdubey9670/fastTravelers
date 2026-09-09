"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const app_js_1 = require("./app.js");
const env_js_1 = require("./config/env.js");
const db_js_1 = require("./config/db.js");
const socket_service_js_1 = require("./services/socket.service.js");
async function bootstrap() {
    try {
        // 1. Connect to MongoDB
        await (0, db_js_1.connectDatabase)();
        // 2. Create HTTP Server
        const server = http_1.default.createServer(app_js_1.app);
        // 3. Initialize Socket.IO Server
        socket_service_js_1.socketService.init(server);
        // 4. Start Listening
        server.listen(env_js_1.ENV.PORT, () => {
            console.log(`====================================================`);
            console.log(`🚀 Gaon Auto API & Socket.IO Server running on port ${env_js_1.ENV.PORT}`);
            console.log(`📡 Environment: ${env_js_1.ENV.NODE_ENV}`);
            console.log(`📱 SMS Provider: ${env_js_1.ENV.SMS_PROVIDER}`);
            console.log(`🗄️  Storage: ${env_js_1.ENV.STORAGE_TYPE} (${env_js_1.ENV.UPLOAD_DIR})`);
            console.log(`====================================================`);
        });
        // Graceful Shutdown
        const shutdown = async (signal) => {
            console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);
            server.close(async () => {
                console.log('[Server] HTTP server closed.');
                await (0, db_js_1.disconnectDatabase)();
                process.exit(0);
            });
            // Force shutdown if taking too long
            setTimeout(() => {
                console.error('[Server] Graceful shutdown timed out. Forcing exit.');
                process.exit(1);
            }, 10000);
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
    catch (error) {
        console.error('[Server] Fatal startup error:', error);
        process.exit(1);
    }
}
bootstrap();
//# sourceMappingURL=server.js.map