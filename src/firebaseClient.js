import { initializeApp } from "firebase/app";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

const firebaseConfig = {
  projectId: "alfarero-478ad",
  // No API key needed for emulator
};

const app = initializeApp(firebaseConfig);

// --- Cloud Functions ---
const functions = getFunctions(app);

// --- Firestore ---
const db = getFirestore(app);

// --- Emulator Routing (local only) ---
if (window.location.hostname === "localhost") {
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

export { app, db, functions };
