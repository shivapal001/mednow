import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA-q78kXt3QmInif0EuSZ1jbZmK8HWHTok",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mednowshop.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mednowshop",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mednowshop.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "934249854845",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:934249854845:web:c5816aae830abfa5097e14",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-KRVHQ913FJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics conditionally (it only works in browser environments)
export const analyticsPromise = isSupported().then((supported) => {
  if (supported) {
    return getAnalytics(app);
  }
  return null;
});

export default app;
