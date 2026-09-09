"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageService = exports.StorageService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const env_js_1 = require("../config/env.js");
const utils_1 = require("@gaon-auto/utils");
class StorageService {
    baseDir;
    constructor() {
        this.baseDir = path_1.default.resolve(env_js_1.ENV.UPLOAD_DIR, 'documents');
        if (!fs_1.default.existsSync(this.baseDir)) {
            fs_1.default.mkdirSync(this.baseDir, { recursive: true });
        }
    }
    /**
     * Saves an uploaded buffer into private sandbox storage.
     */
    async saveDocument(buffer, originalName, mimeType) {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
        if (!allowedMimeTypes.includes(mimeType)) {
            throw new Error(`Invalid file type: ${mimeType}. Only JPG, PNG, WEBP, and PDF are allowed.`);
        }
        if (buffer.length > 5 * 1024 * 1024) {
            throw new Error('File size exceeds maximum limit of 5MB.');
        }
        const ext = path_1.default.extname(originalName) || '.bin';
        const randomName = `${(0, utils_1.generateRandomToken)(16)}${ext}`;
        const targetPath = path_1.default.join(this.baseDir, randomName);
        await fs_1.default.promises.writeFile(targetPath, buffer);
        return {
            fileKey: randomName,
            originalName,
            mimeType,
            sizeBytes: buffer.length,
        };
    }
    /**
     * Reads a private document stream for authorized callers.
     */
    getReadStream(fileKey) {
        // Sanitize fileKey to prevent directory traversal
        const safeKey = path_1.default.basename(fileKey);
        const fullPath = path_1.default.join(this.baseDir, safeKey);
        if (!fs_1.default.existsSync(fullPath)) {
            throw new Error('Requested document not found on storage server.');
        }
        return fs_1.default.createReadStream(fullPath);
    }
    /**
     * Deletes a private document.
     */
    async deleteDocument(fileKey) {
        try {
            const safeKey = path_1.default.basename(fileKey);
            const fullPath = path_1.default.join(this.baseDir, safeKey);
            if (fs_1.default.existsSync(fullPath)) {
                await fs_1.default.promises.unlink(fullPath);
                return true;
            }
            return false;
        }
        catch {
            return false;
        }
    }
}
exports.StorageService = StorageService;
exports.storageService = new StorageService();
//# sourceMappingURL=storage.service.js.map