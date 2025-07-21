import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  getAuth,
  signInWithPopup,
  OAuthProvider,
  signOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
  clientId: process.env.REACT_APP_FIREBASE_CLIENT_ID,
  clientSecret: process.env.REACT_APP_FIREBASE_CLIENT_SECRET,
  tenantId: process.env.REACT_APP_FIREBASE_TENANT_ID,
};

let firebaseApp;
let firestore;
let auth;

try {
  firebaseApp = initializeApp(firebaseConfig);
  firestore = getFirestore(firebaseApp);
  auth = getAuth(firebaseApp);
} catch (error) {
  console.error(
    "Firebase initialization error:",
    error.message,
    error.stack,
    error
  );
  throw error; // Rethrow to fail fast during development
}

const loginWithMicrosoft = async () => {
  const provider = new OAuthProvider("microsoft.com");
  if (firebaseConfig.tenantId) {
    provider.setCustomParameters({ tenant: firebaseConfig.tenantId });
  }
  return signInWithPopup(auth, provider);
};

const logout = () => signOut(auth);

export { firebaseApp, firestore, auth, loginWithMicrosoft, logout };
