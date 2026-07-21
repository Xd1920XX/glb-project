import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('firebase/firestore', () => ({
  collection:      vi.fn(),
  doc:             vi.fn(),
  addDoc:          vi.fn(),
  getDoc:          vi.fn(),
  getDocs:         vi.fn(),
  updateDoc:       vi.fn(),
  deleteDoc:       vi.fn(),
  query:           vi.fn((...args) => args),
  where:           vi.fn((...args) => args),
  orderBy:         vi.fn((...args) => args),
  serverTimestamp: vi.fn(() => 'SERVER_TS'),
}))

vi.mock('./config.js', () => ({ db: {}, auth: {}, storage: {} }))

import {
  collection, doc, addDoc, getDoc, getDocs,
  updateDoc, deleteDoc,
} from 'firebase/firestore'

import {
  getUser, updateUser,
  createRuleTable, getRuleTable, saveRuleTable, deleteRuleTable,
  createLesson, getLesson, saveLesson, deleteLesson, getLessonByClassCode,
  createAttempt, submitAttempt, getLessonAttempts, getStudentAttempts,
  addMediaFile, getUserMedia, deleteMediaFile,
} from './db.js'

const MOCK_DOC_REF = { id: 'mockRef' }
const MOCK_COLL_REF = { id: 'mockColl' }

function makeSnap(exists, id, data) {
  return { exists: () => exists, id, data: () => data }
}

function makeDocsSnap(rows) {
  return {
    size: rows.length,
    docs: rows.map(([id, data]) => ({ id, data: () => data })),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  doc.mockReturnValue(MOCK_DOC_REF)
  collection.mockReturnValue(MOCK_COLL_REF)
})

// ── Users ───────────────────────────────────────────────────────────

describe('getUser', () => {
  it('returns user data when document exists', async () => {
    getDoc.mockResolvedValue(makeSnap(true, 'uid1', { name: 'Alice' }))
    expect(await getUser('uid1')).toEqual({ id: 'uid1', name: 'Alice' })
  })

  it('returns null when document does not exist', async () => {
    getDoc.mockResolvedValue(makeSnap(false, 'uid1', null))
    expect(await getUser('uid1')).toBeNull()
  })
})

describe('updateUser', () => {
  it('calls updateDoc with user data', async () => {
    updateDoc.mockResolvedValue(undefined)
    await updateUser('uid1', { name: 'Bob' })
    expect(updateDoc).toHaveBeenCalledWith(MOCK_DOC_REF, { name: 'Bob' })
  })
})

// ── Rule tables ─────────────────────────────────────────────────────

describe('createRuleTable', () => {
  it('adds a rule table doc', async () => {
    addDoc.mockResolvedValue({ id: 'rt1' })
    const id = await createRuleTable('uid1', 'Walls', [{ param: 'height' }])
    expect(id).toBe('rt1')
    expect(addDoc).toHaveBeenCalledWith(
      MOCK_COLL_REF,
      expect.objectContaining({ ownerId: 'uid1', name: 'Walls', rules: [{ param: 'height' }] }),
    )
  })
})

describe('getRuleTable / saveRuleTable / deleteRuleTable', () => {
  it('gets, saves, deletes correctly', async () => {
    getDoc.mockResolvedValue(makeSnap(true, 'rt1', { name: 'X' }))
    expect(await getRuleTable('rt1')).toEqual({ id: 'rt1', name: 'X' })
    updateDoc.mockResolvedValue(undefined)
    await saveRuleTable('rt1', { name: 'Y' })
    expect(updateDoc).toHaveBeenCalledWith(
      MOCK_DOC_REF,
      expect.objectContaining({ name: 'Y', updatedAt: 'SERVER_TS' }),
    )
    deleteDoc.mockResolvedValue(undefined)
    await deleteRuleTable('rt1')
    expect(deleteDoc).toHaveBeenCalledWith(MOCK_DOC_REF)
  })
})

// ── Lessons ─────────────────────────────────────────────────────────

describe('createLesson', () => {
  it('adds a lesson doc with defaults', async () => {
    addDoc.mockResolvedValue({ id: 'l1' })
    const id = await createLesson('uid1', 'Lesson 1')
    expect(id).toBe('l1')
    expect(addDoc).toHaveBeenCalledWith(
      MOCK_COLL_REF,
      expect.objectContaining({
        ownerId: 'uid1',
        name: 'Lesson 1',
        parameterLocks: {},
        gradingCriteria: [],
        modules: [],
        published: false,
      }),
    )
  })
})

describe('getLesson / saveLesson / deleteLesson', () => {
  it('gets, saves, deletes correctly', async () => {
    getDoc.mockResolvedValue(makeSnap(true, 'l1', { name: 'L' }))
    expect(await getLesson('l1')).toEqual({ id: 'l1', name: 'L' })
    updateDoc.mockResolvedValue(undefined)
    await saveLesson('l1', { name: 'L2' })
    expect(updateDoc).toHaveBeenCalledWith(
      MOCK_DOC_REF,
      expect.objectContaining({ name: 'L2', updatedAt: 'SERVER_TS' }),
    )
    deleteDoc.mockResolvedValue(undefined)
    await deleteLesson('l1')
    expect(deleteDoc).toHaveBeenCalledWith(MOCK_DOC_REF)
  })
})

describe('getLessonByClassCode', () => {
  it('returns first published lesson matching code', async () => {
    getDocs.mockResolvedValue(makeDocsSnap([['l1', { classCode: 'ABC', published: true }]]))
    const result = await getLessonByClassCode('ABC')
    expect(result).toEqual({ id: 'l1', classCode: 'ABC', published: true })
  })

  it('returns null when no match', async () => {
    getDocs.mockResolvedValue(makeDocsSnap([]))
    expect(await getLessonByClassCode('XYZ')).toBeNull()
  })
})

// ── Attempts ────────────────────────────────────────────────────────

describe('createAttempt', () => {
  it('adds attempt with submitted=false and null score', async () => {
    addDoc.mockResolvedValue({ id: 'a1' })
    const id = await createAttempt('uid1', 'l1', { modules: [{ id: 'm1' }] })
    expect(id).toBe('a1')
    expect(addDoc).toHaveBeenCalledWith(
      MOCK_COLL_REF,
      expect.objectContaining({
        studentUid: 'uid1', lessonId: 'l1',
        modules: [{ id: 'm1' }], submitted: false, score: null,
      }),
    )
  })
})

describe('submitAttempt', () => {
  it('marks attempt as submitted with score + ruleResults', async () => {
    updateDoc.mockResolvedValue(undefined)
    await submitAttempt('a1', { score: 85, ruleResults: { wallHeight: 'pass' } })
    expect(updateDoc).toHaveBeenCalledWith(
      MOCK_DOC_REF,
      expect.objectContaining({
        submitted: true, score: 85, ruleResults: { wallHeight: 'pass' }, submittedAt: 'SERVER_TS',
      }),
    )
  })
})

describe('getLessonAttempts / getStudentAttempts', () => {
  it('returns mapped attempts', async () => {
    getDocs.mockResolvedValue(makeDocsSnap([['a1', { score: 90 }]]))
    expect(await getLessonAttempts('l1')).toEqual([{ id: 'a1', score: 90 }])
    expect(await getStudentAttempts('uid1')).toEqual([{ id: 'a1', score: 90 }])
  })
})

// ── Media ───────────────────────────────────────────────────────────

describe('addMediaFile / getUserMedia / deleteMediaFile', () => {
  it('handles media library CRUD', async () => {
    addDoc.mockResolvedValue({ id: 'm1' })
    const id = await addMediaFile('uid1', {
      name: 'wall.glb', url: 'http://x', storagePath: 'users/uid1/wall.glb',
      size: 512, contentType: 'model/gltf-binary',
    })
    expect(id).toBe('m1')

    getDocs.mockResolvedValue(makeDocsSnap([['m1', { name: 'wall.glb' }]]))
    expect(await getUserMedia('uid1')).toEqual([{ id: 'm1', name: 'wall.glb' }])

    deleteDoc.mockResolvedValue(undefined)
    await deleteMediaFile('m1')
    expect(deleteDoc).toHaveBeenCalledWith(MOCK_DOC_REF)
  })
})
