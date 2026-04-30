import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock Firebase SDK ───────────────────────────────────────────────
vi.mock('firebase/firestore', () => ({
  collection:      vi.fn(),
  doc:             vi.fn(),
  addDoc:          vi.fn(),
  getDoc:          vi.fn(),
  getDocs:         vi.fn(),
  setDoc:          vi.fn(),
  updateDoc:       vi.fn(),
  deleteDoc:       vi.fn(),
  query:           vi.fn((...args) => args),
  where:           vi.fn((...args) => args),
  orderBy:         vi.fn((...args) => args),
  serverTimestamp: vi.fn(() => 'SERVER_TS'),
  increment:       vi.fn((n) => ({ _increment: n })),
}))

vi.mock('./config.js', () => ({ db: {}, auth: {}, storage: {} }))

import {
  collection, doc, addDoc, getDoc, getDocs,
  setDoc, updateDoc, deleteDoc,
} from 'firebase/firestore'

import {
  getUser,
  updateUser,
  createConfigurator,
  getConfigurator,
  saveConfigurator,
  publishConfigurator,
  deleteConfigurator,
  getPublishedCount,
  duplicateConfigurator,
  addMediaFile,
  getUserMedia,
  deleteMediaFile,
  trackView,
  getAnalyticsBatch,
  saveOrder,
  getUserOrders,
  createLandingPage,
  getLandingPage,
  saveLandingPage,
  deleteLandingPage,
  publishLandingPage,
  getPublishedLandingPageCount,
  createTeamInvite,
  getTeamInviteByCode,
  acceptTeamInvite,
  getTeamMembers,
  revokeTeamInvite,
  saveRevision,
  getRevisions,
  getPublishedConfigurator,
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
    const result = await getUser('uid1')
    expect(result).toEqual({ id: 'uid1', name: 'Alice' })
    expect(doc).toHaveBeenCalledWith({}, 'users', 'uid1')
  })

  it('returns null when document does not exist', async () => {
    getDoc.mockResolvedValue(makeSnap(false, 'uid1', null))
    const result = await getUser('uid1')
    expect(result).toBeNull()
  })
})

describe('updateUser', () => {
  it('calls updateDoc with the user doc reference and data', async () => {
    updateDoc.mockResolvedValue(undefined)
    await updateUser('uid1', { name: 'Bob' })
    expect(doc).toHaveBeenCalledWith({}, 'users', 'uid1')
    expect(updateDoc).toHaveBeenCalledWith(MOCK_DOC_REF, { name: 'Bob' })
  })
})

// ── Configurators ───────────────────────────────────────────────────

describe('createConfigurator', () => {
  it('calls addDoc and returns the new document id', async () => {
    addDoc.mockResolvedValue({ id: 'cfg123' })
    const id = await createConfigurator('uid1', 'My Configurator')
    expect(id).toBe('cfg123')
    expect(addDoc).toHaveBeenCalledWith(
      MOCK_COLL_REF,
      expect.objectContaining({
        ownerId: 'uid1',
        name: 'My Configurator',
        published: false,
        variants: [],
        interiors: [],
      }),
    )
  })
})

describe('getConfigurator', () => {
  it('returns configurator when it exists', async () => {
    getDoc.mockResolvedValue(makeSnap(true, 'cfg1', { name: 'Test' }))
    const result = await getConfigurator('cfg1')
    expect(result).toEqual({ id: 'cfg1', name: 'Test' })
  })

  it('returns null when it does not exist', async () => {
    getDoc.mockResolvedValue(makeSnap(false, 'cfg1', null))
    expect(await getConfigurator('cfg1')).toBeNull()
  })
})

describe('saveConfigurator', () => {
  it('calls updateDoc with data + updatedAt timestamp', async () => {
    updateDoc.mockResolvedValue(undefined)
    await saveConfigurator('cfg1', { name: 'Updated' })
    expect(updateDoc).toHaveBeenCalledWith(
      MOCK_DOC_REF,
      expect.objectContaining({ name: 'Updated', updatedAt: 'SERVER_TS' }),
    )
  })
})

describe('publishConfigurator', () => {
  it('updates published flag and updatedAt', async () => {
    updateDoc.mockResolvedValue(undefined)
    await publishConfigurator('cfg1', true)
    expect(updateDoc).toHaveBeenCalledWith(
      MOCK_DOC_REF,
      { published: true, updatedAt: 'SERVER_TS' },
    )
  })
})

describe('deleteConfigurator', () => {
  it('calls deleteDoc with the correct doc ref', async () => {
    deleteDoc.mockResolvedValue(undefined)
    await deleteConfigurator('cfg1')
    expect(deleteDoc).toHaveBeenCalledWith(MOCK_DOC_REF)
    expect(doc).toHaveBeenCalledWith({}, 'configurators', 'cfg1')
  })
})

describe('getPublishedCount', () => {
  it('returns the number of published configurators', async () => {
    getDocs.mockResolvedValue(makeDocsSnap([['c1', {}], ['c2', {}]]))
    const count = await getPublishedCount('uid1')
    expect(count).toBe(2)
  })
})

describe('duplicateConfigurator', () => {
  it('creates a copy without id/createdAt/updatedAt and appends (Copy)', async () => {
    addDoc.mockResolvedValue({ id: 'copy1' })
    const source = { id: 'cfg1', name: 'Original', published: true, createdAt: 'ts', updatedAt: 'ts', variants: [] }
    const newId = await duplicateConfigurator('uid1', source)
    expect(newId).toBe('copy1')
    expect(addDoc).toHaveBeenCalledWith(
      MOCK_COLL_REF,
      expect.objectContaining({
        name: 'Original (Copy)',
        published: false,
        ownerId: 'uid1',
      }),
    )
    // original id/timestamps must not be forwarded
    const payload = addDoc.mock.calls[0][1]
    expect(payload).not.toHaveProperty('id')
  })
})

// ── Media ───────────────────────────────────────────────────────────

describe('addMediaFile', () => {
  it('calls addDoc and returns new id', async () => {
    addDoc.mockResolvedValue({ id: 'media1' })
    const id = await addMediaFile('uid1', {
      name: 'photo.jpg', url: 'http://example.com', storagePath: 'users/uid1/x.jpg', size: 1024, contentType: 'image/jpeg',
    })
    expect(id).toBe('media1')
    expect(addDoc).toHaveBeenCalledWith(
      MOCK_COLL_REF,
      expect.objectContaining({ ownerId: 'uid1', name: 'photo.jpg' }),
    )
  })
})

describe('getUserMedia', () => {
  it('returns mapped media docs', async () => {
    getDocs.mockResolvedValue(makeDocsSnap([['m1', { name: 'a.jpg' }]]))
    const result = await getUserMedia('uid1')
    expect(result).toEqual([{ id: 'm1', name: 'a.jpg' }])
  })
})

describe('deleteMediaFile', () => {
  it('calls deleteDoc', async () => {
    deleteDoc.mockResolvedValue(undefined)
    await deleteMediaFile('media1')
    expect(deleteDoc).toHaveBeenCalledWith(MOCK_DOC_REF)
  })
})

// ── Analytics ───────────────────────────────────────────────────────

describe('trackView', () => {
  it('increments views via updateDoc', async () => {
    updateDoc.mockResolvedValue(undefined)
    await trackView('cfg1')
    expect(updateDoc).toHaveBeenCalledWith(
      MOCK_DOC_REF,
      { views: { _increment: 1 } },
    )
  })

  it('falls back to setDoc when updateDoc throws', async () => {
    updateDoc.mockRejectedValue(new Error('no document'))
    setDoc.mockResolvedValue(undefined)
    await trackView('cfg1')
    expect(setDoc).toHaveBeenCalledWith(MOCK_DOC_REF, { views: 1 })
  })
})

describe('getAnalyticsBatch', () => {
  it('returns empty object for empty ids array', async () => {
    const result = await getAnalyticsBatch([])
    expect(result).toEqual({})
    expect(getDoc).not.toHaveBeenCalled()
  })

  it('returns view counts keyed by configurator id', async () => {
    getDoc
      .mockResolvedValueOnce(makeSnap(true, 'cfg1', { views: 42 }))
      .mockResolvedValueOnce(makeSnap(false, 'cfg2', null))
    const result = await getAnalyticsBatch(['cfg1', 'cfg2'])
    expect(result.cfg1).toEqual({ views: 42 })
    expect(result.cfg2).toEqual({ views: 0 })
  })
})

// ── Orders ──────────────────────────────────────────────────────────

describe('saveOrder', () => {
  it('calls addDoc with the correct shape', async () => {
    addDoc.mockResolvedValue({ id: 'order1' })
    await saveOrder('cfg1', 'uid1', {
      variantId: 'v1', interiorId: null, formData: { name: 'Bob' }, configuratorName: 'My Config',
    })
    expect(addDoc).toHaveBeenCalledWith(
      MOCK_COLL_REF,
      expect.objectContaining({
        configuratorId: 'cfg1',
        ownerId: 'uid1',
        variantId: 'v1',
        formData: { name: 'Bob' },
      }),
    )
  })

  it('stores null for undefined variantId / interiorId', async () => {
    addDoc.mockResolvedValue({ id: 'order2' })
    await saveOrder('cfg1', 'uid1', { formData: {} })
    const payload = addDoc.mock.calls[0][1]
    expect(payload.variantId).toBeNull()
    expect(payload.interiorId).toBeNull()
  })
})

describe('getUserOrders', () => {
  it('returns mapped order docs', async () => {
    getDocs.mockResolvedValue(makeDocsSnap([['o1', { configuratorId: 'cfg1' }]]))
    const result = await getUserOrders('uid1')
    expect(result).toEqual([{ id: 'o1', configuratorId: 'cfg1' }])
  })
})

// ── Landing pages ───────────────────────────────────────────────────

describe('createLandingPage', () => {
  it('calls addDoc with defaults and returns id', async () => {
    addDoc.mockResolvedValue({ id: 'lp1' })
    const id = await createLandingPage('uid1', 'My Landing Page')
    expect(id).toBe('lp1')
    expect(addDoc).toHaveBeenCalledWith(
      MOCK_COLL_REF,
      expect.objectContaining({ ownerId: 'uid1', name: 'My Landing Page', published: false }),
    )
  })
})

describe('getLandingPage', () => {
  it('returns landing page when it exists', async () => {
    getDoc.mockResolvedValue(makeSnap(true, 'lp1', { name: 'LP' }))
    expect(await getLandingPage('lp1')).toEqual({ id: 'lp1', name: 'LP' })
  })

  it('returns null when it does not exist', async () => {
    getDoc.mockResolvedValue(makeSnap(false, 'lp1', null))
    expect(await getLandingPage('lp1')).toBeNull()
  })
})

describe('saveLandingPage', () => {
  it('calls updateDoc with data + updatedAt', async () => {
    updateDoc.mockResolvedValue(undefined)
    await saveLandingPage('lp1', { name: 'Updated' })
    expect(updateDoc).toHaveBeenCalledWith(
      MOCK_DOC_REF,
      expect.objectContaining({ name: 'Updated', updatedAt: 'SERVER_TS' }),
    )
  })
})

describe('deleteLandingPage', () => {
  it('calls deleteDoc', async () => {
    deleteDoc.mockResolvedValue(undefined)
    await deleteLandingPage('lp1')
    expect(deleteDoc).toHaveBeenCalledWith(MOCK_DOC_REF)
  })
})

describe('publishLandingPage', () => {
  it('updates published flag', async () => {
    updateDoc.mockResolvedValue(undefined)
    await publishLandingPage('lp1', true)
    expect(updateDoc).toHaveBeenCalledWith(
      MOCK_DOC_REF,
      { published: true, updatedAt: 'SERVER_TS' },
    )
  })
})

describe('getPublishedLandingPageCount', () => {
  it('returns count of published landing pages', async () => {
    getDocs.mockResolvedValue(makeDocsSnap([['lp1', {}]]))
    expect(await getPublishedLandingPageCount('uid1')).toBe(1)
  })
})

// ── Team invites ─────────────────────────────────────────────────────

describe('createTeamInvite', () => {
  it('calls setDoc with the invite shape', async () => {
    setDoc.mockResolvedValue(undefined)
    await createTeamInvite('owner1', 'owner@x.com', 'member@x.com', 'code123')
    expect(setDoc).toHaveBeenCalledWith(
      MOCK_DOC_REF,
      expect.objectContaining({
        ownerUid: 'owner1',
        ownerEmail: 'owner@x.com',
        inviteeEmail: 'member@x.com',
        code: 'code123',
        status: 'pending',
        memberUid: null,
      }),
    )
  })
})

describe('getTeamInviteByCode', () => {
  it('returns invite data when it exists', async () => {
    getDoc.mockResolvedValue(makeSnap(true, 'code123', { ownerUid: 'owner1' }))
    expect(await getTeamInviteByCode('code123')).toEqual({ ownerUid: 'owner1' })
  })

  it('returns null when invite does not exist', async () => {
    getDoc.mockResolvedValue(makeSnap(false, 'code123', null))
    expect(await getTeamInviteByCode('code123')).toBeNull()
  })
})

describe('acceptTeamInvite', () => {
  it('updates status to accepted and sets memberUid', async () => {
    updateDoc.mockResolvedValue(undefined)
    await acceptTeamInvite('code123', 'member1')
    expect(updateDoc).toHaveBeenCalledWith(
      MOCK_DOC_REF,
      { status: 'accepted', memberUid: 'member1' },
    )
  })
})

describe('revokeTeamInvite', () => {
  it('updates status to revoked', async () => {
    updateDoc.mockResolvedValue(undefined)
    await revokeTeamInvite('code123')
    expect(updateDoc).toHaveBeenCalledWith(MOCK_DOC_REF, { status: 'revoked' })
  })
})

describe('getTeamMembers', () => {
  it('returns invite docs with code from document id', async () => {
    getDocs.mockResolvedValue({
      size: 1,
      docs: [{ id: 'code123', data: () => ({ ownerUid: 'owner1', status: 'accepted' }) }],
    })
    const result = await getTeamMembers('owner1')
    expect(result).toEqual([{ ownerUid: 'owner1', status: 'accepted', code: 'code123' }])
  })
})

// ── Revisions ────────────────────────────────────────────────────────

describe('getRevisions', () => {
  it('returns revisions sorted by savedAt descending', async () => {
    const older = { toMillis: () => 1000 }
    const newer = { toMillis: () => 2000 }
    getDocs.mockResolvedValue({
      size: 2,
      docs: [
        { id: 'r1', data: () => ({ savedAt: older, name: 'Old' }) },
        { id: 'r2', data: () => ({ savedAt: newer, name: 'New' }) },
      ],
    })
    const result = await getRevisions('cfg1', 'uid1')
    expect(result[0].id).toBe('r2')
    expect(result[1].id).toBe('r1')
  })
})

describe('saveRevision', () => {
  it('calls addDoc with revision shape', async () => {
    addDoc.mockResolvedValue({ id: 'rev1' })
    getDocs.mockResolvedValue(makeDocsSnap([['r1', {}]]))
    const data = { name: 'My Config', variants: [1, 2] }
    await saveRevision('cfg1', 'uid1', data)
    expect(addDoc).toHaveBeenCalledWith(
      MOCK_COLL_REF,
      expect.objectContaining({
        configuratorId: 'cfg1',
        ownerId: 'uid1',
        name: 'My Config',
        variantCount: 2,
        data,
      }),
    )
  })
})

// ── Public embed ─────────────────────────────────────────────────────

describe('getPublishedConfigurator', () => {
  it('returns null when configurator does not exist', async () => {
    getDoc.mockResolvedValue(makeSnap(false, 'cfg1', null))
    expect(await getPublishedConfigurator('cfg1')).toBeNull()
  })

  it('returns null when configurator is not published', async () => {
    getDoc.mockResolvedValue(makeSnap(true, 'cfg1', { published: false, ownerId: 'uid1' }))
    expect(await getPublishedConfigurator('cfg1')).toBeNull()
  })

  it('returns cfg when owner is on active subscription', async () => {
    getDoc
      .mockResolvedValueOnce(makeSnap(true, 'cfg1', { published: true, ownerId: 'uid1' }))
      .mockResolvedValueOnce(makeSnap(true, 'uid1', { subscriptionStatus: 'active' }))
    const result = await getPublishedConfigurator('cfg1')
    expect(result).toMatchObject({ id: 'cfg1', published: true })
  })

  it('returns null when owner subscription is not active or trial', async () => {
    getDoc
      .mockResolvedValueOnce(makeSnap(true, 'cfg1', { published: true, ownerId: 'uid1' }))
      .mockResolvedValueOnce(makeSnap(true, 'uid1', { subscriptionStatus: 'cancelled' }))
    expect(await getPublishedConfigurator('cfg1')).toBeNull()
  })

  it('returns cfg when owner doc is unreadable (unauthenticated visitor)', async () => {
    getDoc
      .mockResolvedValueOnce(makeSnap(true, 'cfg1', { published: true, ownerId: 'uid1' }))
      .mockRejectedValueOnce(new Error('permission-denied'))
    const result = await getPublishedConfigurator('cfg1')
    expect(result).toMatchObject({ published: true })
  })
})
