"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const location_service_js_1 = require("../services/location.service.js");
const OperatingArea_js_1 = require("../models/OperatingArea.js");
const router = (0, express_1.Router)();
// 1. Search local places (mandis, temples, villages, hospitals)
router.get('/search', async (req, res, next) => {
    try {
        const q = req.query.q || '';
        const lat = req.query.lat ? parseFloat(req.query.lat) : undefined;
        const lng = req.query.lng ? parseFloat(req.query.lng) : undefined;
        const places = await location_service_js_1.locationService.searchPlaces(q, lat, lng);
        return res.status(200).json({
            success: true,
            data: places,
        });
    }
    catch (err) {
        next(err);
    }
});
// 2. Get popular local landmarks
router.get('/popular', async (req, res, next) => {
    try {
        const district = req.query.district;
        const places = await location_service_js_1.locationService.getPopularPlaces(district);
        return res.status(200).json({
            success: true,
            data: places,
        });
    }
    catch (err) {
        next(err);
    }
});
// 3. Get operating areas
router.get('/areas', async (req, res, next) => {
    try {
        const areas = await OperatingArea_js_1.OperatingAreaModel.find({ isActive: true }).lean();
        return res.status(200).json({
            success: true,
            data: areas.map((a) => ({ ...a, id: a._id.toString() })),
        });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=location.routes.js.map