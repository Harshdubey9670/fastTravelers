import { ENV } from '../config/env.js';

export interface ISmsProvider {
  sendOtp(phone: string, otp: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

/**
 * Mock SMS provider for Development and Automated Testing.
 * STRICT SAFETY RULE: Rejected in production via config/env.ts.
 */
class MockSmsProvider implements ISmsProvider {
  async sendOtp(phone: string, otp: string) {
    if (ENV.NODE_ENV === 'production') {
      throw new Error('FATAL: MockSmsProvider invoked in production environment!');
    }
    console.log(`[SMS-DEV-LOG] OTP sent to ${phone}: ${otp}`);
    return { success: true, messageId: `mock_${Date.now()}` };
  }
}

/**
 * Fast2SMS Gateway Provider (Popular for Indian SMS OTP)
 */
class Fast2SmsProvider implements ISmsProvider {
  async sendOtp(phone: string, otp: string) {
    if (!ENV.FAST2SMS_API_KEY) {
      return { success: false, error: 'Fast2SMS API key not configured' };
    }
    try {
      // Fast2SMS expects 10-digit number without +91
      const nationalNumber = phone.replace(/^\+91/, '');
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: ENV.FAST2SMS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          variables_values: otp,
          route: 'otp',
          numbers: nationalNumber,
        }),
      });
      const data = (await response.json()) as any;
      return { success: response.ok, messageId: data.request_id, error: data.message };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

/**
 * Twilio SMS Provider
 */
class TwilioSmsProvider implements ISmsProvider {
  async sendOtp(phone: string, otp: string) {
    if (!ENV.TWILIO_ACCOUNT_SID || !ENV.TWILIO_AUTH_TOKEN || !ENV.TWILIO_PHONE_NUMBER) {
      return { success: false, error: 'Twilio credentials not configured' };
    }
    try {
      const auth = Buffer.from(`${ENV.TWILIO_ACCOUNT_SID}:${ENV.TWILIO_AUTH_TOKEN}`).toString('base64');
      const params = new URLSearchParams({
        To: phone,
        From: ENV.TWILIO_PHONE_NUMBER,
        Body: `Your Gaon Auto login OTP is ${otp}. Valid for 5 minutes. Do not share with anyone.`,
      });
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${ENV.TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        }
      );
      const data = (await response.json()) as any;
      return { success: response.ok, messageId: data.sid, error: data.message };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

function createSmsProvider(): ISmsProvider {
  switch (ENV.SMS_PROVIDER) {
    case 'FAST2SMS':
      return new Fast2SmsProvider();
    case 'TWILIO':
      return new TwilioSmsProvider();
    case 'MOCK':
    default:
      return new MockSmsProvider();
  }
}

export const smsService = createSmsProvider();
