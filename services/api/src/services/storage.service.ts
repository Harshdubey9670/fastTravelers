import fs from 'fs';
import path from 'path';
import { ENV } from '../config/env.js';
import { generateRandomToken } from '@gaon-auto/utils';

export interface SavedFileResult {
  fileKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

export class StorageService {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(ENV.UPLOAD_DIR, 'documents');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  /**
   * Saves an uploaded buffer into private sandbox storage.
   */
  async saveDocument(
    buffer: Buffer,
    originalName: string,
    mimeType: string
  ): Promise<SavedFileResult> {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedMimeTypes.includes(mimeType)) {
      throw new Error(`Invalid file type: ${mimeType}. Only JPG, PNG, WEBP, and PDF are allowed.`);
    }

    if (buffer.length > 5 * 1024 * 1024) {
      throw new Error('File size exceeds maximum limit of 5MB.');
    }

    const ext = path.extname(originalName) || '.bin';
    const randomName = `${generateRandomToken(16)}${ext}`;
    const targetPath = path.join(this.baseDir, randomName);

    await fs.promises.writeFile(targetPath, buffer);

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
  getReadStream(fileKey: string): fs.ReadStream {
    // Sanitize fileKey to prevent directory traversal
    const safeKey = path.basename(fileKey);
    const fullPath = path.join(this.baseDir, safeKey);

    if (!fs.existsSync(fullPath)) {
      throw new Error('Requested document not found on storage server.');
    }

    return fs.createReadStream(fullPath);
  }

  /**
   * Deletes a private document.
   */
  async deleteDocument(fileKey: string): Promise<boolean> {
    try {
      const safeKey = path.basename(fileKey);
      const fullPath = path.join(this.baseDir, safeKey);
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}

export const storageService = new StorageService();
