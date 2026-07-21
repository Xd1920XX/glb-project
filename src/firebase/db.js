import {
  collection, doc,
  addDoc, getDoc, getDocs, updateDoc, deleteDoc,
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

// ── Rule tables ────────────────────────────────────────────────────

export async function createRuleTable(uid, name, rules = []) {
  const ref = await addDoc(collection(db, 'ruleTables'), {
    ownerId: uid,
    name,
    rules,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function getRuleTable(id) {
  const snap = await getDoc(doc(db, 'ruleTables', id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function getUserRuleTables(uid) {
  const q = query(
    collection(db, 'ruleTables'),
    where('ownerId', '==', uid),
    orderBy('createdAt', 'desc'),
  )
  const snaps = await getDocs(q)
  return snaps.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function saveRuleTable(id, data) {
  await updateDoc(doc(db, 'ruleTables', id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteRuleTable(id) {
  await deleteDoc(doc(db, 'ruleTables', id))
}

// ── Lessons ────────────────────────────────────────────────────────

export async function createLesson(uid, name) {
  const ref = await addDoc(collection(db, 'lessons'), {
    ownerId: uid,
    name,
    description: '',
    parameterLocks: {},
    gradingCriteria: [],
    ruleTableId: null,
    modules: [],
    published: false,
    classCode: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function getLesson(id) {
  const snap = await getDoc(doc(db, 'lessons', id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function getUserLessons(uid) {
  const q = query(
    collection(db, 'lessons'),
    where('ownerId', '==', uid),
    orderBy('createdAt', 'desc'),
  )
  const snaps = await getDocs(q)
  return snaps.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function saveLesson(id, data) {
  await updateDoc(doc(db, 'lessons', id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteLesson(id) {
  await deleteDoc(doc(db, 'lessons', id))
}

export async function getLessonByClassCode(code) {
  const q = query(
    collection(db, 'lessons'),
    where('classCode', '==', code),
    where('published', '==', true),
  )
  const snaps = await getDocs(q)
  return snaps.docs[0] ? { id: snaps.docs[0].id, ...snaps.docs[0].data() } : null
}

// ── Attempts ───────────────────────────────────────────────────────

export async function createAttempt(uid, lessonId, data = {}) {
  const ref = await addDoc(collection(db, 'attempts'), {
    studentUid: uid,
    lessonId,
    modules: data.modules ?? [],
    submitted: false,
    score: null,
    ruleResults: null,
    submittedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function getAttempt(id) {
  const snap = await getDoc(doc(db, 'attempts', id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function saveAttempt(id, data) {
  await updateDoc(doc(db, 'attempts', id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function submitAttempt(id, { score, ruleResults }) {
  await updateDoc(doc(db, 'attempts', id), {
    submitted: true,
    score,
    ruleResults,
    submittedAt: serverTimestamp(),
  })
}

export async function getLessonAttempts(lessonId) {
  const q = query(
    collection(db, 'attempts'),
    where('lessonId', '==', lessonId),
    where('submitted', '==', true),
    orderBy('score', 'desc'),
  )
  const snaps = await getDocs(q)
  return snaps.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getStudentAttempts(uid) {
  const q = query(
    collection(db, 'attempts'),
    where('studentUid', '==', uid),
    orderBy('createdAt', 'desc'),
  )
  const snaps = await getDocs(q)
  return snaps.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// ── Media library (GLB uploads) ────────────────────────────────────

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
