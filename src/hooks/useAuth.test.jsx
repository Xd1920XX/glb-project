import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(),
}))

vi.mock('../firebase/config.js', () => ({ auth: {}, db: {}, storage: {} }))
vi.mock('../firebase/db.js', () => ({ getUser: vi.fn() }))

import { onAuthStateChanged } from 'firebase/auth'
import { getUser } from '../firebase/db.js'
import { AuthProvider, useAuth } from './useAuth.jsx'

// Simple consumer component
function Consumer() {
  const { user, profile } = useAuth()
  if (user === undefined) return <div>loading</div>
  if (user === null) return <div>signed-out</div>
  return <div>uid:{user.uid} plan:{profile?.subscriptionStatus}</div>
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AuthProvider / useAuth', () => {
  it('renders loading state while auth is resolving', () => {
    // onAuthStateChanged never fires — simulates pending state
    onAuthStateChanged.mockReturnValue(() => {})

    render(<AuthProvider><Consumer /></AuthProvider>)
    expect(screen.getByText('loading')).toBeInTheDocument()
  })

  it('sets user to null when Firebase reports signed-out', async () => {
    onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb(null)
      return () => {}
    })

    await act(async () => {
      render(<AuthProvider><Consumer /></AuthProvider>)
    })

    expect(screen.getByText('signed-out')).toBeInTheDocument()
  })

  it('sets user and profile when Firebase reports a signed-in user', async () => {
    const firebaseUser = { uid: 'uid1' }
    getUser.mockResolvedValue({ subscriptionStatus: 'active', planId: 'pro' })

    onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb(firebaseUser)
      return () => {}
    })

    await act(async () => {
      render(<AuthProvider><Consumer /></AuthProvider>)
    })

    expect(screen.getByText('uid:uid1 plan:active')).toBeInTheDocument()
    expect(getUser).toHaveBeenCalledWith('uid1')
  })

  it('calls the unsubscribe function returned by onAuthStateChanged on unmount', () => {
    const unsubscribe = vi.fn()
    onAuthStateChanged.mockReturnValue(unsubscribe)

    const { unmount } = render(<AuthProvider><Consumer /></AuthProvider>)
    unmount()

    expect(unsubscribe).toHaveBeenCalledOnce()
  })
})
