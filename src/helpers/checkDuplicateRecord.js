import firebase from "firebase/compat/app";
import "firebase/firestore";

const firestore = firebase.firestore();

// arroja booleano si hay coincidencias.. si el field corresponde
const checkDuplicateRecord = async (collectionPath, field, value) => {
  const snapshot = await firestore
    .collection(collectionPath)
    .where(field, "==", value)
    .get();

  return !snapshot.empty;
};

//verifica duplicados y retorna la referencia al primer registro duplicado encontrado
const getDuplicateRecordRef = async (collectionPath, field, value) => {
  const snapshot = await firestore
    .collection(collectionPath)
    .where(field, "==", value)
    .get();

  if (!snapshot.empty) {
    const docRef = snapshot.docs[0].ref;
    return docRef;
  }

  return null;
};

export { checkDuplicateRecord, getDuplicateRecordRef };
