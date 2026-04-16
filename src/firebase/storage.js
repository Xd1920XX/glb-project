import { ref, uploadBytesResumable, getDownloadURL, deleteObject, listAll, getMetadata } from 'firebase/storage'
import { storage } from './config.js'

/**
 * Upload a file with progress callback.
 * Stores original filename in custom metadata so it can be recovered later.
 * Returns { url, storagePath }
 */
export function uploadFile(uid, file, onProgress) {
  return new Promise((resolve, reject) => {
    const ext  = file.name.split('.').pop()
    const path = `users/${uid}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const storageRef = ref(storage, path)
    const task = uploadBytesResumable(storageRef, file, {
      customMetadata: { originalName: file.name },
    })

    task.on(
      'state_changed',
      (snap) => onProgress && onProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref)
        resolve({ url, storagePath: path })
      },
    )
  })
}

/**
 * List all files uploaded by a user, newest first.
 * Works for files uploaded at any point — reads directly from Firebase Storage.
 */
export async function listUserFiles(uid) {
  const listRef = ref(storage, `users/${uid}`)
  const { items } = await listAll(listRef)
  const results = await Promise.all(
    items.map(async (item) => {
      try {
        const [meta, url] = await Promise.all([getMetadata(item), getDownloadURL(item)])
        return {
          storagePath: item.fullPath,
          name: meta.customMetadata?.originalName || item.name,
          url,
          size: meta.size,
          contentType: meta.contentType || '',
          createdAt: meta.timeCreated,   // ISO string
        }
      } catch {
        return null
      }
    })
  )
  return results
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export async function deleteFile(storagePath) {
  try {
    await deleteObject(ref(storage, storagePath))
  } catch {
    // file may already be gone
  }
}
