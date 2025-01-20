import { collection, query, where, getDocs } from "firebase/firestore";
import { firestore } from "./../helpers/firebaseConfig";

// Returns a boolean indicating if there are matching records
const checkDuplicateRecord = async (collectionPath, field, value) => {
  const colRef = collection(firestore, collectionPath);
  const q = query(colRef, where(field, "==", value));
  const snapshot = await getDocs(q);

  return !snapshot.empty;
};

// Checks for duplicates and returns the reference to the first duplicate record found
const getDuplicateRecordRef = async (collectionPath, field, value) => {
  const colRef = collection(firestore, collectionPath);
  const q = query(colRef, where(field, "==", value));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const docRef = snapshot.docs[0].ref; // Get the document reference
    return docRef;
  }

  return null;
};

export { checkDuplicateRecord, getDuplicateRecordRef };
