import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from './config.js'

/**
 * Upload a file with progress callback.
 * Returns { url, storagePath }
 */
export function uploadFile(uid, file, onProgress) {
  return new Promise((resolve, reject) => {
    const ext  = file.name.split('.').pop()
    const path = `users/${uid}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const storageRef = ref(storage, path)
    const task = uploadBytesResumable(storageRef, file)

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

export async function deleteFile(storagePath) {
  try {
    await deleteObject(ref(storage, storagePath))
  } catch {
    // file may already be gone
  }
}
