import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Redeem from './pages/Redeem'
import Account from './pages/Account'
import Terminos from './pages/Terminos'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminScanner from './pages/admin/AdminScanner'
import { useStore } from './lib/store'

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
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={
          <ProtectedAdmin><AdminDashboard /></ProtectedAdmin>
        } />
        <Route path="/admin/scanner" element={
          <ProtectedAdmin><AdminScanner /></ProtectedAdmin>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
