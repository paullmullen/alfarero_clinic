import React, { useState, useEffect } from "react";
import { auth, loginWithMicrosoft, logout } from "../helpers/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { firestore } from "../helpers/firebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { useTranslation } from "react-i18next";

const LoginPage = () => {
  const [user, setUser] = useState(null);
  const { t } = useTranslation("global");

  // Function to fetch managers (users with permissions.manager: true)
  const getManagers = async () => {
    try {
      const usersRef = collection(firestore, "users");
      const q = query(usersRef, where("permissions.manager", "==", true));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => ({
        email: doc.data().email,
        name: doc.data().name || "Manager",
      }));
    } catch (error) {
      console.error("Error fetching managers:", error);
      return [];
    }
  };

  // Function to fetch email content from signupMessage collection
  const getEmailContent = async () => {
    try {
      const emailDocRef = doc(firestore, "signupMessage", "new_user");
      const emailDoc = await getDoc(emailDocRef);
      if (emailDoc.exists()) {
        return {
          subject:
            emailDoc.data().subjectLine || "New User Registration - DEFAULT",
          message:
            emailDoc.data().text || "A new user has registered - DEFAULT",
        };
      }
      return {
        subject: "New User Registration - DEFAULT (no email content)",
        message: "A new user has registered.",
      };
    } catch (error) {
      console.error("Error fetching email content:", error);
      return {
        subject: "New User Registration",
        message: "A new user has registered.",
      };
    }
  };

  // Function to send email to managers via Cloud Function
  const sendEmailToManagers = async (managers, newUser, emailContent) => {
    console.log("sending email to managers");
    try {
      const response = await fetch(
        "https://sendemailtomanagers-479287307088.us-central1.run.app",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            managers,
            subject: emailContent.subject.replace("{userName}", newUser.name),
            message: emailContent.message
              .replace("{userName}", newUser.name)
              .replace("{userEmail}", newUser.email),
          }),
        }
      );
      if (!response.ok) {
        throw new Error("Failed to send email to managers");
      }
      console.log("Email sent to managers successfully");
    } catch (error) {
      console.error("Error sending email to managers:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
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

            // Fetch managers and email content, then send email
            const managers = await getManagers();
            const emailContent = await getEmailContent();
            console.log(managers);
            console.log(emailContent);
            if (managers.length > 0) {
              await sendEmailToManagers(managers, newUser, emailContent);
            } else {
              console.log("No managers found to notify");
            }
          }
        } catch (error) {
          console.error("Error checking or creating user in Firestore:", error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h2>{t("LOGIN_PAGE_TITLE")}</h2>
      {user ? (
        <div>
          <p>
            {user.displayName || "User"} {t("WELCOME_MESSAGE")}
          </p>
          <button onClick={logout}>{t("LOGOUT_BUTTON")}</button>
        </div>
      ) : (
        <button onClick={loginWithMicrosoft}>
          {t("LOGIN_WITH_MICROSOFT")}
        </button>
      )}
    </div>
  );
};

export default LoginPage;
