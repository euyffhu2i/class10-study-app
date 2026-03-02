// ===============================
// Firebase v11 Modular Setup
// ===============================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  enableIndexedDbPersistence,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCr4SF1jgUdfj5KcP747KTI2r5B8JdF1fE",
  authDomain: "class10-smart-system.firebaseapp.com",
  projectId: "class10-smart-system",
  storageBucket: "class10-smart-system.firebasestorage.app",
  messagingSenderId: "824047078635",
  appId: "1:824047078635:web:395d0ab903f8456beb82ae"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === "failed-precondition") {
    console.warn("Persistence works in one tab only.");
  } else if (err.code === "unimplemented") {
    console.warn("Browser does not support offline.");
  }
});

export {
  auth,
  db,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
};