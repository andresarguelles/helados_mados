import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { Shield, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'

export default function AdminLogin() {
  const { login } = useStore()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setError('')
    if (!username || !password) { setError('Completa todos los campos'); return }

    setLoading(true)

    const result = await login(username.trim(), password)
    setLoading(false)

    if (!result.success || !result.user.is_admin) {
      setError('Credenciales incorrectas o acceso no autorizado.')
      return
    }

    navigate('/admin/dashboard')
  }

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

        {/* Form */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-3xl p-6 flex flex-col gap-4">
          <div>
            <label className="font-heading text-white/85 text-xs mb-1.5 block">Usuario</label>
            <input
              id="admin-username"
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); setError('') }}
              placeholder="admin"
              className="field-input-dark"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="font-heading text-white/85 text-xs mb-1.5 block">Contraseña</label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••"
                className="field-input-dark pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(s => !s)}
                aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/75 hover:text-white transition-colors"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-300 font-body">{error}</p>
            </div>
          )}

          <button
            id="admin-login-btn"
            onClick={handleLogin}
            disabled={loading}
            className="btn-fresa mt-1 shadow-sticker-white hover:shadow-sticker-lg"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            {loading ? 'Verificando...' : 'Acceder'}
          </button>
        </div>

        <p className="text-center text-white/70 text-xs font-body">
          Acceso restringido al personal autorizado
        </p>
      </div>
    </div>
  )
}
