import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword:     vi.fn(),
  signOut:                        vi.fn(),
  updateProfile:                  vi.fn(),
  GoogleAuthProvider:             vi.fn().mockImplementation(() => ({})),
  signInWithPopup:                vi.fn(),
  browserLocalPersistence:        'local',
  setPersistence:                 vi.fn().mockResolvedValue(undefined),
}))

vi.mock('firebase/firestore', () => ({
  doc:             vi.fn(),
  setDoc:          vi.fn(),
  getDoc:          vi.fn(),
  serverTimestamp: vi.fn(() => 'SERVER_TS'),
}))

vi.mock('./config.js', () => ({ db: {}, auth: {}, storage: {} }))

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  signInWithPopup,
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { signUp, signIn, signInWithGoogle, logOut } from './auth.js'

const MOCK_DOC_REF = { id: 'mockRef' }

beforeEach(() => {
  vi.clearAllMocks()
  doc.mockReturnValue(MOCK_DOC_REF)
})

describe('signUp', () => {
  it('creates a user, updates profile, and writes Firestore doc', async () => {
    const fakeUser = { uid: 'uid1' }
    createUserWithEmailAndPassword.mockResolvedValue({ user: fakeUser })
    updateProfile.mockResolvedValue(undefined)
    setDoc.mockResolvedValue(undefined)

    const user = await signUp('Alice', 'alice@example.com', 'password123')

    expect(user).toBe(fakeUser)
    expect(updateProfile).toHaveBeenCalledWith(fakeUser, { displayName: 'Alice' })
    expect(setDoc).toHaveBeenCalledWith(
      MOCK_DOC_REF,
      expect.objectContaining({
        name: 'Alice',
        email: 'alice@example.com',
        subscriptionStatus: 'trial',
        paypalSubscriptionId: null,
      }),
    )
  })
})

describe('signIn', () => {
  it('calls signInWithEmailAndPassword and returns the user', async () => {
    const fakeUser = { uid: 'uid2' }
    signInWithEmailAndPassword.mockResolvedValue({ user: fakeUser })

    const user = await signIn('alice@example.com', 'password123')

    expect(user).toBe(fakeUser)
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      {},
      'alice@example.com',
      'password123',
    )
  })
})

describe('signInWithGoogle', () => {
  it('creates a Firestore profile for a new Google user', async () => {
    const fakeUser = { uid: 'uid3', displayName: 'Bob', email: 'bob@example.com' }
    signInWithPopup.mockResolvedValue({ user: fakeUser })
    getDoc.mockResolvedValue({ exists: () => false })
    setDoc.mockResolvedValue(undefined)

    const user = await signInWithGoogle()

    expect(user).toBe(fakeUser)
    expect(setDoc).toHaveBeenCalledWith(
      MOCK_DOC_REF,
      expect.objectContaining({
        name: 'Bob',
        email: 'bob@example.com',
        subscriptionStatus: 'trial',
      }),
    )
  })

  it('does not create a Firestore profile for an existing Google user', async () => {
    const fakeUser = { uid: 'uid4', displayName: 'Carol', email: 'carol@example.com' }
    signInWithPopup.mockResolvedValue({ user: fakeUser })
    getDoc.mockResolvedValue({ exists: () => true })
    setDoc.mockResolvedValue(undefined)

    await signInWithGoogle()

    expect(setDoc).not.toHaveBeenCalled()
  })

  it('uses empty string for displayName when not set', async () => {
    const fakeUser = { uid: 'uid5', displayName: null, email: 'noname@example.com' }
    signInWithPopup.mockResolvedValue({ user: fakeUser })
    getDoc.mockResolvedValue({ exists: () => false })
    setDoc.mockResolvedValue(undefined)

    await signInWithGoogle()

    const payload = setDoc.mock.calls[0][1]
    expect(payload.name).toBe('')
  })
})

describe('logOut', () => {
  it('calls Firebase signOut', async () => {
    signOut.mockResolvedValue(undefined)
    await logOut()
    expect(signOut).toHaveBeenCalledWith({})
  })
})
