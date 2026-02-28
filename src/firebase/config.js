import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Firebase Configuration
 *
 * To set up your Firebase project:
 * 1. Go to Firebase Console: https://console.firebase.google.com
 * 2. Create a new project or select existing one
 * 3. Go to Project Settings > General
 * 4. Copy your web app config values
 * 5. Create a .env.local file in your project root with these variables:
 *    VITE_FIREBASE_API_KEY=your_api_key
 *    VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
 *    VITE_FIREBASE_PROJECT_ID=your_project_id
 *    VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
 *    VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
 *    VITE_FIREBASE_APP_ID=your_app_id
 */

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDt1XbLgd9BCIMrSmKYWIqHrVLZJsAWzi8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "simple-erp-c59b0.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "simple-erp-c59b0",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "simple-erp-c59b0.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "613028524748",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:613028524748:web:87016db1272e58adb80869",
  measurementId: "G-CXTGCZSKJF",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
