import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './config.js'

export async function signUp(name, email, password) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(user, { displayName: name })
  await setDoc(doc(db, 'users', user.uid), {
    name,
    email,
    plan: 'trial',
    trialStarted: serverTimestamp(),
    subscriptionStatus: 'trial',
    paypalSubscriptionId: null,
    createdAt: serverTimestamp(),
  })
  return user
}

export async function signIn(email, password) {
  const { user } = await signInWithEmailAndPassword(auth, email, password)
  return user
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider()
  const { user } = await signInWithPopup(auth, provider)
  // Create Firestore profile only if it doesn't exist yet (new user)
  const ref = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, {
      name: user.displayName || '',
      email: user.email,
      plan: 'trial',
      trialStarted: serverTimestamp(),
      subscriptionStatus: 'trial',
      paypalSubscriptionId: null,
      createdAt: serverTimestamp(),
    })
  }
  return user
}

export function logOut() {
  return signOut(auth)
}
