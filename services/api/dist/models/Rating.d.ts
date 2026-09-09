import mongoose, { Document } from 'mongoose';
import { IRating } from '@gaon-auto/types';
export interface RatingDoc extends Omit<IRating, 'id'>, Document {
}
export declare const RatingModel: mongoose.Model<RatingDoc, {}, {}, {}, mongoose.Document<unknown, {}, RatingDoc, {}, {}> & RatingDoc & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Rating.d.ts.map