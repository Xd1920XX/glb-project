import {
  collection, doc,
  addDoc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, increment,
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

// Analytics — view tracking
export async function trackView(id) {
  const ref = doc(db, 'analytics', id)
  try {
    await updateDoc(ref, { views: increment(1) })
  } catch {
    await setDoc(ref, { views: 1 })
  }
}

export async function getAnalyticsBatch(ids) {
  if (!ids.length) return {}
  const results = {}
  await Promise.all(ids.map(async (id) => {
    const snap = await getDoc(doc(db, 'analytics', id))
    results[id] = snap.exists() ? snap.data() : { views: 0 }
  }))
  return results
}

// Duplicate a configurator
export async function duplicateConfigurator(uid, source) {
  const { id: _id, createdAt: _c, updatedAt: _u, ...data } = source
  const ref = await addDoc(collection(db, 'configurators'), {
    ...data,
    ownerId: uid,
    name: data.name + ' (Copy)',
    published: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

// Orders
export async function saveOrder(configuratorId, ownerId, { variantId, interiorId, formData, configuratorName }) {
  await addDoc(collection(db, 'orders'), {
    configuratorId,
    ownerId,
    variantId: variantId ?? null,
    interiorId: interiorId ?? null,
    formData: formData ?? {},
    configuratorName: configuratorName ?? '',
    createdAt: serverTimestamp(),
  })
}

export async function getUserOrders(uid) {
  const q = query(
    collection(db, 'orders'),
    where('ownerId', '==', uid),
    orderBy('createdAt', 'desc'),
  )
  const snaps = await getDocs(q)
  return snaps.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// ── Landing pages ──────────────────────────────────────────────────

export async function createLandingPage(uid, name) {
  const ref = await addDoc(collection(db, 'landingPages'), {
    ownerId: uid,
    name,
    siteName: '',
    tagline: '',
    description: '',
    logoUrl: null,
    logoPath: null,
    layout: 'hero',
    accentColor: '#111111',
    bgColor: '#ffffff',
    cardBg: '#f5f5f5',
    textColor: '#111111',
    items: [],
    published: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function getLandingPage(id) {
  const snap = await getDoc(doc(db, 'landingPages', id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function getUserLandingPages(uid) {
  const q = query(
    collection(db, 'landingPages'),
    where('ownerId', '==', uid),
    orderBy('createdAt', 'desc'),
  )
  const snaps = await getDocs(q)
  return snaps.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function saveLandingPage(id, data) {
  await updateDoc(doc(db, 'landingPages', id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteLandingPage(id) {
  await deleteDoc(doc(db, 'landingPages', id))
}

export async function getPublishedLandingPageCount(uid) {
  const q = query(
    collection(db, 'landingPages'),
    where('ownerId', '==', uid),
    where('published', '==', true),
  )
  const snaps = await getDocs(q)
  return snaps.size
}

export async function publishLandingPage(id, published) {
  await updateDoc(doc(db, 'landingPages', id), { published, updatedAt: serverTimestamp() })
}

// ── Public embed — reads config + checks owner subscription ────────

export async function getPublishedConfigurator(id) {
  const cfg = await getConfigurator(id)
  if (!cfg || !cfg.published) return null
  try {
    const owner = await getUser(cfg.ownerId)
    if (!owner) return null
    const active = ['trial', 'active'].includes(owner.subscriptionStatus)
    return active ? cfg : null
  } catch {
    // Unauthenticated visitors cannot read the owner's user doc (Firestore rules).
    // If the configurator is published, allow it through — subscription enforcement
    // happens at publish time in the builder.
    return cfg
  }
}
