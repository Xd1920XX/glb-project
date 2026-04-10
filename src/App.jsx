import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth.jsx'
import { ProtectedRoute } from './components/ProtectedRoute.jsx'

import Landing    from './pages/Landing.jsx'
import Login      from './pages/Login.jsx'
import Signup     from './pages/Signup.jsx'
import Dashboard  from './pages/Dashboard.jsx'
import Builder    from './pages/Builder.jsx'
import Billing    from './pages/Billing.jsx'
import EmbedView  from './pages/EmbedView.jsx'
import Contact    from './pages/Contact.jsx'
import SaunaDemo  from './SaunaDemo.jsx'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/"               element={<Landing />} />
        <Route path="/login"          element={<Login />} />
        <Route path="/signup"         element={<Signup />} />
        <Route path="/demo"           element={<SaunaDemo />} />
        <Route path="/contact"        element={<Contact />} />
        <Route path="/embed/:id"      element={<EmbedView />} />
        <Route path="/dashboard"      element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/builder/:id"    element={<ProtectedRoute><Builder /></ProtectedRoute>} />
        <Route path="/billing"        element={<ProtectedRoute><Billing /></ProtectedRoute>} />
        <Route path="*"               element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
