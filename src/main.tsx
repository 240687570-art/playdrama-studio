import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App'
import './index.css'

// Lazy load page components for code splitting
// import { lazy, Suspense } from 'react'
// const StudioPage = lazy(() => import('./pages/Studio'))
// const LandingPage = lazy(() => import('./pages/Landing'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/studio/*" element={<App />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
)