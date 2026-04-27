import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth.jsx'
import { ProtectedRoute } from './components/ProtectedRoute.jsx'
import { CookieBanner } from './components/CookieBanner.jsx'

import Landing        from './pages/Landing.jsx'
import Login          from './pages/Login.jsx'
import Signup         from './pages/Signup.jsx'
import Dashboard      from './pages/Dashboard.jsx'
import Builder        from './pages/Builder.jsx'
import Billing        from './pages/Billing.jsx'
import Media          from './pages/Media.jsx'
import Orders         from './pages/Orders.jsx'
import EmbedView      from './pages/EmbedView.jsx'
import Contact        from './pages/Contact.jsx'
import SaunaDemo      from './SaunaDemo.jsx'
import LandingPages   from './pages/LandingPages.jsx'
import LandingBuilder from './pages/LandingBuilder.jsx'
import LandingView    from './pages/LandingView.jsx'
import PrivacyPolicy  from './pages/PrivacyPolicy.jsx'
import TermsOfService from './pages/TermsOfService.jsx'
import CookiePolicy   from './pages/CookiePolicy.jsx'
import Admin          from './pages/Admin.jsx'
import GlbModels      from './pages/GlbModels.jsx'
import WhatIsGlb      from './pages/WhatIsGlb.jsx'
import Team           from './pages/Team.jsx'
import JoinTeam       from './pages/JoinTeam.jsx'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/"               element={<Landing />} />
        <Route path="/login"          element={<Login />} />
        <Route path="/signup"         element={<Signup />} />
        <Route path="/demo"           element={<SaunaDemo />} />
        <Route path="/contact"        element={<Contact />} />
        <Route path="/glb-models"     element={<GlbModels />} />
        <Route path="/what-is-glb"    element={<WhatIsGlb />} />
        <Route path="/privacy"        element={<PrivacyPolicy />} />
        <Route path="/terms"          element={<TermsOfService />} />
        <Route path="/cookies"        element={<CookiePolicy />} />
        <Route path="/embed/:id"        element={<EmbedView />} />
        <Route path="/lp/:id"           element={<LandingView />} />
        <Route path="/dashboard"        element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/builder/:id"      element={<ProtectedRoute><Builder /></ProtectedRoute>} />
        <Route path="/billing"          element={<ProtectedRoute><Billing /></ProtectedRoute>} />
        <Route path="/media"            element={<ProtectedRoute><Media /></ProtectedRoute>} />
        <Route path="/orders"           element={<ProtectedRoute><Orders /></ProtectedRoute>} />
        <Route path="/landing-pages"    element={<ProtectedRoute><LandingPages /></ProtectedRoute>} />
        <Route path="/landing/:id"      element={<ProtectedRoute><LandingBuilder /></ProtectedRoute>} />
        <Route path="/admin"            element={<ProtectedRoute><Admin /></ProtectedRoute>} />
        <Route path="/team"             element={<ProtectedRoute><Team /></ProtectedRoute>} />
        <Route path="/join/:code"       element={<JoinTeam />} />
        <Route path="*"               element={<Navigate to="/" replace />} />
      </Routes>
      <CookieBanner />
    </AuthProvider>
  )
}
