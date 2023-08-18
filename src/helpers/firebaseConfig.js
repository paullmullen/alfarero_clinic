import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAiFimaU1K5xqDN0WfjLIDQnlg6H5s-KVw",
  authDomain: "alfarero-478ad.firebaseapp.com",
  projectId: "alfarero-478ad",
  storageBucket: "alfarero-478ad.appspot.com",
  messagingSenderId: "479287307088",
  appId: "1:479287307088:web:baafe6c2c71031ffa25a55",
  measurementId: "G-N23WW01989",
};

firebase.initializeApp(firebaseConfig);

export const firestore = firebase.firestore();

