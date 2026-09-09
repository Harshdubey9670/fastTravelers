"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDatabase = connectDatabase;
exports.disconnectDatabase = disconnectDatabase;
const mongoose_1 = __importDefault(require("mongoose"));
const env_js_1 = require("./env.js");
async function connectDatabase() {
    try {
        mongoose_1.default.set('strictQuery', true);
        const conn = await mongoose_1.default.connect(env_js_1.ENV.MONGODB_URI, {
            autoIndex: true, // Build indexes in dev/test, manage via migrations in high-scale prod
            serverSelectionTimeoutMS: 5000,
        });
        console.log(`[Database] Connected successfully to MongoDB at ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
        mongoose_1.default.connection.on('error', (err) => {
            console.error('[Database] Connection error:', err);
        });
        mongoose_1.default.connection.on('disconnected', () => {
            console.warn('[Database] Disconnected from MongoDB. Attempting to reconnect...');
        });
        return conn;
    }
    catch (error) {
        console.error('[Database] Initial connection failed:', error);
        throw error;
    }
}
async function disconnectDatabase() {
    await mongoose_1.default.disconnect();
    console.log('[Database] Disconnected from MongoDB gracefully.');
}
//# sourceMappingURL=db.js.map