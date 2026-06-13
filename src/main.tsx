import { createRoot } from "react-dom/client"
import { HashRouter, Routes, Route, Navigate } from "react-router-dom"
import LandingPage from "./pages/Landing"
import StudioApp from "./components/StudioAppShell"
import CanvasPage from "./pages/Canvas"
import { ThemeProvider } from "./hooks/useTheme"
import "./index.css"
import "./libtv-stage2.css"

if (!window.location.hash && /^\/studio(?:\/|$)/.test(window.location.pathname)) {
  const studioPath = window.location.pathname.replace(/^\/studio\/?/, "").replace(/\/$/, "")
  const studioHash = studioPath ? `#/studio/${studioPath}` : "#/studio"
  window.history.replaceState({}, "", `/${window.location.search}${studioHash}`)
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/canvas" element={<CanvasPage />} />
        <Route path="/studio/*" element={<StudioApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  </ThemeProvider>,
)
