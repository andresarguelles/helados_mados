import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import GoogleButton from '../../components/auth/GoogleButton'
import { Shield, AlertCircle, LogOut } from 'lucide-react'

/**
 * El panel también se entra con Google: no hay otro acceso desde el 2026-09-30. Quién es admin lo
 * decide `profiles.is_admin`, no el botón, y la frontera real son el RLS y el `is_admin()` de las RPC.
 */
export default function AdminLogin() {
  const navigate = useNavigate()
  const authReady = useStore(s => s.authReady)
  const profile = useStore(s => s.profile)
  const isAdmin = useStore(s => s.isAdmin)
  const logout = useStore(s => s.logout)

  useEffect(() => {
    if (authReady && profile && isAdmin) navigate('/admin/dashboard', { replace: true })
  }, [authReady, profile, isAdmin, navigate])

  // Con sesión y sin permiso: decirlo, en vez de volver a ofrecer un botón que daría lo mismo.
  const sinPermiso = authReady && profile && !isAdmin

  return (
    <div className="min-h-screen bg-brand-azul bg-dots-azul flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col gap-8 animate-slide-up">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3 text-center">
          <img src="/mados-logo-full.svg" alt="Helados Mados" className="h-10 w-auto" />
          <p className="text-white/85 text-sm font-body flex items-center gap-1.5 justify-center">
            <Shield className="w-3.5 h-3.5" />
            Panel de administración
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-3xl p-6 flex flex-col gap-4">
          {sinPermiso ? (
            <>
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-300 font-body">
                  La cuenta {profile.username ?? profile.email} no tiene acceso al panel.
                </p>
              </div>
              <button
                onClick={() => { void logout() }}
                className="btn-fresa mt-1 shadow-sticker-white hover:shadow-sticker-lg"
              >
                <LogOut className="w-4 h-4" />
                Salir y usar otra cuenta
              </button>
            </>
          ) : (
            <GoogleButton next="/admin/dashboard" label="Entrar con Google" />
          )}
        </div>

        <p className="text-center text-white/70 text-xs font-body">
          Acceso restringido al personal autorizado
        </p>
      </div>
    </div>
  )
}
