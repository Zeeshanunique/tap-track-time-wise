// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAn-0PiomTK54rDJ_P7TBOHO3hbYEA_WBE",
  authDomain: "tracking-d4f06.firebaseapp.com",
  projectId: "tracking-d4f06",
  storageBucket: "tracking-d4f06.firebasestorage.app",
  messagingSenderId: "44674683953",
  appId: "1:44674683953:web:09d31886b494641485f110",
  measurementId: "G-Q4CXC5WZ1S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const firestore = getFirestore(app);

// Enable offline persistence for Firestore
try {
  enableIndexedDbPersistence(firestore)
    .then(() => {
      console.log("Firestore offline persistence enabled");
    })
    .catch((err) => {
      console.warn("Firestore offline persistence could not be enabled:", err);
    });
} catch (err) {
  console.warn("Error enabling Firestore offline persistence:", err);
}

export { app, analytics, auth, firestore };