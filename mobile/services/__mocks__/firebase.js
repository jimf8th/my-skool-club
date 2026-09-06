// Jest manual mock for services/firebase.js.
// Prevents the real Firebase ESM packages from being loaded in tests.
const firebaseAuth = {};
const currentIdToken = jest.fn().mockResolvedValue(null);
const GoogleAuthProvider = jest.fn();
const OAuthProvider = jest.fn();
const createUserWithEmailAndPassword = jest.fn();
const signInWithEmailAndPassword = jest.fn();
const signInWithCredential = jest.fn();
const sendEmailVerification = jest.fn();
const sendPasswordResetEmail = jest.fn();
const signOut = jest.fn();
const onAuthStateChanged = jest.fn(() => () => {});
const updateProfile = jest.fn();

module.exports = {
  firebaseAuth,
  currentIdToken,
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
