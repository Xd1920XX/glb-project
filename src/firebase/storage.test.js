import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('firebase/storage', () => ({
  ref:                  vi.fn(),
  uploadBytesResumable: vi.fn(),
  getDownloadURL:       vi.fn(),
  deleteObject:         vi.fn(),
  listAll:              vi.fn(),
  getMetadata:          vi.fn(),
}))

vi.mock('./config.js', () => ({ db: {}, auth: {}, storage: {} }))

import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata,
} from 'firebase/storage'

import { uploadFile, listUserFiles, deleteFile } from './storage.js'

beforeEach(() => {
  vi.clearAllMocks()
  ref.mockReturnValue({ fullPath: 'users/uid1/file.jpg' })
})

// ── uploadFile ───────────────────────────────────────────────────────

describe('uploadFile', () => {
  function makeTask({ error = null, downloadUrl = 'https://cdn.example.com/file.jpg' } = {}) {
    const snapshot = { ref: { fullPath: 'users/uid1/file.jpg' } }
    const task = {
      snapshot,
      on: vi.fn((event, onProgress, onError, onComplete) => {
        // simulate progress then completion
        onProgress({ bytesTransferred: 50, totalBytes: 100 })
        if (error) {
          onError(error)
        } else {
          getDownloadURL.mockResolvedValue(downloadUrl)
          onComplete()
        }
      }),
    }
    return task
  }

  it('resolves with url and storagePath on success', async () => {
    const task = makeTask()
    uploadBytesResumable.mockReturnValue(task)

    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' })
    const result = await uploadFile('uid1', file, null)

    expect(result.url).toBe('https://cdn.example.com/file.jpg')
    expect(result.storagePath).toMatch(/^users\/uid1\/\d+_[a-z0-9]+\.jpg$/)
  })

  it('calls onProgress with percentage', async () => {
    const task = makeTask()
    uploadBytesResumable.mockReturnValue(task)

    const onProgress = vi.fn()
    const file = new File(['data'], 'photo.jpg')
    await uploadFile('uid1', file, onProgress)

    expect(onProgress).toHaveBeenCalledWith(50)
  })

  it('rejects when upload fails', async () => {
    const uploadError = new Error('network error')
    const task = makeTask({ error: uploadError })
    uploadBytesResumable.mockReturnValue(task)

    const file = new File(['data'], 'photo.jpg')
    await expect(uploadFile('uid1', file, null)).rejects.toThrow('network error')
  })

  it('stores original filename in custom metadata', async () => {
    const task = makeTask()
    uploadBytesResumable.mockReturnValue(task)

    const file = new File(['data'], 'my-image.png')
    await uploadFile('uid1', file, null)

    expect(uploadBytesResumable).toHaveBeenCalledWith(
      expect.anything(),
      file,
      { customMetadata: { originalName: 'my-image.png' } },
    )
  })

  it('uses the file extension in the storage path', async () => {
    const task = makeTask()
    uploadBytesResumable.mockReturnValue(task)

    const file = new File(['data'], 'model.glb')
    const result = await uploadFile('uid1', file, null)

    expect(result.storagePath).toMatch(/\.glb$/)
  })
})

// ── listUserFiles ────────────────────────────────────────────────────

describe('listUserFiles', () => {
  it('returns files sorted newest first', async () => {
    const item1 = { fullPath: 'users/uid1/old.jpg', name: 'ts_old.jpg' }
    const item2 = { fullPath: 'users/uid1/new.jpg', name: 'ts_new.jpg' }
    listAll.mockResolvedValue({ items: [item1, item2] })

    getMetadata
      .mockResolvedValueOnce({ customMetadata: { originalName: 'old.jpg' }, size: 100, contentType: 'image/jpeg', timeCreated: '2024-01-01T00:00:00Z' })
      .mockResolvedValueOnce({ customMetadata: { originalName: 'new.jpg' }, size: 200, contentType: 'image/jpeg', timeCreated: '2024-06-01T00:00:00Z' })

    getDownloadURL
      .mockResolvedValueOnce('https://cdn.example.com/old.jpg')
      .mockResolvedValueOnce('https://cdn.example.com/new.jpg')

    const result = await listUserFiles('uid1')

    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('new.jpg')
    expect(result[1].name).toBe('old.jpg')
  })

  it('uses item.name when customMetadata.originalName is missing', async () => {
    const item = { fullPath: 'users/uid1/x.jpg', name: 'x.jpg' }
    listAll.mockResolvedValue({ items: [item] })
    getMetadata.mockResolvedValue({ customMetadata: null, size: 50, contentType: 'image/jpeg', timeCreated: '2024-01-01T00:00:00Z' })
    getDownloadURL.mockResolvedValue('https://cdn.example.com/x.jpg')

    const result = await listUserFiles('uid1')
    expect(result[0].name).toBe('x.jpg')
  })

  it('filters out items that throw during metadata fetch', async () => {
    const good = { fullPath: 'users/uid1/good.jpg', name: 'good.jpg' }
    const bad  = { fullPath: 'users/uid1/bad.jpg',  name: 'bad.jpg'  }
    listAll.mockResolvedValue({ items: [good, bad] })

    getMetadata
      .mockResolvedValueOnce({ customMetadata: null, size: 50, contentType: 'image/jpeg', timeCreated: '2024-01-01T00:00:00Z' })
      .mockRejectedValueOnce(new Error('forbidden'))

    getDownloadURL.mockResolvedValue('https://cdn.example.com/good.jpg')

    const result = await listUserFiles('uid1')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('good.jpg')
  })

  it('returns empty array when there are no files', async () => {
    listAll.mockResolvedValue({ items: [] })
    const result = await listUserFiles('uid1')
    expect(result).toEqual([])
  })
})

// ── deleteFile ───────────────────────────────────────────────────────

describe('deleteFile', () => {
  it('calls deleteObject with the resolved ref', async () => {
    deleteObject.mockResolvedValue(undefined)
    await deleteFile('users/uid1/photo.jpg')
    expect(ref).toHaveBeenCalledWith({}, 'users/uid1/photo.jpg')
    expect(deleteObject).toHaveBeenCalled()
  })

  it('does not throw when the file is already gone', async () => {
    deleteObject.mockRejectedValue(new Error('object-not-found'))
    await expect(deleteFile('users/uid1/gone.jpg')).resolves.toBeUndefined()
  })
})
