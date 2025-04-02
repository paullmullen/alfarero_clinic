import { getFirestore } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  OAuthProvider,
  signOut,
} from "firebase/auth";
import { usePermissions } from "./permissionsContext";
import { useContext } from "react";

// Firebase configuration for your single project (same for both databases)
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

// Initialize Firebase app
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

const dbName = process.env.REACT_APP_FIREBASE_DB || "default"; // Default to "default" if not set
console.log("Database name: ", dbName);

// Choose the correct Firestore database instance
const firestore =
  dbName === "alfarero-dev"
    ? getFirestore(firebaseApp, "alfarero-dev") // Use dev database
    : getFirestore(firebaseApp); // Use default database (production)

// Update login function to use tenantId
const loginWithMicrosoft = async () => {
  const provider = new OAuthProvider("microsoft.com");

  if (firebaseConfig.tenantId) {
    provider.setCustomParameters({
      tenant: firebaseConfig.tenantId,
    });
  }

  console.log(provider);

  try {
    const result = await signInWithPopup(auth, provider);
    console.log("User Info:", result.user);

    // Access PermissionsContext and update user info
    const { setUserPermissions } = useContext(usePermissions);
    setUserPermissions(result.user); // Update context with the logged-in user

    return result.user;
  } catch (error) {
    console.error("Error logging in:", error);
    return null;
  }
};

// Logout function
const logout = async () => {
  try {
    await signOut(auth);
    console.log("User signed out");
  } catch (error) {
    console.error("Error signing out:", error);
  }
};

export { firebaseApp, firestore, logout, auth, loginWithMicrosoft };
