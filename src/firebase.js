import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCtV-vetNB9HEeNHl1VP8LeW1Y4B-xLwQk",
  authDomain: "lake-town-turf.firebaseapp.com",
  projectId: "lake-town-turf",
  storageBucket: "lake-town-turf.firebasestorage.app",
  messagingSenderId: "661603543438",
  appId: "1:661603543438:web:6e48d8676ccf60eceb9cdf",
  measurementId: "G-DE73LBGEGB"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
