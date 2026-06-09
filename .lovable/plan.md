# Mobile Deployment Prep + Legal Pages

Two parts: (1) legal/compliance content the stores require, (2) Capacitor wrapper so the same web app ships as iOS + Android binaries.

## 1. Legal & compliance pages (web + mobile)

New TanStack routes, each with proper `head()` metadata, linked from the landing page footer and the signup screen consent:

- `/privacy` — Privacy Policy (data collected: name, email, teacher ID, school, GPS location for attendance, device info; lawful basis; retention; third parties = Lovable Cloud/Supabase; user rights under Nigeria NDPR + GDPR/CCPA references; contact email; children's data note since system covers primary schools — data is collected by school staff, not by children directly)
- `/terms` — Terms of Service (acceptable use, account/role rules, EdoSUBEB ownership, disclaimers, governing law: Edo State, Nigeria)
- `/cookies` — Cookie Policy (essential cookies only: auth/session; no advertising/tracking cookies)
- `/data-deletion` — Data Deletion Instructions (required by Google Play; how a teacher/admin requests deletion, email contact, retention exceptions for audit logs)
- `/support` — Support / Contact page (required by both stores)

Footer in `src/routes/index.tsx` gets links to all five. Signup screen gets a checkbox: "I agree to the Terms and Privacy Policy."

A small cookie/consent banner component (essential-only notice, single Acknowledge button, stores acceptance in localStorage) shown on first visit. No third-party tracking is loaded, so a full consent manager isn't needed.

## 2. Permissions copy (required by stores)

Edit `src/routes/__root.tsx` head meta and add iOS Info.plist usage strings + Android manifest descriptions in Capacitor config:

- Location (always shown at check-in): "EdoSUBEB uses your location to verify you are physically at your assigned school when marking attendance."
- Camera (if/when added later): leave out for now.
- Notifications: skipped — not currently used.

## 3. Capacitor wrapper for iOS + Android

Lovable preview runs the web app; native binaries are built locally after exporting to GitHub. I'll add the config + a `MOBILE.md` guide so the export-to-Xcode/Android-Studio flow is one-shot.

Added to project:

- `bun add @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android @capacitor/geolocation @capacitor/app @capacitor/status-bar`
- `capacitor.config.ts` with:
  - `appId: "ng.gov.edo.subeb.attendance"`
  - `appName: "EdoSUBEB Attendance"`
  - `webDir: ".output/public"` (TanStack Start build output)
  - `server.url` pointing to the published `edosas.com` in dev so hot-reload works on device; commented instructions to remove before App Store submission
  - iOS `NSLocationWhenInUseUsageDescription`, Android location permission rationale
- `MOBILE.md` at project root with the exact commands the user runs after `git clone`:
  1. `bun install`
  2. `bun run build`
  3. `npx cap add ios && npx cap add android`
  4. `npx cap sync`
  5. `npx cap open ios` (Xcode) / `npx cap open android` (Android Studio)
  6. App Store: bundle ID, version, screenshots, privacy nutrition label answers (filled from `/privacy`)
  7. Play Store: data safety form answers, content rating, target audience (note: app is for school staff, not children — primary audience = adults)

Geolocation in the app already uses the browser `navigator.geolocation` API, which Capacitor proxies through `@capacitor/geolocation` automatically on native — no code change needed in `src/lib/geo.ts`.

## 4. Store-listing assets

Generated via imagegen and saved under `src/assets/store/`:

- 1024×1024 app icon (EdoSUBEB logo on brand green)
- iOS splash + Android adaptive icon foreground
- 6 screenshot mockups (hero shots of login, dashboard, attendance check-in, admin map, admin analytics)

## Out of scope (call out to user)

- Actual submission to App Store Connect / Play Console requires Apple Developer ($99/yr) and Google Play ($25 one-time) accounts under EdoSUBEB's name — only the user can do this.
- Push notifications, in-app purchases, Sign in with Apple — not added unless requested.
- Native camera/biometrics — not added.

## Technical notes

- TanStack Start currently SSRs; for Capacitor we ship the **static client build** only. Build command in `MOBILE.md` will be `bun run build` then point `webDir` at the prerendered output. Auth + server functions continue to call the deployed `edosas.com` backend over HTTPS — the native shell is just the React client.
- No service worker / PWA registration is added (per platform rules and to avoid Lovable preview issues).
- All new routes use the existing design tokens and `head()` per-route metadata pattern — no canonical in `__root.tsx`.

Confirm and I'll build it.
