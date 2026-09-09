import mongoose, { Document } from 'mongoose';
import { IDriverDocument } from '@gaon-auto/types';
export interface DriverDocumentModelDoc extends Omit<IDriverDocument, 'id'>, Document {
}
export declare const DriverDocumentModel: mongoose.Model<DriverDocumentModelDoc, {}, {}, {}, mongoose.Document<unknown, {}, DriverDocumentModelDoc, {}, {}> & DriverDocumentModelDoc & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=DriverDocument.d.ts.map