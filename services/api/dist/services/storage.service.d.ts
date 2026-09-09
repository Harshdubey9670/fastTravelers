import fs from 'fs';
export interface SavedFileResult {
    fileKey: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
}
export declare class StorageService {
    private baseDir;
    constructor();
    /**
     * Saves an uploaded buffer into private sandbox storage.
     */
    saveDocument(buffer: Buffer, originalName: string, mimeType: string): Promise<SavedFileResult>;
    /**
     * Reads a private document stream for authorized callers.
     */
    getReadStream(fileKey: string): fs.ReadStream;
    /**
     * Deletes a private document.
     */
    deleteDocument(fileKey: string): Promise<boolean>;
}
export declare const storageService: StorageService;
//# sourceMappingURL=storage.service.d.ts.map