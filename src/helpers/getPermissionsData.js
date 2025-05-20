import { doc, getDoc } from "firebase/firestore";
import { firestore } from "./firebaseConfig"; // Adjust the import path if needed

export const getPermissionsData = async (uid) => {
  if (!uid) return null; // Prevent unnecessary calls

  try {
    const userDocRef = doc(firestore, "users", uid); // Reference to the user document
    const userDocSnap = await getDoc(userDocRef); // Fetch the document

    if (userDocSnap.exists()) {
      return userDocSnap.data(); // Return user permissions
    } else {
      console.warn(`No permissions found for user: ${uid}`);
      return null;
    }
  } catch (error) {
    console.error("Error fetching user permissions:", error);
    return null;
  }
};
