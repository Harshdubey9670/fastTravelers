import mongoose, { Document } from 'mongoose';
import { IUser } from '@gaon-auto/types';
export interface UserDocument extends Omit<IUser, 'id'>, Document {
}
export declare const UserModel: mongoose.Model<UserDocument, {}, {}, {}, mongoose.Document<unknown, {}, UserDocument, {}, {}> & UserDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=User.d.ts.map