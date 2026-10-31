import { BrowserRouter, Routes, Route } from 'react-router-dom'
import SaunaLanding     from './pages/SaunaLanding.jsx'
import SaunaConfigurator from './pages/SaunaConfigurator.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                       element={<SaunaLanding      lang="en" />} />
        <Route path="/configure"              element={<SaunaConfigurator lang="en" />} />
        <Route path="/configure/:modelId"     element={<SaunaConfigurator lang="en" />} />

        <Route path="/et"                     element={<SaunaLanding      lang="et" />} />
        <Route path="/et/configure"           element={<SaunaConfigurator lang="et" />} />
        <Route path="/et/configure/:modelId"  element={<SaunaConfigurator lang="et" />} />
      </Routes>
    </BrowserRouter>
  )
}
