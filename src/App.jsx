import { BrowserRouter, Routes, Route } from 'react-router-dom'
import SaunaLanding     from './pages/SaunaLanding.jsx'
import SaunaConfigurator from './pages/SaunaConfigurator.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<SaunaLanding />} />
        <Route path="/configure" element={<SaunaConfigurator />} />
      </Routes>
    </BrowserRouter>
  )
}
