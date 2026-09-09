import mongoose, { Document } from 'mongoose';
import { IDriverProfile } from '@gaon-auto/types';
export interface DriverProfileDocument extends Omit<IDriverProfile, 'id' | 'vehicle' | 'user'>, Document {
}
export declare const DriverProfileModel: mongoose.Model<DriverProfileDocument, {}, {}, {}, mongoose.Document<unknown, {}, DriverProfileDocument, {}, {}> & DriverProfileDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=DriverProfile.d.ts.map