import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { LogOut, User } from 'lucide-react'
import ConfirmDialog from '../ui/ConfirmDialog'

export default function AdminHeader({ title }: { title: string }) {
  const navigate = useNavigate()
  const logout = useStore(s => s.logout)
  const profile = useStore(s => s.profile)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/admin')
    setConfirmOpen(false)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-brand-azul/95 backdrop-blur-md border-b border-white/10">
      <div className="px-4 h-14 flex items-center justify-between gap-3">
        <span className="font-heading text-white uppercase truncate">{title}</span>

        {/* La navegación entre secciones vive en la barra inferior. */}
        <div className="flex items-center gap-3 shrink-0">
          {profile && (
            <span className="hidden sm:flex items-center gap-1.5 text-white/90 font-body text-sm min-w-0">
              <User className="w-4 h-4 shrink-0" />
              <span className="font-semibold truncate max-w-[8rem]">{profile.username}</span>
            </span>
          )}
          <button
            onClick={() => setConfirmOpen(true)}
            aria-label="Cerrar sesión"
            className="text-white/75 hover:text-brand-rosa transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        icon={<LogOut className="w-5 h-5 text-brand-rosa" />}
        title="¿Cerrar sesión?"
        description="Vas a salir del panel de administración."
        confirmLabel="Cerrar sesión"
        onConfirm={handleLogout}
        onCancel={() => setConfirmOpen(false)}
      />
    </header>
  )
}
