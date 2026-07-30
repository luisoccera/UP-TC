import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.upconsultancy.trainingcenter",
  appName: "UP Training Center",
  webDir: "desktop/dist",
  android: {
    allowMixedContent: false,
  },
  server: {
    androidScheme: "https",
    iosScheme: "https",
  },
};

export default config;
