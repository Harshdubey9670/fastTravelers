import mongoose, { Document } from 'mongoose';
import { ILocalPlace } from '@gaon-auto/types';
export interface LocalPlaceDoc extends Omit<ILocalPlace, 'id'>, Document {
}
export declare const LocalPlaceModel: mongoose.Model<LocalPlaceDoc, {}, {}, {}, mongoose.Document<unknown, {}, LocalPlaceDoc, {}, {}> & LocalPlaceDoc & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=LocalPlace.d.ts.map