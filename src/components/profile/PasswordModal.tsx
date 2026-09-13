import { useEffect, useState } from 'react'
import { Eye, EyeOff, Loader2, X } from 'lucide-react'
import Modal from '../ui/Modal'
import ErrorAlert from '../ui/ErrorAlert'
import { useStore } from '../../lib/store'
import { cn } from '../../lib/utils'

const MIN_LENGTH = 8

export default function PasswordModal({
  open,
  mode,
  loginHint,
  onClose,
  onSaved,
}: {
  open: boolean
  /** 'create' para quien nació con Google y aún no tiene contraseña. */
  mode: 'create' | 'change'
  /** Con qué va a entrar después: su correo (usuarios de Google) o su apodo (legacy). */
  loginHint: string
  onClose: () => void
  onSaved: () => void
}) {
  const setPassword = useStore(s => s.setPassword)
  const [password, setPasswordValue] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setPasswordValue('')
      setConfirm('')
      setShow(false)
      setError('')
    }
  }, [open])

  const handleSave = async () => {
    setError('')
    if (password.length < MIN_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_LENGTH} caracteres`)
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }

    setSaving(true)
    const result = await setPassword(password)
    setSaving(false)

    if (!result.success) {
      setError(result.reason === 'weak_password'
        ? 'Esa contraseña es muy débil. Prueba con una más larga.'
        : 'No pudimos guardar tu contraseña. Intenta de nuevo.')
      return
    }

    onSaved()
  }

  const title = mode === 'create' ? 'Crear contraseña' : 'Cambiar contraseña'

  return (
    <Modal open={open} onClose={onClose} loading={saving} labelledBy="password-modal-title">
      <div className="relative bg-brand-papel w-full max-w-sm rounded-3xl border-2 border-brand-sombra shadow-sticker-lg p-6 flex flex-col gap-4 max-h-[85vh] overflow-y-auto animate-scale-in">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="password-modal-title" className="font-heading text-brand-sombra text-lg">{title}</h2>
            <p className="text-brand-gris text-xs font-body mt-1 leading-relaxed">
              {mode === 'create'
                ? 'Para entrar desde cualquier dispositivo sin usar tu cuenta de Google.'
                : 'Vas a necesitarla la próxima vez que inicies sesión.'}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar"
            className="text-brand-gris hover:text-brand-sombra transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lo que más confunde de este flujo es con qué usuario se entra después. */}
        <div className="rounded-2xl bg-brand-azul/10 px-4 py-3">
          <p className="text-xs text-brand-sombra font-body leading-relaxed">
            Vas a entrar con <span className="font-bold break-all">{loginHint}</span> y esta contraseña.
          </p>
        </div>

        <div>
          <label htmlFor="password-new" className="font-heading text-brand-sombra text-xs mb-1.5 block">
            Nueva contraseña
            <span className="text-brand-gris font-body"> (mín. {MIN_LENGTH} caracteres)</span>
          </label>
          <div className="relative">
            <input
              id="password-new"
              type={show ? 'text' : 'password'}
              value={password}
              onChange={e => { setPasswordValue(e.target.value); setError('') }}
              placeholder="••••••••"
              className="field-input pr-10"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShow(s => !s)}
              aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gris hover:text-brand-sombra transition-colors"
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="password-confirm" className="font-heading text-brand-sombra text-xs mb-1.5 block">
            Confirma contraseña
          </label>
          <input
            id="password-confirm"
            type={show ? 'text' : 'password'}
            value={confirm}
            onChange={e => { setConfirm(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && !saving && handleSave()}
            placeholder="••••••••"
            className="field-input"
            autoComplete="new-password"
          />
        </div>

        {error && <ErrorAlert msg={error} />}

        <button
          onClick={handleSave}
          disabled={saving}
          className={cn('btn-fresa mt-1', saving && 'opacity-70 cursor-not-allowed')}
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? 'Guardando...' : title}
        </button>
      </div>
    </Modal>
  )
}
