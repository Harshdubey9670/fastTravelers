import mongoose, { Document } from 'mongoose';
import { IRideEvent } from '@gaon-auto/types';
export interface RideEventDoc extends Omit<IRideEvent, 'id'>, Document {
}
export declare const RideEventModel: mongoose.Model<RideEventDoc, {}, {}, {}, mongoose.Document<unknown, {}, RideEventDoc, {}, {}> & RideEventDoc & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=RideEvent.d.ts.map