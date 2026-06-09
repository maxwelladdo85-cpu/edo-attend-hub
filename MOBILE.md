# Mobile Deployment Guide — iOS & Android

This app ships to the App Store and Google Play as a [Capacitor](https://capacitorjs.com/)
wrapper around the same React build that powers the web app at
[edosas.com](https://edosas.com). All business logic, auth, and APIs run unchanged.

> Native binaries cannot be built inside Lovable. Follow these steps **on your
> local machine** after exporting the project to GitHub and cloning it.

---

## 1. Prerequisites

| Platform | Required tools |
| --- | --- |
| Both | Node.js ≥ 20, Bun ≥ 1.1, Git |
| iOS  | macOS, Xcode ≥ 15, CocoaPods (`sudo gem install cocoapods`), an Apple Developer account ($99/yr) |
| Android | Android Studio ≥ Hedgehog, JDK 17, a Google Play Console account ($25 one-time) |

---

## 2. One-time setup

```bash
# Clone your exported project
git clone https://github.com/<your-org>/edosubeb-attendance.git
cd edosubeb-attendance
bun install

# Install Capacitor + native platform packages
bun add @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android \
        @capacitor/geolocation @capacitor/app @capacitor/status-bar \
        @capacitor/splash-screen

# Initialise the native projects (uses capacitor.config.ts in repo root)
bun run build
npx cap add ios
npx cap add android
npx cap sync
```

---

## 3. Required permission strings

### iOS — `ios/App/App/Info.plist`

Add inside the top-level `<dict>`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>EdoSUBEB uses your location to verify you are physically at your assigned school when marking attendance.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>EdoSUBEB uses your location to verify school presence at check-in and check-out.</string>
```

### Android — `android/app/src/main/AndroidManifest.xml`

Add inside `<manifest>`:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.INTERNET" />
```

---

## 4. App icon & splash

Place a 1024×1024 PNG at `resources/icon.png` and a 2732×2732 PNG at
`resources/splash.png`, then generate platform assets:

```bash
bun add -D @capacitor/assets
npx capacitor-assets generate
```

A starter icon is in `src/assets/store/app-icon.png`.

---

## 5. Build & run locally

```bash
# After ANY change to web code:
bun run build && npx cap sync

# iOS (opens Xcode)
npx cap open ios

# Android (opens Android Studio)
npx cap open android
```

In Xcode / Android Studio, select a simulator or connected device and press Run.

---

## 6. App Store (Apple) — submission checklist

1. **Bundle ID**: `ng.gov.edo.subeb.attendance` (already set in `capacitor.config.ts`).
2. **Version**: bump `CFBundleShortVersionString` in `Info.plist`.
3. **Privacy nutrition label** (App Store Connect → App Privacy):
   - Data Linked to You: Contact Info (name, email, phone), Identifiers (user ID), Location (precise, app functionality only).
   - Data Used to Track You: **None**.
4. **Privacy policy URL**: `https://edosas.com/privacy`
5. **Support URL**: `https://edosas.com/support`
6. **Age rating**: 4+ (no objectionable content; app is for school staff).
7. **Sign in required to use app**: Yes — provide a demo account in the review notes.
8. **Screenshots**: iPhone 6.7" and iPad 12.9" required. Capture from the live app.

---

## 7. Google Play — submission checklist

1. **Package name**: `ng.gov.edo.subeb.attendance`
2. **Privacy policy URL**: `https://edosas.com/privacy`
3. **Data safety form**:
   - Personal info collected: Name, Email, Phone, User IDs. Shared with: nobody outside EdoSUBEB. Required for app functionality.
   - Location: Approximate + Precise. Used for: App functionality (verifying presence at school). NOT shared.
   - Data encrypted in transit: Yes. Users can request deletion: Yes (link to `/data-deletion`).
4. **Target audience**: 18+ (school staff). NOT designed for children.
5. **Content rating**: Everyone.
6. **Permissions justification**: Fine location — required to verify physical presence at the assigned school during attendance check-in/out.

---

## 8. After review

Production builds must serve the bundled web assets, NOT a remote URL. Make
sure the `server` block in `capacitor.config.ts` stays commented out for
release builds.

Backend (auth, database, server functions) continues to run on Lovable Cloud
and is reached over HTTPS from the native shell.
