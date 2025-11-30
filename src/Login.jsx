// Login.jsx
import React, { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import "./Login.css";

export default function Login({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Remove global body background for this page
    document.body.classList.add("login-page");
    return () => document.body.classList.remove("login-page");
  }, []);

  const loginNow = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);

      const adminRef = doc(db, "admins", email);
      const snap = await getDoc(adminRef);

      if (!snap.exists()) {
        setError("You are not an Admin.");
        return;
      }

      onSuccess();
    } catch (err) {
      setError("Invalid email or password.");
    }
  };

  return (
    <div className="login-root">
      <div className="login-overlay"></div>

      <div className="login-card">
        <div className="login-header">
          <div className="rail-logo-circle">🚆</div>
          <h2>RailSeva Admin</h2>
          <p>Authorized Personnel Only</p>
        </div>

        <form onSubmit={loginNow}>
          <div className="input-group-login">
            <span className="input-icon">📧</span>
            <input
              type="email"
              placeholder="Email Address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="input-group-login">
            <span className="input-icon">🔒</span>
            <input
              type="password"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="btn-login-submit">
            Secure Login
          </button>
        </form>
      </div>
    </div>
  );
}
