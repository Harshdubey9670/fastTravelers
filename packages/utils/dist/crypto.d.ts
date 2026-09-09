/**
 * Cross-platform crypto utilities safe for Node.js, Web, and React Native runtimes.
 */
/**
 * Generates a cryptographically secure numeric OTP of given length.
 */
export declare function generateNumericOtp(length?: number): string;
/**
 * Hashes an OTP or sensitive string using SHA-256.
 */
export declare function hashSha256(input: string, salt?: string): string;
/**
 * Generates a secure random URL-safe string.
 */
export declare function generateRandomToken(bytes?: number): string;
/**
 * Computes an SHA-256 hash of a request payload for idempotency checking.
 */
export declare function hashPayload(payload: any): string;
/**
 * Generates a human-friendly unique Ride Number, e.g. GA-20260907-8492
 */
export declare function generateRideNumber(): string;
//# sourceMappingURL=crypto.d.ts.map