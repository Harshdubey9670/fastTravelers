import mongoose, { Document } from 'mongoose';
import { GeoPoint, DriverAvailabilityStatus } from '@gaon-auto/types';
export interface DriverLocationDoc extends Document {
    driverId: mongoose.Types.ObjectId;
    location: GeoPoint;
    heading?: number;
    speed?: number;
    accuracy?: number;
    isOnline: boolean;
    availabilityStatus: DriverAvailabilityStatus;
    updatedAt: Date;
}
export declare const DriverLocationModel: mongoose.Model<DriverLocationDoc, {}, {}, {}, mongoose.Document<unknown, {}, DriverLocationDoc, {}, {}> & DriverLocationDoc & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=DriverLocation.d.ts.map