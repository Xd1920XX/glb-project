import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './config.js'

setPersistence(auth, browserLocalPersistence).catch(() => {})

// role: 'teacher' | 'student'
export async function signUp(name, email, password, role = 'student') {
  const { user } = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(user, { displayName: name })
  await setDoc(doc(db, 'users', user.uid), {
    name,
    email,
    role,
    createdAt: serverTimestamp(),
  })
  return user
}

export async function signIn(email, password) {
  const { user } = await signInWithEmailAndPassword(auth, email, password)
  return user
}

export async function signInWithGoogle(role = 'student') {
  const provider = new GoogleAuthProvider()
  const { user } = await signInWithPopup(auth, provider)
  const ref = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, {
      name: user.displayName || '',
      email: user.email,
      role,
      createdAt: serverTimestamp(),
    })
  }
  return user
}

export function logOut() {
  return signOut(auth)
}
