import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.edosubeb.attendance",
  appName: "EdoSAS",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  plugins: {
    Geolocation: {
      highAccuracy: true,
    },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: "#0B6B3A",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      spinnerColor: "#FFFFFF",
    },
  },
  ios: {
    contentInset: "automatic",
    backgroundColor: "#0B6B3A",
  },
  android: {
    backgroundColor: "#0B6B3A",
  },
};

export default config;
