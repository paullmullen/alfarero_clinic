import firebase from "firebase/compat/app";
import "firebase/firestore";

const firestore = firebase.firestore();

const checkDuplicateRecord = async (collectionPath, field, value) => {
  const snapshot = await firestore
    .collection(collectionPath)
    .where(field, "==", value)
    .get();

  return !snapshot.empty;
};

export default checkDuplicateRecord;
