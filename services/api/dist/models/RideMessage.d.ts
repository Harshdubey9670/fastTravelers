import mongoose, { Document } from 'mongoose';
import { IRideMessage } from '@gaon-auto/types';
export interface RideMessageDoc extends Omit<IRideMessage, 'id'>, Document {
}
export declare const RideMessageModel: mongoose.Model<RideMessageDoc, {}, {}, {}, mongoose.Document<unknown, {}, RideMessageDoc, {}, {}> & RideMessageDoc & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=RideMessage.d.ts.map