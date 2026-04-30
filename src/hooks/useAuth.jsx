import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase/config.js'
import { getUser } from '../firebase/db.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(undefined) // undefined = loading
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    let active = true
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const p = await getUser(firebaseUser.uid)
          if (!active) return
          setProfile(p)
          setUser(firebaseUser)
        } catch (err) {
          if (!active) return
          console.error('useAuth: getUser failed', err)
          setProfile(null)
          setUser(firebaseUser)
        }
      } else {
        if (!active) return
        setUser(null)
        setProfile(null)
      }
    })
    return () => { active = false; unsub() }
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, setProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
