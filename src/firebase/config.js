import { initializeApp, getApps, getApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  !firebaseConfig.apiKey.includes('your-api-key')
);

// Fallback config to prevent crash before user provides .env credentials
const activeConfig = isFirebaseConfigured
  ? firebaseConfig
  : {
      apiKey: 'AIzaSyPreviewPlaceholderOnly1234567890',
      authDomain: 'surplus-shelter-preview.firebaseapp.com',
      projectId: 'surplus-shelter-preview',
      storageBucket: 'surplus-shelter-preview.appspot.com',
      messagingSenderId: '100000000000',
      appId: '1:100000000000:web:abcdef1234567890',
    };

// Initialize Firebase App singleton
export const app = getApps().length > 0 ? getApp() : initializeApp(activeConfig);
