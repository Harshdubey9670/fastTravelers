/**
 * Normalizes Indian phone numbers to canonical E.164 format: +91XXXXXXXXXX
 * Ensures that 09876543210, 9876543210, +91 98765-43210, 919876543210
 * all resolve to the exact same canonical string: +919876543210.
 */
export declare function normalizeIndianPhoneNumber(input: string): {
    isValid: boolean;
    canonical: string;
    national10Digit: string;
    error?: string;
};
export declare function isValidIndianMobile(input: string): boolean;
export declare function maskPhoneNumber(phone: string): string;
//# sourceMappingURL=phone.d.ts.map