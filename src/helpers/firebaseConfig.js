import firebase from "firebase/compat/app";
import { getFirestore } from "firebase/firestore";

// Firebase configuration for your single project (same for both databases)
const firebaseConfig = {
  apiKey: "AIzaSyAiFimaU1K5xqDN0WfjLIDQnlg6H5s-KVw",
  authDomain: "alfarero-478ad.firebaseapp.com",
  projectId: "alfarero-478ad", // Same for both databases
  storageBucket: "alfarero-478ad.appspot.com",
  messagingSenderId: "479287307088",
  appId: "1:479287307088:web:baafe6c2c71031ffa25a55",
  measurementId: "G-N23WW01989",
};

// Initialize Firebase app
const firebaseApp = initializeApp(firebaseConfig);

const dbName = process.env.REACT_APP_FIREBASE_DB || "default"; // Default to "default" if not set
console.log("Database name: ", dbName);

// Choose the correct Firestore database instance
const firestore =
  dbName === "alfarero-dev"
    ? getFirestore(firebaseApp, "alfarero-dev") // Use dev database
    : getFirestore(firebaseApp); // Use default database (production)

console.log(firestore);
export { firebaseApp, firestore };
