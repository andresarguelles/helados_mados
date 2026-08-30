import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import Home from './pages/Home'
import Login from './pages/Login'
import Redeem from './pages/Redeem'
import Account from './pages/Account'
import Terminos from './pages/Terminos'
import NotFound from './pages/NotFound'
import { useStore } from './lib/store'

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

function ProtectedAdmin({ children }: { children: React.ReactNode }) {
  const isAdmin = useStore(s => s.isAdmin)
  const authReady = useStore(s => s.authReady)
  if (!authReady) return null
  if (!isAdmin) return <Navigate to="/admin" replace />
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
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/canjear" element={<Redeem />} />
        <Route path="/cuenta" element={<Account />} />
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
    </BrowserRouter>
  )
}
