import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

// Credentials come exclusively from environment variables (.env) or a config saved
// to localStorage via the in-app connection dialog. No real credentials are ever
// committed to source - if neither is present, the app runs unconfigured and every
// Firebase-backed feature surfaces a clear "not configured" state instead of silently
// connecting to a hardcoded project.
const getFirebaseConfig = () => {
  const localConfig = localStorage.getItem("confhub_firebase_config");
  if (localConfig) {
    try {
      const parsed = JSON.parse(localConfig);
      if (parsed.apiKey && parsed.projectId) return parsed;
    } catch {
      // ignore parse error
    }
  }

  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "",
  };
};

export const currentFirebaseConfig = getFirebaseConfig();

export const isFirebaseConfigured = Boolean(
  currentFirebaseConfig.apiKey &&
  currentFirebaseConfig.projectId
);

let app = null;
let auth = null;
let db = null;
let storage = null;
let analytics = null;

// Opt-in local development mode: point the SDK at the Firebase Local Emulator
// Suite (`firebase emulators:start`) instead of the real cloud project, so
// auth/database/storage work can be tested and iterated on without touching
// live data. Off by default; only active when explicitly enabled.
const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true";

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(currentFirebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);

    if (useEmulators) {
      connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
      connectFirestoreEmulator(db, "127.0.0.1", 8080);
      connectStorageEmulator(storage, "127.0.0.1", 9199);
      console.log("🧪 Using local Firebase emulators (Auth :9099, Firestore :8080, Storage :9199)");
    } else if (typeof window !== "undefined") {
      // Safely initialize analytics in browser environments (real cloud project only)
      isSupported().then((supported) => {
        if (supported) {
          analytics = getAnalytics(app);
        }
      }).catch(() => {});
    }

    console.log(useEmulators ? "🔥 Connected (emulated):" : "🔥 Connected to cloud project:", currentFirebaseConfig.projectId);
  } catch (err) {
    console.warn("Could not initialize cloud connection:", err);
  }
}

export { app, auth, db, storage, analytics };
