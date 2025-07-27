
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  projectId: 'krishak-mitra-xfm3o',
  appId: '1:534813216979:web:6caa938197683169f0c426',
  storageBucket: 'krishak-mitra-xfm3o.firebasestorage.app',
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: 'krishak-mitra-xfm3o.firebaseapp.com',
  measurementId: '',
  messagingSenderId: '534813216979',
};

const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

export { app, db, auth, storage };
