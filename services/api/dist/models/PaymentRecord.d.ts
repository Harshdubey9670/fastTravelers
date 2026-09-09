import mongoose, { Document } from 'mongoose';
import { IReport, PaymentMethod, PaymentStatus } from '@gaon-auto/types';
export interface PaymentRecordDoc extends Document {
    rideId: mongoose.Types.ObjectId;
    passengerId: mongoose.Types.ObjectId;
    driverId: mongoose.Types.ObjectId;
    amount: number;
    method: PaymentMethod;
    status: PaymentStatus;
    passengerClaimedAt?: Date;
    driverConfirmedAt?: Date;
    gatewayVerifiedAt?: Date;
    transactionReference?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const PaymentRecordModel: mongoose.Model<PaymentRecordDoc, {}, {}, {}, mongoose.Document<unknown, {}, PaymentRecordDoc, {}, {}> & PaymentRecordDoc & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export interface ReportDoc extends Omit<IReport, 'id'>, Document {
}
export declare const ReportModel: mongoose.Model<ReportDoc, {}, {}, {}, mongoose.Document<unknown, {}, ReportDoc, {}, {}> & ReportDoc & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=PaymentRecord.d.ts.map