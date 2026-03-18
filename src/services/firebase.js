import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// TODO: Replace with your Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyC7it9l-IhWtWUeE8x0LIG8ksJHfanVilY",
  authDomain: "xpos-8008f.firebaseapp.com",
  projectId: "xpos-8008f",
  storageBucket: "xpos-8008f.firebasestorage.app",
  messagingSenderId: "863705385342",
  appId: "1:863705385342:web:6a4b99c593f168b8624b2f",
  measurementId: "G-H59TZPRJH2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with persistent cache for offline support
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

const auth = getAuth(app);

export { app, db, auth };
