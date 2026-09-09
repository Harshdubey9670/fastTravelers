export interface ISmsProvider {
    sendOtp(phone: string, otp: string): Promise<{
        success: boolean;
        messageId?: string;
        error?: string;
    }>;
}
export declare const smsService: ISmsProvider;
//# sourceMappingURL=sms.service.d.ts.map