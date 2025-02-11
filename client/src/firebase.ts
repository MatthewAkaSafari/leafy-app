import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';

// Your Firebase configuration object
const firebaseConfig = {
  apiKey: "AIzaSyDMvTHudv6EE-PE1DYXuOl54qhYreXuLx4",
  authDomain: "leafy-app-c420.firebaseapp.com",
  databaseURL: "https://leafy-app-c420-default-rtdb.firebaseio.com",
  projectId: "leafy-app-c420",
  storageBucket: "leafy-app-c420.firebasestorage.app",
  messagingSenderId: "553724305900",
  appId: "1:553724305900:web:f1350c3efb9cdddb6ca0c9",
  measurementId: "G-TZYH21PSR0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const firestore = getFirestore(app);

// Initialize Firebase Cloud Messaging (FCM) asynchronously
const initializeMessaging = async () => {
  let messaging = null;
  if (await isSupported()) {
    messaging = getMessaging(app);
  }
  return messaging;
};

export { firestore, initializeMessaging };
