import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth.jsx'
import { ProtectedRoute } from './components/ProtectedRoute.jsx'

import Login        from './pages/Login.jsx'
import Signup       from './pages/Signup.jsx'
import Dashboard    from './pages/Dashboard.jsx'
import LessonBuilder from './pages/LessonBuilder.jsx'
import AttemptView  from './pages/AttemptView.jsx'
import JoinClass    from './pages/JoinClass.jsx'
import Leaderboard  from './pages/Leaderboard.jsx'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/"            element={<Navigate to="/dashboard" replace />} />
        <Route path="/login"       element={<Login />} />
        <Route path="/signup"      element={<Signup />} />
        <Route path="/join"        element={<JoinClass />} />

        <Route path="/dashboard"             element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/lesson/:id"            element={<ProtectedRoute><LessonBuilder /></ProtectedRoute>} />
        <Route path="/lesson/:lessonId/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
        <Route path="/attempt/:lessonId"     element={<ProtectedRoute><AttemptView /></ProtectedRoute>} />
        <Route path="/attempt/:lessonId/:attemptId" element={<ProtectedRoute><AttemptView /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
