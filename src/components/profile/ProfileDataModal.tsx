import { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import Modal from '../ui/Modal'
import ErrorAlert from '../ui/ErrorAlert'
import Checkbox from '../ui/Checkbox'
import { useStore } from '../../lib/store'
import { cn } from '../../lib/utils'
import { normalizePhone, parsePhone, DEFAULT_COUNTRY } from '../../lib/phone'
import PhoneField from '../ui/PhoneField'
import { Profile } from '../../lib/types'
import { MESES, cumpleValido, diasDelMes } from '../../lib/cumple'

const capitalizar = (s: string) => s[0].toUpperCase() + s.slice(1)

interface FormState {
  firstName: string
  lastName: string
  /** Mes y día del cumpleaños como valor de `<select>`: '' es "sin dato". */
  birthdayMonth: string
  birthdayDay: string
  phone: string
  whatsappOptIn: boolean
}

function formFrom(profile: Profile): FormState {
  return {
    firstName: profile.first_name ?? '',
    lastName: profile.last_name ?? '',
    birthdayMonth: profile.birthday_month?.toString() ?? '',
    birthdayDay: profile.birthday_day?.toString() ?? '',
    // El campo trabaja solo con los dígitos nacionales, así que un número ya guardado (que está
    // en E.164) hay que partirlo para poder mostrarlo.
    phone: parsePhone(profile.phone)?.national ?? '',
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
  onSaved: () => void
}) {
  const updateMyProfile = useStore(s => s.updateMyProfile)
  const [form, setForm] = useState<FormState>(() => formFrom(profile))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Desde la 0040 el número es opcional y se cambia o se borra aquí mismo. Sin número no hay a
  // dónde mandar los mensajes, así que el permiso se apaga cuando el campo queda vacío (y no con
  // un número a medias: corregir un dígito no debería costarle el permiso a nadie).
  const sinNumero = form.phone.trim() === ''

  // Al reabrir, volver a partir de lo guardado en vez de arrastrar una edición abandonada.
  useEffect(() => {
    if (open) {
      setForm(formFrom(profile))
      setError('')
    }
  }, [open, profile])

  const handleSave = async () => {
    setError('')

    const phone = form.phone.trim() ? normalizePhone(form.phone) : null
    if (form.phone.trim() && !phone) {
      const faltan = DEFAULT_COUNTRY.nationalDigits - form.phone.length
      setError(
        faltan > 0
          ? `Tu WhatsApp debe tener ${DEFAULT_COUNTRY.nationalDigits} dígitos. Te ${faltan === 1 ? 'falta' : 'faltan'} ${faltan}.`
          : 'Ese número no parece de México. Revisa que empiece con tu lada (ej. 55, 33, 81).'
      )
      return
    }
    if (form.whatsappOptIn && !phone) {
      setError('Para recibir promociones por WhatsApp necesitas dejarnos tu número.')
      return
    }

    const mes = form.birthdayMonth ? Number(form.birthdayMonth) : null
    const dia = form.birthdayDay ? Number(form.birthdayDay) : null
    if ((mes === null) !== (dia === null)) {
      setError('Elige el día y el mes de tu cumpleaños, o deja los dos vacíos.')
      return
    }
    if (mes !== null && dia !== null && !cumpleValido(mes, dia)) {
      setError(`${capitalizar(MESES[mes - 1])} no tiene día ${dia}.`)
      return
    }

    setSaving(true)
    const result = await updateMyProfile({
      first_name: form.firstName.trim() || null,
      last_name: form.lastName.trim() || null,
      birthday_month: mes,
      birthday_day: dia,
      phone,
      whatsapp_opt_in: form.whatsappOptIn,
    })
    setSaving(false)

    if (!result.success) {
      const messages: Record<string, string> = {
        invalid_phone: 'Ese número no parece válido. Revísalo e intenta de nuevo.',
        invalid_birthday: 'Esa fecha de cumpleaños no es válida.',
        optin_without_phone: 'Para recibir promociones por WhatsApp necesitas dejarnos tu número.',
        phone_taken: 'Ese número ya está registrado en otra cuenta.',
        not_authenticated: 'Tu sesión expiró. Vuelve a entrar.',
      }
      setError(messages[result.reason] ?? 'No pudimos guardar tus datos. Intenta de nuevo.')
      return
    }

    onSaved()
  }

  // El selector de días se ajusta al mes elegido, pero sin borrar un día que ya no cabe (31 al
  // pasar a abril): ese caso lo señala la validación en vez de cambiarlo sin avisar.
  const diasEnLista = Math.max(diasDelMes(Number(form.birthdayMonth) || 1), Number(form.birthdayDay) || 0)

  return (
    <Modal open={open} onClose={onClose} loading={saving} labelledBy="profile-data-title">
      <div className="relative bg-brand-papel w-full max-w-sm rounded-3xl border-2 border-brand-sombra shadow-sticker-lg p-6 flex flex-col gap-4 max-h-[85vh] overflow-y-auto animate-scale-in">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="profile-data-title" className="font-heading text-brand-sombra text-lg">Tus datos</h2>
            <p className="text-brand-gris text-xs font-body mt-1 leading-relaxed">
              Nos sirven para felicitarte en tu cumpleaños y avisarte de las promos. Todo es
              opcional, y lo puedes cambiar o borrar cuando quieras.
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

        {/* Solo día y mes: el año no se pide (0040). */}
        <fieldset>
          <legend className="font-heading text-brand-sombra text-xs mb-1.5 block">Cumpleaños</legend>
          <div className="grid grid-cols-[5.5rem_1fr] gap-3">
            <select
              aria-label="Día de tu cumpleaños"
              value={form.birthdayDay}
              onChange={e => { setForm(f => ({ ...f, birthdayDay: e.target.value })); setError('') }}
              className="field-input"
            >
              <option value="">Día</option>
              {Array.from({ length: diasEnLista }, (_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}</option>
              ))}
            </select>
            <select
              aria-label="Mes de tu cumpleaños"
              value={form.birthdayMonth}
              onChange={e => { setForm(f => ({ ...f, birthdayMonth: e.target.value })); setError('') }}
              className="field-input"
            >
              <option value="">Mes</option>
              {MESES.map((nombre, i) => (
                <option key={nombre} value={i + 1}>{capitalizar(nombre)}</option>
              ))}
            </select>
          </div>
          <p className="text-[11px] text-brand-gris font-body mt-1.5">
            Sin el año. Te tenemos una sorpresa ese día.
          </p>
        </fieldset>

        <PhoneField
          id="profile-phone"
          label="WhatsApp"
          value={form.phone}
          onChange={value => {
            setForm(f => ({ ...f, phone: value, whatsappOptIn: value === '' ? false : f.whatsappOptIn }))
            setError('')
          }}
          hint="Opcional. Para borrarlo, deja el campo vacío."
        />

        {/* El consentimiento va explícito y con fecha: es lo que exige el aviso de privacidad. */}
        <Checkbox
          checked={form.whatsappOptIn}
          disabled={sinNumero}
          onChange={v => { setForm(f => ({ ...f, whatsappOptIn: v })); setError('') }}
        >
          Quiero recibir promociones de Helados Mados por WhatsApp. Puedo cancelarlo cuando quiera.
        </Checkbox>

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
