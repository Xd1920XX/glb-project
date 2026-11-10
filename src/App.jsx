import { BrowserRouter, Routes, Route } from 'react-router-dom'
import SaunaLanding     from './pages/SaunaLanding.jsx'
import SaunaConfigurator from './pages/SaunaConfigurator.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                   element={<SaunaLanding      lang="is" />} />
        <Route path="/configure"          element={<SaunaConfigurator lang="is" />} />
        <Route path="/configure/:modelId" element={<SaunaConfigurator lang="is" />} />
      </Routes>
    </BrowserRouter>
  )
}
