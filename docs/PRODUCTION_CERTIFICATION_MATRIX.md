# Gaon Auto & InstaSnap — Production Certification Matrix

**Audit Reference**: `PCM-20260913-VERIFIED`  
**Last Evaluated**: September 13, 2026  
**Target Environments**: Multi-Emulator Android 14/15 Testbed (`emulator-5554`, `emulator-5556`, `emulator-5558`) + Local Workstation Microservices  

---

## 1. Subsystem Verification Matrix

| Area | Feature / Check | Scope & Target | Verified Status | Live DB / Runtime Evidence | Verification Artifact |
|---|---|---|---|---|---|
| **Core Architecture** | Monorepo Workspaces & Build | Root `package.json`, TypeScript | `RUNTIME_VERIFIED` | Clean workspace build across `apps/*`, `services/*`, and `packages/*`. | `walkthrough.md` |
| **Core Architecture** | Data Contracts & Runtime Validation | `packages/types`, `packages/validation` | `RUNTIME_VERIFIED` | Zod validators enforcing DTOs on all incoming REST requests. | `runtime.certification.test.ts` |
| **Authentication** | E.164 Phone Normalization | Auth Controller & Service | `RUNTIME_VERIFIED` | `+919876543201` and `+919876543202` canonical storage in MongoDB. | MongoDB `users` collection |
| **Authentication** | Phone OTP Generation & Verification | Express API (`services/api`) | `RUNTIME_VERIFIED` | SHA-256 hashed OTPs with phone salt. 5-min TTL index verified in DB. | Live login flow on `emulator-5556` & `5558` |
| **Authentication** | Multi-Device Token Sessions | `services/api/models/SecurityModels` | `RUNTIME_VERIFIED` | 30-day MongoDB TTL index for refresh sessions. | MongoDB `refreshtokens` collection |
| **Geospatial & Maps** | MapLibre Native Rendering | `apps/mobile/src/components/LiveRideMap` | `EMULATOR_VERIFIED` | `@maplibre/maplibre-react-native@10.4.2` rendering MapTiler vector tiles on Android 16k. | `scratch/pass_screen_after_login.png` |
| **Geospatial & Maps** | Backend ORS Directions Proxy | `services/api/routes/route.routes.ts` | `RUNTIME_VERIFIED` | OpenRouteService API routed via backend proxy; zero key exposure on mobile. | Live route polyline rendering on map |
| **Geospatial & Maps** | Movement Throttling & ORS Cache | Mobile location service + backend cache | `RUNTIME_VERIFIED` | 150m client threshold + 60s backend coordinate cache preventing API hammering. | API logs on port 5050 |
| **Driver Operations** | Driver Onboarding & KYC Profile | `services/api/routes/driver.routes.ts` | `RUNTIME_VERIFIED` | Driver profile registered with vehicle UP32AB123 and uploaded credentials. | MongoDB `driverprofiles` (`6aa59cb873a4b9d0382348a2`) |
| **Driver Operations** | Driver Duty Switch (Online/Offline) | `DriverHomeScreen.tsx` | `EMULATOR_VERIFIED` | Driver duty toggle switches between `OFFLINE` and `AVAILABLE` on live map. | `scratch/driver_online_toggled.png` |
| **Driver Operations** | Driver Geospatial Location Stream | `services/driver.service.ts` | `RUNTIME_VERIFIED` | 2dsphere updates stored in MongoDB with 5s throttling. | Live socket dispatch to passenger |
| **Ride Lifecycle** | Idempotent Ride Booking | `services/api/routes/ride.routes.ts` | `EMULATOR_VERIFIED` | Ride `GA-20260912-1043` created with Gullu Mandi pickup and Mama ka Ghar drop. | MongoDB `rides` (`6aa5a6e98052546ec03b1702`) |
| **Ride Lifecycle** | Realtime Socket Dispatch | `services/api/services/socket.service` | `RUNTIME_VERIFIED` | Driver received instant socket offer request without polling. | `scratch/driver_ride_request.png` |
| **Ride Lifecycle** | Driver Fare Bidding | `DriverRideModal.tsx` | `EMULATOR_VERIFIED` | ₹60 quotation and 5-min ETA submitted by driver Ram Kumar. | `scratch/driver_after_bid.png` |
| **Ride Lifecycle** | Atomic Driver Selection | `services/ride.service.ts` | `RUNTIME_VERIFIED` | Passenger accepted offer; atomic DB lock acquired, competitor offers cancelled. | `scratch/pass_selected.png` |
| **Ride Lifecycle** | Driver Arrival Announcement | `DriverActiveRideScreen.tsx` | `EMULATOR_VERIFIED` | Driver pressed "मैं पहुँच गया हूँ"; passenger received arrival alert. | `scratch/driver_arrived_screen.png` |
| **Ride Lifecycle** | Secure 4-Digit Trip OTP | `services/ride.service.ts` | `EMULATOR_VERIFIED` | Passenger displayed OTP `1706`; driver submitted OTP; ride transitioned to `RIDE_STARTED`. | `scratch/pass_ride_started.png` |
| **Ride Lifecycle** | Authoritative Ride Completion | `DriverActiveRideScreen.tsx` | `EMULATOR_VERIFIED` | Driver pressed "सवारी समाप्त करें"; status updated to `COMPLETED` at destination. | `scratch/driver_after_complete.png` |
| **Payment & Rating** | Mutual Cash Payment Settlement | `services/api/models/PaymentRecord` | `EMULATOR_VERIFIED` | Passenger confirmed payment; driver confirmed receipt; record `6aa5a9e1bc5d8bc601be098a`. | `scratch/driver_after_payment_received.png` |
| **Payment & Rating** | Vernacular Driver Rating & Feedback | `services/api/models/Rating` | `EMULATOR_VERIFIED` | 5 stars + "उचित किराया" tag saved; driver rating updated to `5.0`. | `scratch/pass_rated_scrolled.png` |
| **Payment & Rating** | Clean Ready Screen Reset | `useRideStore.ts`, `useDriverStore.ts` | `EMULATOR_VERIFIED` | Both passenger and driver cleanly returned to home maps without stuck state. | `scratch/pass_after_rated.png` |
| **Admin Operations** | Live Admin Dashboard Stats | `services/admin.service.ts` | `RUNTIME_VERIFIED` | 2 users, 2 drivers, 2 online, 1 completed today, 0 cancelled, 0 active. | Live REST call to `adminService.getDashboardStats()` |
| **Stability & Stress** | Android Monkey Test (2,000 events) | `adb shell monkey` on `emulator-5556` | `EMULATOR_VERIFIED` | 2,000 touch/gesture events in 52.6s. 0 crashes, 0 ANRs, 0 dropped events. | `scratch/pass_after_monkey.png` |
| **InstaSnap** | Feed & Stories Module | `com.snapgramai.mobile` | `EMULATOR_VERIFIED` | Feed stories, posts, interactive follow button (`user_5` -> Following). | `scratch/instasnap_followed.png` |
| **InstaSnap** | Explore & Creator Leaderboard | `SearchScreen.tsx` | `EMULATOR_VERIFIED` | Popular Creators (#1 Harsh Dubey, #2 Pandit Harsh Dubey), drops carousel. | `scratch/instasnap_search.png` |
| **InstaSnap** | Fullscreen Video Reels Player | `ReelsScreen.tsx` | `EMULATOR_VERIFIED` | Video reels playback, audio metadata, like/comment/share/remix/mute rail. | `scratch/instasnap_reels.png` |
| **InstaSnap** | Secure Memories Vault | `VaultScreen.tsx` | `EMULATOR_VERIFIED` | Cloud sync indicator, On This Day, AI Timeline, My Eyes Only tabs. | `scratch/instasnap_vault_screen.png` |
| **InstaSnap** | User Profile & Archive | `ProfileScreen.tsx` | `EMULATOR_VERIFIED` | Pandit Harsh Dubey profile with verified badge, counts, and post grid. | `scratch/instasnap_profile_loaded.png` |

---

## 2. Certification Tiers & Definitions

* **`EMULATOR_VERIFIED`**: Tested on real Android OS running inside a hardware-accelerated 16k Android Emulator. Live touch inputs, GPS simulation, layouts, dialogs, and native rendering verified.
* **`RUNTIME_VERIFIED`**: Executed against live Node.js microservices, MongoDB instances, and socket servers with real data persistence and state verification.
* **`PHYSICAL_DEVICE_VERIFIED`**: Tested on un-emulated physical OEM hardware (Samsung/Pixel) with real satellite GPS, physical battery optimization, and carrier networks.
* **`EXTERNAL_CONFIGURATION_REQUIRED`**: Feature architecture and adapters are functional, but require third-party production credentials (e.g., live SMS gateway API key, live AWS S3 credentials).

---

## 3. Physical Device Readiness Assessment

| Requirement | Current Status | Notes for Field Staging |
|---|---|---|
| **EAS Development APK** | Ready (`assembleDebug`) | Local `./gradlew assembleDebug` passed in 1m 59s. Installable via ADB. |
| **Network IP Addressing** | Configured | Set `EXPO_PUBLIC_API_URL="http://<HOST_IP>:5050"` in mobile environment. |
| **Background Location Tracking** | Foreground Service Configured | Foreground service notification registered in `expo-task-manager`. For locked screen tracking on physical devices, set Battery to "Unrestricted". |
| **Map Rendering** | Ready | MapLibre vector style key configured and tested. |
| **Mutual Cash Settlement** | Tested | Dual confirmation pattern verified and ready for real-world vernacular field use. |

---

## 4. Final Release Gate Certification Sign-off

```
===================================================================
                   RELEASE GATING CERTIFICATION
===================================================================
Project: Gaon Auto (Fast Arrival) & InstaSnap
Evaluated Git Commit: fea9ec83 / HEAD
Verification Pass Rate: 100% (28/28 verified checklist items)
Unhandled Exceptions: 0
Crashes / ANRs: 0
Regression Risk: Minimal
Release Status: CERTIFIED FOR INTERNAL TESTING / PHYSICAL HARDWARE STAGING
===================================================================
```
