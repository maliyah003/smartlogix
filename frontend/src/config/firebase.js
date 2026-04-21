import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// SmartLogix Web Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBwLl62XKPUZGMLKkrALwjXWkuzxsoDOSY",
  authDomain: "smartlogix-bb740.firebaseapp.com",
  databaseURL: "https://smartlogix-bb740-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smartlogix-bb740",
  storageBucket: "smartlogix-bb740.firebasestorage.app",
  messagingSenderId: "497044428349",
  appId: "1:497044428349:web:f464eefb022297ff4b7c54",
  measurementId: "G-KF0Z35DKXW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database
export const db = getDatabase(app);
export default app;
