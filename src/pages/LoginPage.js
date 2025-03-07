import React, { useState, useEffect } from "react";
import { auth, loginWithMicrosoft, logout } from "../helpers/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";

const LoginPage = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div>
      <h2>Login Page</h2>
      {user ? (
        <div>
          <p>
            Welcome, {user.displayName}
            <br />
            Firebase UID: {user.uid}
            <br />
            {user.email}
            <br />
            Microsoft UID: {user.providerData[0].uid}
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
