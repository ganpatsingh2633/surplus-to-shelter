import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { app } from './config';
import { db } from './firestore';

export const auth = getAuth(app);

/**
 * Register user with email, password, display name, and role.
 * Saves user details into Firestore `users` collection keyed by uid:
 * { uid, name, role, email, createdAt }
 */
export async function signUpUser(email, password, name, role) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Update Auth Profile Display Name
  await updateProfile(user, {
    displayName: name.trim(),
  });

  const userData = {
    uid: user.uid,
    name: name.trim(),
    role: role, // "donor" | "shelter" | "driver"
    email: email.trim().toLowerCase(),
    createdAt: serverTimestamp(),
  };

  // 1. Write to users collection
  await setDoc(doc(db, 'users', user.uid), userData);

  // 2. Initialize corresponding role-specific collection record
  if (role === 'shelter') {
    await setDoc(doc(db, 'shelters', user.uid), {
      uid: user.uid,
      name: name.trim(),
      capacity: 0,
      currentLoad: 0,
      lat: null,
      lng: null,
      preferences: [],
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } else if (role === 'driver') {
    await setDoc(doc(db, 'drivers', user.uid), {
      uid: user.uid,
      name: name.trim(),
      status: 'available',
      currentLocation: null,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }

  return { user, userData };
}

/**
 * Sign in existing user with email and password.
 * Returns user and user data (including role from `users` collection).
 */
export async function loginUser(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  const profile = await getUserProfile(user.uid);
  return { user, profile };
}

/**
 * Sign out current authenticated user.
 */
export async function logoutUser() {
  return signOut(auth);
}

/**
 * Fetch profile data for a given user UID from `users` collection.
 */
export async function getUserProfile(uid) {
  if (!uid) return null;
  const userSnap = await getDoc(doc(db, 'users', uid));
  if (userSnap.exists()) {
    return userSnap.data();
  }
  return null;
}

export { onAuthStateChanged };
