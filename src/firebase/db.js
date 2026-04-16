import {
  collection, doc,
  addDoc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from './config.js'

// ── Users ──────────────────────────────────────────────────────────

export async function getUser(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function updateUser(uid, data) {
  await updateDoc(doc(db, 'users', uid), data)
}

// ── Configurators ──────────────────────────────────────────────────

export async function createConfigurator(uid, name) {
  const ref = await addDoc(collection(db, 'configurators'), {
    ownerId: uid,
    name,
    published: false,
    variants: [],
    interiors: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function getConfigurator(id) {
  const snap = await getDoc(doc(db, 'configurators', id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function getUserConfigurators(uid) {
  const q = query(
    collection(db, 'configurators'),
    where('ownerId', '==', uid),
    orderBy('createdAt', 'desc'),
  )
  const snaps = await getDocs(q)
  return snaps.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getPublishedCount(uid) {
  const q = query(
    collection(db, 'configurators'),
    where('ownerId', '==', uid),
    where('published', '==', true),
  )
  const snaps = await getDocs(q)
  return snaps.size
}

export async function saveConfigurator(id, data) {
  await updateDoc(doc(db, 'configurators', id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function publishConfigurator(id, published) {
  await updateDoc(doc(db, 'configurators', id), { published, updatedAt: serverTimestamp() })
}

export async function deleteConfigurator(id) {
  await deleteDoc(doc(db, 'configurators', id))
}

// ── Media library ──────────────────────────────────────────────────

export async function addMediaFile(uid, { name, url, storagePath, size, contentType }) {
  const ref = await addDoc(collection(db, 'media'), {
    ownerId: uid, name, url, storagePath, size, contentType,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function getUserMedia(uid) {
  const q = query(
    collection(db, 'media'),
    where('ownerId', '==', uid),
    orderBy('createdAt', 'desc'),
  )
  const snaps = await getDocs(q)
  return snaps.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function deleteMediaFile(id) {
  await deleteDoc(doc(db, 'media', id))
}

// ── Public embed — reads config + checks owner subscription ────────

export async function getPublishedConfigurator(id) {
  const cfg = await getConfigurator(id)
  if (!cfg || !cfg.published) return null
  const owner = await getUser(cfg.ownerId)
  if (!owner) return null
  const active = ['trial', 'active'].includes(owner.subscriptionStatus)
  return active ? cfg : null
}
