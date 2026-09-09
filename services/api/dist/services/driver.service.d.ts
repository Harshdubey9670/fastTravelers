import mongoose from 'mongoose';
import { DriverOnboardingInput } from '@gaon-auto/validation';
import { DocumentType } from '@gaon-auto/types';
export declare class DriverService {
    /**
     * Onboards a driver with vehicle and initial profile details.
     */
    onboardDriver(userId: string, input: DriverOnboardingInput): Promise<{
        driverProfile: mongoose.FlattenMaps<import("../models/DriverProfile.js").DriverProfileDocument> & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        };
        vehicle: mongoose.FlattenMaps<import("../models/Vehicle.js").VehicleModelDocument> & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        };
    }>;
    /**
     * Uploads and stores a protected driver document.
     */
    uploadDocument(userId: string, documentType: DocumentType, fileBuffer: Buffer, originalName: string, mimeType: string): Promise<mongoose.FlattenMaps<import("../models/DriverDocument.js").DriverDocumentModelDoc> & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    /**
     * Toggles driver Online/Offline status.
     */
    setAvailability(userId: string, isOnline: boolean): Promise<{
        isOnline: boolean;
        availabilityStatus: "OFFLINE" | "AVAILABLE";
    }>;
    /**
     * Updates driver's live GPS coordinates with throttling and active-ride broadcast.
     */
    updateLocation(userId: string, latitude: number, longitude: number, heading?: number, speed?: number, accuracy?: number): Promise<{
        updated: boolean;
        throttled: boolean;
    }>;
}
export declare const driverService: DriverService;
//# sourceMappingURL=driver.service.d.ts.map