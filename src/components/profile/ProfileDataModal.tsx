import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, X } from 'lucide-react'
import Modal from '../ui/Modal'
import ErrorAlert from '../ui/ErrorAlert'
import { useStore } from '../../lib/store'
import { cn } from '../../lib/utils'
import { Profile } from '../../lib/types'

// El grueso del público del Live es de México, así que un número sin prefijo internacional
// se asume mexicano. El CHECK de la base solo acepta E.164, de ahí la normalización.
const DEFAULT_COUNTRY_CODE = '52'
const E164 = /^\+[1-9]\d{7,14}$/

export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const hasCountryCode = trimmed.startsWith('+')
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return null

  const e164 = hasCountryCode ? `+${digits}` : `+${DEFAULT_COUNTRY_CODE}${digits}`
  return E164.test(e164) ? e164 : null
}

interface FormState {
  firstName: string
  lastName: string
  birthdate: string
  phone: string
  whatsappOptIn: boolean
}

function formFrom(profile: Profile): FormState {
  return {
    firstName: profile.first_name ?? '',
    lastName: profile.last_name ?? '',
    birthdate: profile.birthdate ?? '',
    phone: profile.phone ?? '',
    whatsappOptIn: profile.whatsapp_opt_in,
  }
}

export default function ProfileDataModal({
  open,
  profile,
  onClose,
  onSaved,
}: {
  open: boolean
  profile: Profile
  onClose: () => void
  onSaved: (pointsAwarded: number) => void
}) {
  const updateMyProfile = useStore(s => s.updateMyProfile)
  const [form, setForm] = useState<FormState>(() => formFrom(profile))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Al reabrir, volver a partir de lo guardado en vez de arrastrar una edición abandonada.
  useEffect(() => {
    if (open) {
      setForm(formFrom(profile))
      setError('')
    }
  }, [open, profile])

  const today = new Date().toISOString().slice(0, 10)

  const handleSave = async () => {
    setError('')

    const phone = form.phone.trim() ? normalizePhone(form.phone) : null
    if (form.phone.trim() && !phone) {
      setError('Revisa tu número. Escríbelo a 10 dígitos, o con lada internacional (ej. +52 55 1234 5678).')
      return
    }
    if (form.whatsappOptIn && !phone) {
      setError('Para recibir promociones por WhatsApp necesitas dejarnos tu número.')
      return
    }
    if (form.birthdate && form.birthdate >= today) {
      setError('Tu fecha de nacimiento no puede ser hoy ni una fecha futura.')
      return
    }

    setSaving(true)
    const result = await updateMyProfile({
      first_name: form.firstName.trim() || null,
      last_name: form.lastName.trim() || null,
      birthdate: form.birthdate || null,
      phone,
      whatsapp_opt_in: form.whatsappOptIn,
    })
    setSaving(false)

    if (!result.success) {
      const messages: Record<string, string> = {
        invalid_phone: 'Ese número no parece válido. Revísalo e intenta de nuevo.',
        invalid_birthdate: 'Esa fecha de nacimiento no es válida.',
        optin_without_phone: 'Para recibir promociones por WhatsApp necesitas dejarnos tu número.',
        not_authenticated: 'Tu sesión expiró. Vuelve a entrar.',
      }
      setError(messages[result.reason] ?? 'No pudimos guardar tus datos. Intenta de nuevo.')
      return
    }

    onSaved(result.pointsAwarded)
  }

  return (
    <Modal open={open} onClose={onClose} loading={saving} labelledBy="profile-data-title">
      <div className="relative bg-brand-papel w-full max-w-sm rounded-3xl border-2 border-brand-sombra shadow-sticker-lg p-6 flex flex-col gap-4 max-h-[85vh] overflow-y-auto animate-scale-in">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="profile-data-title" className="font-heading text-brand-sombra text-lg">Tus datos</h2>
            <p className="text-brand-gris text-xs font-body mt-1 leading-relaxed">
              Nos sirven para felicitarte en tu cumpleaños y avisarte de las promos.
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="profile-first-name" className="font-heading text-brand-sombra text-xs mb-1.5 block">
              Nombre
            </label>
            <input
              id="profile-first-name"
              type="text"
              value={form.firstName}
              onChange={e => { setForm(f => ({ ...f, firstName: e.target.value })); setError('') }}
              placeholder="Andrés"
              maxLength={60}
              className="field-input"
              autoComplete="given-name"
            />
          </div>
          <div>
            <label htmlFor="profile-last-name" className="font-heading text-brand-sombra text-xs mb-1.5 block">
              Apellido
            </label>
            <input
              id="profile-last-name"
              type="text"
              value={form.lastName}
              onChange={e => { setForm(f => ({ ...f, lastName: e.target.value })); setError('') }}
              placeholder="Argüelles"
              maxLength={60}
              className="field-input"
              autoComplete="family-name"
            />
          </div>
        </div>

        <div>
          <label htmlFor="profile-birthdate" className="font-heading text-brand-sombra text-xs mb-1.5 block">
            Fecha de nacimiento
          </label>
          <input
            id="profile-birthdate"
            type="date"
            value={form.birthdate}
            max={today}
            onChange={e => { setForm(f => ({ ...f, birthdate: e.target.value })); setError('') }}
            className="field-input"
            autoComplete="bday"
          />
          <p className="text-[11px] text-brand-gris font-body mt-1.5">
            Te tenemos una sorpresa ese día.
          </p>
        </div>

        <div>
          <label htmlFor="profile-phone" className="font-heading text-brand-sombra text-xs mb-1.5 block">
            WhatsApp
          </label>
          <input
            id="profile-phone"
            type="tel"
            inputMode="tel"
            value={form.phone}
            onChange={e => { setForm(f => ({ ...f, phone: e.target.value })); setError('') }}
            placeholder="55 1234 5678"
            maxLength={20}
            className="field-input"
            autoComplete="tel"
          />
        </div>

        {/* El consentimiento va explícito y con fecha: es lo que exige el aviso de privacidad. */}
        <label className="flex items-start gap-3 cursor-pointer">
          <div
            onClick={() => { setForm(f => ({ ...f, whatsappOptIn: !f.whatsappOptIn })); setError('') }}
            className={cn(
              'mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
              form.whatsappOptIn ? 'bg-brand-azul border-brand-sombra' : 'border-brand-sombra/30 hover:border-brand-azul'
            )}
          >
            {form.whatsappOptIn && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
          </div>
          <span className="text-xs text-brand-gris font-body leading-relaxed">
            Quiero recibir promociones de Helados Mados por WhatsApp. Puedo cancelarlo cuando quiera.
          </span>
        </label>

        {error && <ErrorAlert msg={error} />}

        <button
          onClick={handleSave}
          disabled={saving}
          className={cn('btn-fresa mt-1', saving && 'opacity-70 cursor-not-allowed')}
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </Modal>
  )
}
