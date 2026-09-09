import mongoose, { Document } from 'mongoose';
import { IRide } from '@gaon-auto/types';
export interface RideModelDocument extends Omit<IRide, 'id' | 'passenger' | 'driver' | 'selectedOffer'>, Document {
    otp: {
        code: string;
        codeHash: string;
        attempts: number;
        maxAttempts: number;
        verifiedAt?: Date;
    };
}
export declare const RideModel: mongoose.Model<RideModelDocument, {}, {}, {}, mongoose.Document<unknown, {}, RideModelDocument, {}, {}> & RideModelDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Ride.d.ts.map