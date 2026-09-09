import mongoose, { Document } from 'mongoose';
import { IOperatingArea, ISavedPlace } from '@gaon-auto/types';
export interface OperatingAreaDoc extends Omit<IOperatingArea, 'id'>, Document {
}
export declare const OperatingAreaModel: mongoose.Model<OperatingAreaDoc, {}, {}, {}, mongoose.Document<unknown, {}, OperatingAreaDoc, {}, {}> & OperatingAreaDoc & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export interface SavedPlaceDoc extends Omit<ISavedPlace, 'id'>, Document {
}
export declare const SavedPlaceModel: mongoose.Model<SavedPlaceDoc, {}, {}, {}, mongoose.Document<unknown, {}, SavedPlaceDoc, {}, {}> & SavedPlaceDoc & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=OperatingArea.d.ts.map