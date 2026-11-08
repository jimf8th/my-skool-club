import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import {
  initializeAuth,
  getReactNativePersistence,
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';

// Public Firebase identifiers for the my-skool-club-web project; the backend
// only trusts ID tokens after verifying them against Google's signing keys.
const firebaseConfig = {
  apiKey: 'AIzaSyBoBO878G-yT4Nqnp5sur8PCNwyXXMM6zY',
  authDomain: 'my-skool-club-web.firebaseapp.com',
  projectId: 'my-skool-club-web',
  appId: '1:1020171079797:ios:6a081b3e757dcbe8e9283c',
};

const app = initializeApp(firebaseConfig);

export const firebaseAuth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export async function currentIdToken() {
  const user = firebaseAuth.currentUser;
  return user ? user.getIdToken() : null;
}

export {
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile,
};
