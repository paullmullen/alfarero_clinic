// src/pages/Registro/services/visitTypesService.js
import { collection, getDocs, orderBy, query } from "firebase/firestore";

export async function fetchVisitTypes(firestore) {
  const visitTypeRef = query(
    collection(firestore, "visit_types"),
    orderBy("order"),
  );
  const snap = await getDocs(visitTypeRef);
  return snap.docs.map((d) => d.data());
}
