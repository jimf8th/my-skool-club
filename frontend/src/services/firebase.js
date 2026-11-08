import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
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
  appId: '1:1020171079797:web:c603908702403295e9283c',
};

const app = initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');

export async function currentIdToken() {
  const user = firebaseAuth.currentUser;
  return user ? user.getIdToken() : null;
}

export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile,
};
