/**
 * Normalizes Indian phone numbers to canonical E.164 format: +91XXXXXXXXXX
 * Ensures that 09876543210, 9876543210, +91 98765-43210, 919876543210
 * all resolve to the exact same canonical string: +919876543210.
 */
export function normalizeIndianPhoneNumber(input: string): {
  isValid: boolean;
  canonical: string;
  national10Digit: string;
  error?: string;
} {
  if (!input || typeof input !== 'string') {
    return { isValid: false, canonical: '', national10Digit: '', error: 'Phone number is required' };
  }

  // Strip all whitespace, hyphens, parenthesis, dots
  let cleaned = input.replace(/[\s\-\(\)\.]/g, '');

  // Strip leading '+'
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  }

  // If starts with 0 (e.g. 09876543210), remove the leading 0
  while (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }

  // If starts with country code 91 and length is 12 (91 + 10 digits), strip 91
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  }

  // Now cleaned must be exactly 10 digits
  if (!/^\d{10}$/.test(cleaned)) {
    return {
      isValid: false,
      canonical: '',
      national10Digit: '',
      error: 'Phone number must be a valid 10-digit Indian mobile number',
    };
  }

  // Indian mobile numbers must start with 6, 7, 8, or 9
  if (!/^[6-9]/.test(cleaned)) {
    return {
      isValid: false,
      canonical: '',
      national10Digit: '',
      error: 'Indian mobile number must start with 6, 7, 8, or 9',
    };
  }

  return {
    isValid: true,
    canonical: `+91${cleaned}`,
    national10Digit: cleaned,
  };
}

export function isValidIndianMobile(input: string): boolean {
  return normalizeIndianPhoneNumber(input).isValid;
}

export function maskPhoneNumber(phone: string): string {
  const norm = normalizeIndianPhoneNumber(phone);
  if (!norm.isValid) return phone;
  const d = norm.national10Digit;
  return `+91 ${d.slice(0, 2)}****${d.slice(6)}`;
}

