import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import { useBottomNavVisible } from '../components/layout/BottomNav'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import ErrorAlert from '../components/ui/ErrorAlert'
import ProfileDataModal from '../components/profile/ProfileDataModal'
import PasswordModal from '../components/profile/PasswordModal'
import { useStore } from '../lib/store'
import { cn } from '../lib/utils'
import { Coupon, Profile } from '../lib/types'
import { formatPhone } from '../lib/phone'
import {
  Star, Zap, Ticket, Medal, LogOut, Pencil, Mail, KeyRound,
  Link2, Link2Off, Check, Sparkles,
} from 'lucide-react'

/** Los cuatro datos que el usuario escribe a mano; el correo llega por Google aparte. */
function completionOf(profile: Profile): { done: number; total: number } {
  const fields = [profile.first_name, profile.last_name, profile.birthdate, profile.phone]
  return { done: fields.filter(Boolean).length, total: fields.length }
}

function formatBirthdate(value: string): string {
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

export default function Perfil() {
  const navigate = useNavigate()
  const location = useLocation()
  const profile = useStore(s => s.profile)
  const logout = useStore(s => s.logout)
  const getUserCoupons = useStore(s => s.getUserCoupons)
  const linkGoogle = useStore(s => s.linkGoogle)
  const unlinkGoogle = useStore(s => s.unlinkGoogle)
  const isGoogleLinked = useStore(s => s.isGoogleLinked)
  const googleEmail = useStore(s => s.googleEmail)
  const loginIdentifier = useStore(s => s.loginIdentifier)
  const hasPassword = useStore(s => s.hasPassword)
  const navVisible = useBottomNavVisible()

  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [unlinkOpen, setUnlinkOpen] = useState(false)
  const [dataOpen, setDataOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [linkError, setLinkError] = useState('')
  // Puntos recién ganados, ya sea al volver de vincular Google o al guardar los datos.
  const [awarded, setAwarded] = useState<number>(
    (location.state as { pointsAwarded?: number } | null)?.pointsAwarded ?? 0
  )
  // Solo true en el aterrizaje inmediato de una vinculación, para poder celebrarla.
  const [justLinked, setJustLinked] = useState<boolean>(
    (location.state as { linked?: boolean } | null)?.linked === true
  )

  useEffect(() => {
    if (profile) getUserCoupons(profile.id).then(setCoupons)
  }, [profile, getUserCoupons])

  // El aviso es de un solo uso: si no, reaparece en cada recarga con el mismo history state.
  useEffect(() => {
    const state = location.state as { pointsAwarded?: number; linked?: boolean } | null
    if (state?.pointsAwarded || state?.linked) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.state, location.pathname, navigate])

  if (!profile) return null

  const activeCount = coupons.filter(c => c.status === 'active').length
  const redeemedCount = coupons.filter(c => c.status === 'redeemed').length
  const { done, total } = completionOf(profile)
  const profileComplete = done === total
  const linked = isGoogleLinked()
  const linkedEmail = googleEmail() ?? profile.email

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const handleLink = async () => {
    setLinkError('')
    const result = await linkGoogle()
    // En el camino feliz el navegador ya se fue a Google.
    if (!result.success) {
      setLinkError(result.reason === 'already_linked'
        ? 'Esa cuenta de Google ya está vinculada a otro cadete.'
        : 'No pudimos conectar con Google. Intenta de nuevo.')
    }
  }

  const handleUnlink = async () => {
    setLinkError('')
    const result = await unlinkGoogle()
    setUnlinkOpen(false)
    if (!result.success) {
      setLinkError(result.reason === 'needs_password'
        ? 'Primero crea una contraseña: si no, te quedarías sin ninguna forma de entrar.'
        : 'No pudimos desvincular tu cuenta de Google.')
    }
  }

  return (
    <div className={cn('min-h-screen flex flex-col bg-brand-papel', navVisible && 'pb-24')}>
      <Navbar />

      {/* Cabecera */}
      <div className="bg-brand-azul bg-dots-azul pt-24 pb-12 px-4">
        <div className="max-w-lg mx-auto flex flex-col items-center text-center gap-4">
          <div>
            <h1 className="font-heading text-white text-2xl">{profile.username}</h1>
            <p className="text-white/85 text-sm font-body">Cadete Mados</p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-2xl px-6 py-3">
            <Star className="w-5 h-5 text-brand-verde fill-brand-verde" />
            <span className="font-heading text-brand-verde text-3xl">{profile.total_points}</span>
            <span className="font-body text-white/90 text-sm">puntos totales</span>
          </div>
        </div>

        <div className="scallop-divider mt-10 -mb-12" />
      </div>

      <div className="flex-1 px-4 pt-6 pb-6 max-w-lg mx-auto w-full flex flex-col gap-6">

        {(awarded > 0 || justLinked) && (
          <div className="flex items-center gap-3 rounded-3xl border-2 border-brand-verde bg-brand-verde/15 px-4 py-3 animate-scale-in">
            <Sparkles className="w-5 h-5 text-brand-sombra shrink-0" />
            <p className="font-body text-sm text-brand-sombra">
              {justLinked && '¡Vinculaste tu cuenta de Google! '}
              {awarded > 0 && (
                <>Ganaste <span className="font-heading">+{awarded} puntos</span>.</>
              )}
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="paper-card rounded-3xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-azul/10 rounded-2xl flex items-center justify-center text-brand-azul shrink-0">
              <Ticket className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-heading text-brand-sombra text-xl leading-none">{activeCount}</p>
              <p className="font-body text-brand-gris text-xs mt-1">Cupones activos</p>
            </div>
          </div>

          <div className="paper-card rounded-3xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-amarillo/25 rounded-2xl flex items-center justify-center text-brand-sombra shrink-0">
              <Medal className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-heading text-brand-sombra text-xl leading-none">{redeemedCount}</p>
              <p className="font-body text-brand-gris text-xs mt-1">Medallas canjeadas</p>
            </div>
          </div>
        </div>

        {/* Datos personales */}
        <div className="paper-card rounded-3xl p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-heading text-brand-sombra text-lg">
                {profileComplete ? 'Tus datos' : 'Completa tu perfil'}
              </h2>
              <p className="font-body text-brand-gris text-xs mt-1 leading-relaxed">
                {profileComplete
                  ? 'Ya tenemos todo para felicitarte en tu cumpleaños.'
                  : profile.profile_bonus_awarded
                  ? 'Completa tus datos para no perderte las promos.'
                  : 'Completa tus datos y gana +5 puntos, una sola vez.'}
              </p>
            </div>
            {profileComplete && (
              <button
                onClick={() => setDataOpen(true)}
                aria-label="Editar tus datos"
                className="text-brand-gris hover:text-brand-sombra transition-colors shrink-0"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>

          {!profileComplete && (
            <div className="flex flex-col gap-1.5">
              <div className="h-2 rounded-full bg-brand-sombra/10 overflow-hidden">
                <div
                  className="h-full bg-brand-azul rounded-full transition-all duration-500"
                  style={{ width: `${(done / total) * 100}%` }}
                />
              </div>
              <p className="font-body text-brand-gris text-[11px]">{done} de {total} datos</p>
            </div>
          )}

          {profileComplete && (
            <dl className="flex flex-col gap-2 text-sm font-body">
              <div className="flex justify-between gap-3">
                <dt className="text-brand-gris">Nombre</dt>
                <dd className="text-brand-sombra text-right">{profile.first_name} {profile.last_name}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-brand-gris">Cumpleaños</dt>
                <dd className="text-brand-sombra text-right">{formatBirthdate(profile.birthdate!)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-brand-gris">WhatsApp</dt>
                <dd className="text-brand-sombra text-right">{formatPhone(profile.phone)}</dd>
              </div>
            </dl>
          )}

          {/*
            El correo nunca se escribe a mano: solo llega verificado desde Google. Por eso aquí
            es de solo lectura, y si falta, el camino es vincular Google.
          */}
          <div className="flex items-center gap-3 rounded-2xl bg-brand-sombra/5 px-4 py-3">
            <Mail className="w-4 h-4 text-brand-gris shrink-0" />
            {profile.email ? (
              <div className="min-w-0">
                <p className="font-body text-sm text-brand-sombra truncate">{profile.email}</p>
                <p className="font-body text-[11px] text-brand-gris">Verificado por Google</p>
              </div>
            ) : (
              <p className="font-body text-xs text-brand-gris leading-relaxed">
                Vincula Google para agregar tu correo y poder recuperar tu contraseña.
              </p>
            )}
          </div>

          {!profileComplete && (
            <button onClick={() => setDataOpen(true)} className="btn-fresa">
              <Pencil className="w-4 h-4" />
              Agregar información
            </button>
          )}
        </div>

        {/* Google */}
        <div className="paper-card rounded-3xl p-5 flex flex-col gap-4">
          <div>
            <h2 className="font-heading text-brand-sombra text-lg">Cuenta de Google</h2>
            <p className="font-body text-brand-gris text-xs mt-1 leading-relaxed">
              {linked
                ? 'Puedes entrar con Google o con tu contraseña de siempre.'
                : profile.google_bonus_awarded
                ? 'Vincula tu cuenta para entrar con un toque.'
                : 'Vincula tu cuenta para entrar con un toque y gana +5 puntos.'}
            </p>
          </div>

          {linked ? (
            <>
              <div className="flex items-center gap-3 rounded-2xl bg-brand-verde/15 px-4 py-3">
                <Check className="w-4 h-4 text-brand-sombra shrink-0" />
                <div className="min-w-0">
                  <p className="font-heading text-brand-sombra text-xs uppercase tracking-wide">Vinculado</p>
                  {linkedEmail && (
                    <p className="font-body text-xs text-brand-gris truncate">{linkedEmail}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setUnlinkOpen(true)}
                className="self-start inline-flex items-center gap-2 font-heading text-[11px] uppercase tracking-wide text-brand-gris hover:text-brand-rosa transition-colors"
              >
                <Link2Off className="w-3.5 h-3.5" />
                Desvincular
              </button>
            </>
          ) : (
            <button onClick={handleLink} className="btn-fresa">
              <Link2 className="w-4 h-4" />
              Vincular con Google
            </button>
          )}

          {linkError && <ErrorAlert msg={linkError} />}
        </div>

        {/* Contraseña */}
        <div className="paper-card rounded-3xl p-5 flex flex-col gap-4">
          <div>
            <h2 className="font-heading text-brand-sombra text-lg">
              {hasPassword ? 'Contraseña' : 'Crear contraseña'}
            </h2>
            <p className="font-body text-brand-gris text-xs mt-1 leading-relaxed">
              {hasPassword
                ? 'Puedes cambiarla cuando quieras.'
                : 'Te sirve para entrar desde cualquier dispositivo sin usar tu cuenta de Google.'}
            </p>
          </div>
          <button
            onClick={() => setPasswordOpen(true)}
            className={cn(hasPassword ? 'btn-tinta' : 'btn-fresa')}
          >
            <KeyRound className="w-4 h-4" />
            {hasPassword ? 'Cambiar contraseña' : 'Crear contraseña'}
          </button>
        </div>

        {/* Cómo sumar más puntos */}
        <div className="paper-card rounded-3xl p-5 flex flex-col gap-4">
          <div>
            <h2 className="font-heading text-brand-sombra text-lg">Suma más puntos</h2>
            <p className="font-body text-brand-gris text-xs mt-1 leading-relaxed">
              Canjea la palabra secreta del Live para ganar +1 punto, y muestra tu QR
              en mostrador para sumar +10.
            </p>
          </div>
          <button onClick={() => navigate('/canjear')} className="btn-fresa">
            <Zap className="w-4 h-4" />
            Canjear palabra secreta
          </button>
        </div>

        {/* Cerrar sesión */}
        <button
          onClick={() => setConfirmOpen(true)}
          className="flex items-center justify-center gap-2 font-heading text-xs uppercase tracking-wide text-brand-rosa bg-white border-2 border-brand-rosa/30 rounded-2xl py-3 hover:bg-brand-rosa/5 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>

      <ProfileDataModal
        open={dataOpen}
        profile={profile}
        onClose={() => setDataOpen(false)}
        onSaved={points => { setDataOpen(false); setJustLinked(false); setAwarded(points) }}
      />

      <PasswordModal
        open={passwordOpen}
        mode={hasPassword ? 'change' : 'create'}
        loginHint={loginIdentifier() ?? profile.username ?? ''}
        onClose={() => setPasswordOpen(false)}
        onSaved={() => setPasswordOpen(false)}
      />

      <ConfirmDialog
        open={unlinkOpen}
        icon={<Link2Off className="w-5 h-5 text-brand-rosa" />}
        title="¿Desvincular Google?"
        description="Dejarás de poder entrar con Google. Tu correo se queda guardado para recuperar tu contraseña."
        confirmLabel="Desvincular"
        onConfirm={handleUnlink}
        onCancel={() => setUnlinkOpen(false)}
      />

      <ConfirmDialog
        open={confirmOpen}
        icon={<LogOut className="w-5 h-5 text-brand-rosa" />}
        title="¿Cerrar sesión?"
        description="Vas a salir de tu cuenta. Puedes volver a iniciar sesión cuando quieras."
        confirmLabel="Cerrar sesión"
        onConfirm={handleLogout}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
