import React, { useState, useEffect } from "react";
import { auth, loginWithMicrosoft, logout } from "../helpers/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { firestore } from "../helpers/firebaseConfig";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useTranslation } from "react-i18next";

const LoginPage = () => {
  const [user, setUser] = useState(null);

  const [t] = useTranslation("global");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          // Check if user exists in Firestore by microsoftUID
          const microsoftUID = currentUser.providerData?.[0]?.uid;
          if (!microsoftUID) {
            console.error("No Microsoft UID found in providerData");
            return;
          }

          const usersRef = doc(firestore, "users", currentUser.uid);
          const userSnap = await getDoc(usersRef);

          if (!userSnap.exists()) {
            // User doesn't exist, create new document
            const newUser = {
              created: serverTimestamp(),
              email: currentUser.email || "",
              microsoftUID: microsoftUID,
              name: currentUser.displayName || "",
              permissions: {
                host: false,
                settings: false,
                stats: false,
              },
              uid: currentUser.uid,
              updated: serverTimestamp(),
            };

            await setDoc(usersRef, newUser);
            console.log("New user created in Firestore:", newUser);
          }
        } catch (error) {
          console.error("Error checking or creating user in Firestore:", error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div>
      <h2>Login Page</h2>
      {user ? (
        <div>
          <p>
            {user.displayName} {t("AUTHORIZED_BY")}
          </p>

          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <button onClick={loginWithMicrosoft}>Login with Microsoft</button>
      )}
    </div>
  );
};

export { LoginPage };
