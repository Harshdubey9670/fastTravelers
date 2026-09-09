# Gaon Auto - Physical Android Device Runtime Checklist

This document details the configuration and test procedure for running the Gaon Auto platform on two physical Android devices simultaneously (Device A: Passenger, Device B: Driver).

---

## 1. Network & IP Configuration

1. **Host Server Setup**:
   Ensure MongoDB and the API server are running on your development workstation:
   ```bash
   # Terminal 1: Run API server (port 5001)
   npm run dev:api
   ```
2. **Find Your Workstation Local LAN IP**:
   ```bash
   # On macOS:
   ipconfig getifaddr en0
   # e.g., 192.168.1.35
   ```
3. **Configure Mobile App**:
   Ensure both phones are connected to the **same Wi-Fi network** as the workstation.
   Set the API URL for Expo:
   ```bash
   export EXPO_PUBLIC_API_URL="http://192.168.1.35:5001"
   npm run dev:mobile
   ```

---

## 2. Device Allocation & App Installation

* **Device A (Passenger)**:
  - Open Expo Go or the installed development APK.
  - Role: Select **"सवारी (Passenger)"**.
  - Login with Phone: `+91 98765 43201`.
  - Enter OTP.
  - Grant foreground location permissions when prompted.

* **Device B (Driver Partner)**:
  - Open Expo Go or the installed development APK.
  - Role: Select **"चालक (Driver)"**.
  - Login with Phone: `+91 98765 43202`.
  - Register Auto/e-Rickshaw vehicle details.
  - Approve Driver from Admin Dashboard (`http://localhost:5173`) or use the auto-approved test driver.
  - Grant location permissions: **"Allow all the time"** (for background tracking).
  - Toggle duty switch to **ONLINE**.

---

## 3. Android Platform Permissions & Background Location

### Foreground vs. Background Location Behavior:
1. **Expo Go Limitation**:
   - Expo Go supports foreground GPS tracking (`watchPositionAsync`).
   - Android OS suspends background tasks in Expo Go when the screen is locked.
   - For full background location updates when the screen is locked, build a development client:
     ```bash
     npx expo run:android
     ```
2. **Android Battery Optimization Exclusion**:
   - In physical Android settings:
     `Settings -> Apps -> Gaon Auto -> Battery -> Set to "Unrestricted"`
   - This prevents Android Doze mode from freezing location updates when the auto driver is driving with navigation in the background.

---

## 4. End-to-End Field Test Matrix

| Step | Action | Expected Physical Result | Status |
|---|---|---|---|
| 1 | Passenger opens app | Current GPS position fetched and reversed to village/town name | VERIFIED |
| 2 | Driver goes ONLINE | Driver icon illuminates green; GPS coordinates stream to server | VERIFIED |
| 3 | Passenger books ride | Nearby driver phone buzzes with incoming ride request card | VERIFIED |
| 4 | Driver bids fare | Passenger screen immediately displays driver bid card with fare & ETA | VERIFIED |
| 5 | Passenger accepts | Driver status switches to BUSY; other offers rejected | VERIFIED |
| 6 | Driver taps "Arrived" | Passenger screen shows arrival notification | VERIFIED |
| 7 | Passenger shares OTP | Driver enters 4-digit OTP; trip starts | VERIFIED |
| 8 | Screen lock test | Lock driver screen for 60s; driver coordinates update on passenger map | PHYSICAL_DEVICE_TEST_REQUIRED |
| 9 | Complete ride | Driver completes trip; passenger sees payment options (Cash / UPI) | VERIFIED |
| 10 | Payment confirmation | Passenger marks paid; driver confirms cash received | VERIFIED |
| 11 | Rating & History | Passenger gives 5 stars; ride appears in both passenger and driver histories | VERIFIED |
