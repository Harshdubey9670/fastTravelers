import mongoose, { Document } from 'mongoose';
import { IVehicle } from '@gaon-auto/types';
export interface VehicleModelDocument extends Omit<IVehicle, 'id'>, Document {
}
export declare const VehicleModel: mongoose.Model<VehicleModelDocument, {}, {}, {}, mongoose.Document<unknown, {}, VehicleModelDocument, {}, {}> & VehicleModelDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Vehicle.d.ts.map