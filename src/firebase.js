// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAhwQDWVUdiGrKSfYTlhX90CJIcfRGsXNU",
  authDomain: "railwayadmin.firebaseapp.com",
  projectId: "railwayadmin",
  storageBucket: "railwayadmin.firebasestorage.app",
  messagingSenderId: "277004982524",
  appId: "1:277004982524:web:21d5ce950ff3c4d5a7df79"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);