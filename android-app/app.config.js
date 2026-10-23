const fs = require("fs");
const path = require("path");

function readParentServerUrl() {
  const fallback = "http://thecodersteam.com:3082";
  try {
    const parentEnvPath = path.resolve(__dirname, "..", ".env");
    if (fs.existsSync(parentEnvPath)) {
      const content = fs.readFileSync(parentEnvPath, "utf8");
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const idx = trimmed.indexOf("=");
        if (idx > 0) {
          const key = trimmed.slice(0, idx).trim();
          const rawVal = trimmed
            .slice(idx + 1)
            .trim()
            .replace(/^['"]|['"]$/g, "");
          if (
            (key === "SERVER_URL" ||
              key === "EXPO_PUBLIC_SERVER_URL" ||
              key === "NEXT_PUBLIC_SERVER_URL") &&
            rawVal
          ) {
            return rawVal.startsWith("http://") || rawVal.startsWith("https://")
              ? rawVal.replace(/\/+$/, "")
              : `http://${rawVal.replace(/\/+$/, "")}`;
          }
        }
      }
    }
  } catch {
    // Fallback to default
  }
  return fallback;
}

const serverUrl = readParentServerUrl();
process.env.EXPO_PUBLIC_SERVER_URL = serverUrl;

module.exports = {
  expo: {
    name: "MOSAPRO Relevamiento",
    slug: "mosapro-relevamiento",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#567c7f",
    },
    extra: {
      serverUrl,
    },
    android: {
      package: "ar.com.mosapro.relevamiento",
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#567c7f",
      },
      permissions: ["INTERNET", "ACCESS_NETWORK_STATE"],
    },
    plugins: [],
  },
};
