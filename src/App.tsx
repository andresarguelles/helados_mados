import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import Home from './pages/Home'
import Login from './pages/Login'
import Redeem from './pages/Redeem'
import AuthCallback from './pages/AuthCallback'
import Bienvenida from './pages/Bienvenida'
import Perfil from './pages/Perfil'
import Cupones from './pages/Cupones'
import Ranking from './pages/Ranking'
import Misiones from './pages/Misiones'
import Terminos from './pages/Terminos'
import NotFound from './pages/NotFound'
import BottomNav from './components/layout/BottomNav'
import { useStore } from './lib/store'
import { trackPageview } from './lib/analytics'

const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminScanner = lazy(() => import('./pages/admin/AdminScanner'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'))

function AdminFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-azul">
      <Loader2 className="w-8 h-8 animate-spin text-white" />
    </div>
  )
}

function RouteTracker() {
  const location = useLocation()

  useEffect(() => {
    trackPageview(location.pathname + location.search)
  }, [location.pathname, location.search])

  return null
}

function ProtectedAdmin({ children }: { children: React.ReactNode }) {
  const isAdmin = useStore(s => s.isAdmin)
  const authReady = useStore(s => s.authReady)
  if (!authReady) return null
  if (!isAdmin) return <Navigate to="/admin" replace />
  return <>{children}</>
}

function ProtectedMember({ children }: { children: React.ReactNode }) {
  const profile = useStore(s => s.profile)
  const authReady = useStore(s => s.authReady)
  if (!authReady) return null
  if (!profile) return <Navigate to="/login" replace />
  // Un registro con Google a medias no tiene apodo, y el apodo es la identidad pública del ranking.
  if (!profile.username) return <Navigate to="/bienvenida" replace />
  return <>{children}</>
}

export default function App() {
  const initAuth = useStore(s => s.initAuth)

  useEffect(() => {
    const unsubscribe = initAuth()
    return unsubscribe
  }, [initAuth])

  return (
    <BrowserRouter>
      <RouteTracker />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/canjear" element={<Redeem />} />
        {/* Aterrizaje del redirect de Google (login y vinculación). */}
        <Route path="/auth/callback" element={<AuthCallback />} />
        {/* Fuera de ProtectedMember a propósito: es justo donde se elige el apodo que falta. */}
        <Route path="/bienvenida" element={<Bienvenida />} />
        <Route path="/perfil" element={<ProtectedMember><Perfil /></ProtectedMember>} />
        <Route path="/cupones" element={<ProtectedMember><Cupones /></ProtectedMember>} />
        <Route path="/ranking" element={<ProtectedMember><Ranking /></ProtectedMember>} />
        <Route path="/misiones" element={<ProtectedMember><Misiones /></ProtectedMember>} />
        {/* Ruta histórica: /cuenta se dividió en /perfil y /cupones */}
        <Route path="/cuenta" element={<Navigate to="/perfil" replace />} />
        <Route path="/terminos" element={<Terminos />} />
        <Route path="/admin" element={
          <Suspense fallback={<AdminFallback />}><AdminLogin /></Suspense>
        } />
        <Route path="/admin/dashboard" element={
          <Suspense fallback={<AdminFallback />}>
            <ProtectedAdmin><AdminDashboard /></ProtectedAdmin>
          </Suspense>
        } />
        <Route path="/admin/scanner" element={
          <Suspense fallback={<AdminFallback />}>
            <ProtectedAdmin><AdminScanner /></ProtectedAdmin>
          </Suspense>
        } />
        <Route path="/admin/users" element={
          <Suspense fallback={<AdminFallback />}>
            <ProtectedAdmin><AdminUsers /></ProtectedAdmin>
          </Suspense>
        } />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNav />
    </BrowserRouter>
  )
}
