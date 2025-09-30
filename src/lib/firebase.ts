import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAQThI0MpZzJPr258yFMKXNSZmQRBXLsGI",
  authDomain: "ktmember-6989e.firebaseapp.com",
  databaseURL: "https://ktmember-6989e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ktmember-6989e",
  storageBucket: "ktmember-6989e.firebasestorage.app",
  messagingSenderId: "326700889353",
  appId: "1:326700889353:web:ed653792db9ea924430fd8",
  measurementId: "G-WZPB7MSCSZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and get a reference to the service
export const database = getDatabase(app);

// Initialize Cloud Storage and get a reference to the service
export const storage = getStorage(app);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

export default app;