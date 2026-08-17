import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { cn } from '../../lib/utils'
import { IceCream2, Shield, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'

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
    await new Promise(r => setTimeout(r, 500))

    const user = login(username.trim(), password)
    setLoading(false)

    if (!user || !user.is_admin) {
      setError('Credenciales incorrectas o acceso no autorizado.')
      return
    }

    navigate('/admin/dashboard')
  }

  return (
    <div className="min-h-screen bg-brand-navy flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col gap-8 animate-slide-up">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-16 h-16 bg-brand-coral rounded-3xl flex items-center justify-center shadow-xl shadow-brand-coral/40">
            <IceCream2 className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="font-heading font-black text-white text-2xl">
              Helados<span className="text-brand-coral">Mados</span>
            </h1>
            <p className="text-white/50 text-sm font-body flex items-center gap-1.5 justify-center mt-1">
              <Shield className="w-3.5 h-3.5" />
              Panel de Administración
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-3xl p-6 flex flex-col gap-4">
          <div>
            <label className="font-heading font-bold text-white/70 text-xs mb-1.5 block">Usuario</label>
            <input
              id="admin-username"
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); setError('') }}
              placeholder="admin"
              className={cn(
                'w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3',
                'font-body text-white placeholder:text-white/30',
                'focus:outline-none focus:border-brand-coral focus:ring-2 focus:ring-brand-coral/20 transition-all'
              )}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="font-heading font-bold text-white/70 text-xs mb-1.5 block">Contraseña</label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••"
                className={cn(
                  'w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 pr-10',
                  'font-body text-white placeholder:text-white/30',
                  'focus:outline-none focus:border-brand-coral focus:ring-2 focus:ring-brand-coral/20 transition-all'
                )}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
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
            className="btn-coral flex items-center justify-center gap-2 mt-1"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            {loading ? 'Verificando...' : 'Acceder'}
          </button>
        </div>

        <p className="text-center text-white/20 text-xs font-body">
          Acceso restringido al personal autorizado
        </p>
      </div>
    </div>
  )
}
