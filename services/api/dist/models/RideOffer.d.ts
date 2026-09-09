import mongoose, { Document } from 'mongoose';
import { IRideOffer } from '@gaon-auto/types';
export interface RideOfferModelDoc extends Omit<IRideOffer, 'id' | 'driver'>, Document {
}
export declare const RideOfferModel: mongoose.Model<RideOfferModelDoc, {}, {}, {}, mongoose.Document<unknown, {}, RideOfferModelDoc, {}, {}> & RideOfferModelDoc & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=RideOffer.d.ts.map