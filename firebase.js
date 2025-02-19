// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyALmZSVzbdRBiiPPmJgHO8NyYx7iwaXQVI",
  authDomain: "streamsync-51abd.firebaseapp.com",
  projectId: "streamsync-51abd",
  storageBucket: "streamsync-51abd.firebasestorage.app",
  messagingSenderId: "954165232602",
  appId: "1:954165232602:web:5a4d664cc6790d2a58f6e3",
  measurementId: "G-L32VQW3HCR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
export { app, auth, db, storage };
