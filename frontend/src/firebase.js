import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAPBVj2rb0ZTzlv7vDAuOpQrFQzAAxC_rA",
  authDomain: "vehicles-c0b05.firebaseapp.com",
  projectId: "vehicles-c0b05",
  storageBucket: "vehicles-c0b05.firebasestorage.app",
  messagingSenderId: "177793912930",
  appId: "1:177793912930:web:0dddedc5d039979b0e413b",
  measurementId: "G-X6KP5G5FH5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
