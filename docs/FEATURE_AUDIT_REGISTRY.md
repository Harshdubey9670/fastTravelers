# Gaon Auto - Feature Audit Registry (Forensic Runtime Certification)

This registry records the independent forensic audit and runtime certification status of every feature in the Gaon Auto platform.

### Permitted Certification Statuses:
- `VERIFIED`: Confirmed in real execution against live MongoDB, verified through runtime tests, controller logic, schemas, and UI integration.
- `PARTIAL`: Partially functional; minor non-blocking items remaining.
- `BROKEN`: Defect or failure detected.
- `MISSING`: Not yet implemented in executable code.
- `MOCK_ONLY`: Only operates via local mock/simulation; no real gateway/interface built.
- `EXTERNAL_CONFIGURATION_REQUIRED`: Feature is functionally complete with adapter interface; awaiting third-party credentials (e.g. MSG91/Twilio SMS key, AWS S3 bucket).
- `PHYSICAL_DEVICE_TEST_REQUIRED`: Feature depends on physical device hardware/OS constraints (e.g. Android Doze mode background GPS updates when screen is locked).

---

| Feature ID | Feature Description | Forensic Status | File Paths / Evidence | Audit Notes |
|---|---|---|---|---|
| F-01 | Monorepo Structure & Build Workspaces | VERIFIED | `package.json`, `apps/*`, `services/*`, `packages/*` | Clean workspaces; `npm run build` and `npm run typecheck` pass across all packages with 0 errors. |
| F-02 | Shared Types & Zod Schemas | VERIFIED | `packages/types/src/index.ts`, `packages/validation/src/index.ts` | Complete DTOs, Enums, Zod runtime validators actively enforcing contracts. |
| F-03 | Shared Config & Thresholds | VERIFIED | `packages/config/src/index.ts` | Configurable expiries (120s search, 90s offer, 5m OTP), radii (3km-10km), and timeouts. |
| F-04 | E.164 Phone Normalization | VERIFIED | `packages/utils/src/phone.ts` | Strict validation & canonical `+91XXXXXXXXXX` formatting verified against unformatted inputs. |
| F-05 | MongoDB Connection & Schemas | VERIFIED | `services/api/src/models/*` | 2dsphere indexes, TTL indexes (OTPs, sessions, idempotency), and Optimistic Concurrency (`version`) verified in live DB. |
| F-06 | Phone OTP Auth & Safety Guard | VERIFIED | `services/api/src/services/auth.service.ts` | SHA-256 OTP hashing with phone salting, 5m TTL, 60s cooldown, 3-attempt invalidation, production guard refusing mock provider. |
| F-07 | Refresh Sessions & Multi-Device Revocation | VERIFIED | `services/api/src/models/SecurityModels.ts` | Device tracking, SHA-256 tokens, 30-day MongoDB TTL index verified. |
| F-08 | Push Token Lifecycle | VERIFIED | `services/api/src/models/SecurityModels.ts`, `routes/user.routes.ts` | Register, update, and automatic logout purge verified. |
| F-09 | Passenger Profile & Saved Places | VERIFIED | `services/api/src/controllers/user.controller.ts`, `models/OperatingArea.ts` | "Mama ka ghar", "Home", custom village landmarks saved and queried with 2dsphere index. |
| F-10 | Driver Onboarding & Protected Documents | VERIFIED | `services/api/src/routes/driver.routes.ts`, `services/driver.service.ts` | Private document storage; authenticated streaming endpoint prevents unauthorized URL exposure. |
| F-11 | Admin Driver Verification & Audit | VERIFIED | `services/api/src/routes/admin.routes.ts`, `models/SecurityModels.ts` | Approve, reject, suspend actions create immutable `AdminAuditLog` entries. |
| F-12 | Driver Online/Offline State Machine | VERIFIED | `services/api/src/services/driver.service.ts` | `AVAILABLE`, `BUSY`, `OFFLINE`, `SUSPENDED` transitions verified. |
| F-13 | Driver Real GPS & Location Throttling | VERIFIED | `services/api/src/services/driver.service.ts`, `apps/mobile/src/services/location.ts` | 2dsphere geospatial updates with 5-second interval throttling. |
| F-14 | Local Places & Landmark Database | VERIFIED | `services/api/src/models/LocalPlace.ts` | Mandis, CHC hospitals, temples, railway junctions queried with verified 2dsphere indexes. |
| F-15 | Nearby Driver Geospatial Search | VERIFIED | `services/api/src/services/location.service.ts` | Dynamic radius expansion (3km -> 5km -> 7km) and max contacted limit verified. |
| F-16 | Idempotent Ride Creation | VERIFIED | `services/api/src/routes/ride.routes.ts`, `services/ride.service.ts` | `Idempotency-Key` header with payload hash and 24h TTL prevents duplicate state changes. |
| F-17 | Immutable RideEvent Ledger | VERIFIED | `services/api/src/models/RideEvent.ts` | 7+ audit events recorded per complete lifecycle (`REQUESTED`, `OFFER_CREATED`, `DRIVER_SELECTED`, `DRIVER_ARRIVED`, `OTP_VERIFIED`, `RIDE_STARTED`, `RIDE_COMPLETED`). |
| F-18 | Realtime Driver Dispatch | VERIFIED | `services/api/src/services/socket.service.ts` | Room broadcasting, invitation expiries, and live event dispatch verified. |
| F-19 | Driver Fare Offer Bidding | VERIFIED | `services/api/src/routes/ride.routes.ts`, `services/ride.service.ts` | Driver bids fare + ETA; offers auto-withdrawn when driver is selected elsewhere. |
| F-20 | Atomic Driver Selection & Concurrency Lock | VERIFIED | `services/api/src/services/ride.service.ts` | Atomic MongoDB findOneAndUpdate query; concurrent selections by 2 passengers result in exactly 1 winner (200) and 1 conflict (409). |
| F-21 | Active Ride Recovery & REST Reconcile | VERIFIED | `services/api/src/routes/ride.routes.ts`, `apps/mobile/src/store/useRideStore.ts` | Cold boot, server restart, and reconnect authoritative state recovery from `GET /api/v1/rides/active` verified. |
| F-22 | Driver En-Route & Arrival | VERIFIED | `services/api/src/routes/ride.routes.ts`, `services/ride.service.ts` | Status transition to `DRIVER_ARRIVED` and notification verified. |
| F-23 | Secure Trip OTP Verification | VERIFIED | `services/api/src/services/ride.service.ts` | 4-digit code generated for passenger; driver verification rejects invalid OTP and starts ride only on valid OTP. |
| F-24 | Ride Start & Completion | VERIFIED | `services/api/src/services/ride.service.ts` | Authoritative timestamps, duration, and final fare recorded in DB. |
| F-25 | Multi-State Cash / UPI Payment | VERIFIED | `services/api/src/routes/ride.routes.ts`, `models/PaymentRecord.ts` | Truthful multi-state workflow (`PENDING` -> `PASSENGER_CLAIMS_PAID` -> `DRIVER_CONFIRMED_RECEIVED`) verified without false gateway claims. |
| F-26 | Ratings & Favourite Drivers | VERIFIED | `services/api/src/routes/ride.routes.ts`, `models/Rating.ts` | 1-5 stars, feedback chips, and duplicate rating prevention verified. |
| F-27 | Passenger & Driver Ride History | VERIFIED | `services/api/src/routes/ride.routes.ts` | History queries filtered by role and status group (`all`, `completed`, `cancelled`) verified. |
| F-28 | In-Ride Chat & Native Dialing | VERIFIED | `apps/mobile/src/components/QuickChatModal.tsx`, `ActiveRideScreen.tsx` | Canned vernacular Hindi replies and `Linking.openURL('tel:${phone}')` verified. |
| F-29 | SOS Emergency & Helplines | VERIFIED | `apps/mobile/src/components/SOSModal.tsx` | 1-tap direct dialer for National Emergency 112, Police 100, and Ambulance 108 verified. |
| F-30 | Admin Dashboard & Route Analytics | VERIFIED | `apps/admin/src/App.tsx` | React + Vite dashboard compiled and verified (driver reviews, fleet monitor, analytics). |
| F-31 | Bilingual Mobile App (Hindi + English) | VERIFIED | `apps/mobile/src/**/*` | High-contrast palette, large touch targets, complete passenger and driver flows verified with zero TypeScript errors. |
| F-32 | Automated Test Suites | VERIFIED | `services/api/src/__tests__/*` | 33/33 automated tests passing across 3 test suites (`runtime.certification.test.ts`, `ride.flow.test.ts`, `edge.cases.test.ts`). |
| F-33 | SMS Production Provider Gateway | EXTERNAL_CONFIGURATION_REQUIRED | `services/api/src/services/sms.service.ts` | Functional Fast2SMS and Twilio adapters built; awaiting live production gateway API keys. |
| F-34 | Cloud S3 Private Storage | EXTERNAL_CONFIGURATION_REQUIRED | `services/api/src/services/storage.service.ts` | S3 adapter implemented with private ACL; awaiting production AWS S3 credentials. |
| F-35 | Background Driver Location When Screen Locked | PHYSICAL_DEVICE_TEST_REQUIRED | `apps/mobile/src/services/location.ts`, `docs/PHYSICAL_DEVICE_CHECKLIST.md` | Foreground GPS tracking verified; locked background tracking requires standalone APK with unrestricted battery on physical Android device. |
| F-36 | Real APNs/FCM Push Notification Delivery | EXTERNAL_CONFIGURATION_REQUIRED | `services/api/src/models/SecurityModels.ts` | Push token lifecycle verified in database; push dispatch to physical phones requires Expo/FCM project credentials. |
