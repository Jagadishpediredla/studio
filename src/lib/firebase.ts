// src/lib/firebase.ts
import { initializeApp, getApp, type FirebaseApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    apiKey: "AIzaSyBhUn4-n1m07pBmxofnUiDSc9dYSpfsxkg",
    authDomain: "studio-7521927942-b3c3d.firebaseapp.com",
    databaseURL: "https://studio-7521927942-b3c3d-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "studio-7521927942-b3c3d",
    storageBucket: "studio-7521927942-b3c3d.firebasestorage.app",
    messagingSenderId: "65962346813",
    appId: "1:65962346813:android:d573dadd5f046f65779d54"
};

// Initialize Firebase
let app: FirebaseApp;
try {
  app = getApp();
} catch (e) {
  app = initializeApp(firebaseConfig);
}

const database = getDatabase(app);

export { app, database };
