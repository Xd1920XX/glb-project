import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute.jsx'

// useAuth is mocked per-test via vi.mocked reassignment
vi.mock('../hooks/useAuth.jsx', () => ({ useAuth: vi.fn() }))
vi.mock('../config/plans.js', () => ({ isTrialExpired: vi.fn(() => false) }))

import { useAuth } from '../hooks/useAuth.jsx'
import { isTrialExpired } from '../config/plans.js'

function renderRoute(path = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login"    element={<div>Login page</div>} />
        <Route path="/billing"  element={<div>Billing page</div>} />
        <Route path="/dashboard" element={
          <ProtectedRoute><div>Dashboard</div></ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute><div>Admin</div></ProtectedRoute>
        } />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  it('shows loading indicator while auth state is undetermined', () => {
    useAuth.mockReturnValue({ user: undefined, profile: null })
    renderRoute()
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('redirects to /login when user is null (signed out)', () => {
    useAuth.mockReturnValue({ user: null, profile: null })
    renderRoute()
    expect(screen.getByText('Login page')).toBeInTheDocument()
  })

  it('renders children when user is authenticated and trial is valid', () => {
    useAuth.mockReturnValue({ user: { uid: 'uid1' }, profile: { subscriptionStatus: 'trial' } })
    isTrialExpired.mockReturnValue(false)
    renderRoute()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('redirects to /billing when trial has expired and route is not exempt', () => {
    useAuth.mockReturnValue({ user: { uid: 'uid1' }, profile: { subscriptionStatus: 'trial' } })
    isTrialExpired.mockReturnValue(true)
    renderRoute('/dashboard')
    expect(screen.getByText('Billing page')).toBeInTheDocument()
  })

  it('allows expired trial users to access /billing', () => {
    useAuth.mockReturnValue({ user: { uid: 'uid1' }, profile: { subscriptionStatus: 'trial' } })
    isTrialExpired.mockReturnValue(true)
    render(
      <MemoryRouter initialEntries={['/billing']}>
        <Routes>
          <Route path="/billing" element={
            <ProtectedRoute><div>Billing page</div></ProtectedRoute>
          } />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Billing page')).toBeInTheDocument()
  })

  it('allows expired trial users to access /admin', () => {
    useAuth.mockReturnValue({ user: { uid: 'uid1' }, profile: { subscriptionStatus: 'trial' } })
    isTrialExpired.mockReturnValue(true)
    renderRoute('/admin')
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('renders children for active subscription users', () => {
    useAuth.mockReturnValue({ user: { uid: 'uid1' }, profile: { subscriptionStatus: 'active', planId: 'pro' } })
    isTrialExpired.mockReturnValue(false)
    renderRoute()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })
})
