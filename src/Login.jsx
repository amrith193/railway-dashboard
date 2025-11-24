import React, { useState } from "react";
import { auth, db } from "./firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function Login({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const loginNow = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // Firebase Auth
      await signInWithEmailAndPassword(auth, email, password);

      // Firestore admin check
      const adminRef = doc(db, "admins", email);
      const snap = await getDoc(adminRef);

      if (!snap.exists()) {
        setError("You are not an Admin.");
        return;
      }

      onSuccess(); // logged in
    } catch (err) {
      setError("Invalid email or password.");
      console.log(err);
    }
  };

  return (
    <div style={styles.container}>
      <h2>Admin Login</h2>

      <form onSubmit={loginNow} style={styles.form}>
        <input
          type="email"
          placeholder="Email"
          required
          style={styles.input}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          required
          style={styles.input}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p style={styles.error}>{error}</p>}

        <button type="submit" style={styles.button}>
          Login
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 400,
    margin: "80px auto",
    padding: 20,
    background: "#fff",
    boxShadow: "0 0 12px rgba(0,0,0,0.1)",
    borderRadius: 12,
    textAlign: "center"
  },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  input: {
    padding: 10,
    borderRadius: 6,
    border: "1px solid #ccc"
  },
  button: {
    padding: "10px 12px",
    background: "#2563eb",
    color: "white",
    borderRadius: 6,
    border: "none"
  },
  error: { color: "red", fontSize: "0.9rem" }
};
