import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor configuration for iOS + Android shells of the EdoSUBEB Smart Attendance app.
 *
 * For local development against the live preview, uncomment `server.url` below.
 * REMOVE the `server.url` block before submitting to the App Store or Play Store —
 * production builds must load the bundled `webDir` to satisfy review guidelines.
 *
 * See MOBILE.md at the project root for the full build / submit checklist.
 */
const config: CapacitorConfig = {
  appId: "ng.gov.edo.subeb.attendance",
  appName: "EdoSUBEB Attendance",
  webDir: "dist",
  // server: {
  //   url: "https://edosas.com",
  //   cleartext: false,
  // },
  ios: {
    contentInset: "always",
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#0B6B3A",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    Geolocation: {
      // iOS Info.plist usage strings are also set in MOBILE.md
      permissions: {
        location: "always",
      },
    },
  },
};

export default config;
