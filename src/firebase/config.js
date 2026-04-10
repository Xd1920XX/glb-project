import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  // apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  // authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  // projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  // storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  // messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  // appId:             import.meta.env.VITE_FIREBASE_APP_ID,
    apiKey: "AIzaSyD7URS1u5yPXtH-5mA87MKW_wtmHzRtU6o",
    authDomain: "glb-revismo.firebaseapp.com",
    projectId: "glb-revismo",
    storageBucket: "glb-revismo.firebasestorage.app",
    messagingSenderId: "38491706738",
    appId: "1:38491706738:web:6c3ab9fdb37125c38739eb",
    measurementId: "G-JD651JCFRC"
}

const app = initializeApp(firebaseConfig)

export const auth    = getAuth(app)
export const db      = getFirestore(app)
export const storage = getStorage(app)
