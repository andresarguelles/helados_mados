import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import { useBottomNavVisible } from '../components/layout/BottomNav'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import ProfileDataModal from '../components/profile/ProfileDataModal'
import { useStore } from '../lib/store'
import { cn } from '../lib/utils'
import { Coupon } from '../lib/types'
import { formatPhone } from '../lib/phone'
import { formatCumple } from '../lib/cumple'
import {
  Star, Zap, Ticket, Medal, LogOut, Pencil, Mail,
} from 'lucide-react'

function DatoPerfil({ valor }: { valor: string | null }) {
  return valor
    ? <dd className="text-brand-sombra text-right">{valor}</dd>
    : <dd className="text-brand-gris/70 text-right italic">Sin agregar</dd>
}

export default function Perfil() {
  const navigate = useNavigate()
  const profile = useStore(s => s.profile)
  const logout = useStore(s => s.logout)
  const getUserCoupons = useStore(s => s.getUserCoupons)
  const navVisible = useBottomNavVisible()

  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [dataOpen, setDataOpen] = useState(false)

  useEffect(() => {
    if (profile) getUserCoupons(profile.id).then(setCoupons)
  }, [profile, getUserCoupons])

  if (!profile) return null

  const activeCount = coupons.filter(c => c.status === 'active').length
  const redeemedCount = coupons.filter(c => c.status === 'redeemed').length
  const nombre = [profile.first_name, profile.last_name].filter(Boolean).join(' ')
  const cumple = formatCumple(profile.birthday_month, profile.birthday_day)

  const handleLogout = async () => {
    await logout()
    navigate('/')
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

        {/* Datos personales. Todos opcionales y editables siempre: ya no hay "perfil completo"
            porque ese concepto solo existía para el bono de +5, que se acabó en la 0040. */}
        <div className="paper-card rounded-3xl p-5 flex flex-col gap-4">
          <div>
            <h2 className="font-heading text-brand-sombra text-lg">Tus datos</h2>
            <p className="font-body text-brand-gris text-xs mt-1 leading-relaxed">
              Todos son opcionales y los cambias o borras cuando quieras. Con tu cumpleaños te
              felicitamos, y con tu WhatsApp te avisamos de las promos si nos das permiso.
            </p>
          </div>

          <dl className="flex flex-col gap-2 text-sm font-body">
            <div className="flex justify-between gap-3">
              <dt className="text-brand-gris">Nombre</dt>
              <DatoPerfil valor={nombre} />
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-brand-gris">Cumpleaños</dt>
              <DatoPerfil valor={cumple} />
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-brand-gris">WhatsApp</dt>
              <DatoPerfil valor={profile.phone ? formatPhone(profile.phone) : null} />
            </div>
          </dl>

          {/*
            El correo nunca se escribe a mano: solo llega verificado desde Google, que además es
            la única forma de entrar. Por eso aquí es de solo lectura y no hay nada que vincular.
          */}
          {profile.email && (
            <div className="flex items-center gap-3 rounded-2xl bg-brand-sombra/5 px-4 py-3">
              <Mail className="w-4 h-4 text-brand-gris shrink-0" />
              <div className="min-w-0">
                <p className="font-body text-sm text-brand-sombra truncate">{profile.email}</p>
                <p className="font-body text-[11px] text-brand-gris">Entras con esta cuenta de Google</p>
              </div>
            </div>
          )}

          <button onClick={() => setDataOpen(true)} className="btn-fresa">
            <Pencil className="w-4 h-4" />
            {nombre || cumple || profile.phone ? 'Editar mis datos' : 'Agregar información'}
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

        {/* Discreto pero presente: es el derecho de Cancelación de ARCO y Google Play lo
            exige dentro de la app. Esconderlo del todo sería incumplir las dos cosas. */}
        <Link
          to="/eliminar-cuenta"
          className="font-body text-xs text-brand-gris text-center underline hover:text-brand-rosa transition-colors"
        >
          Eliminar mi cuenta
        </Link>
      </div>

      <ProfileDataModal
        open={dataOpen}
        profile={profile}
        onClose={() => setDataOpen(false)}
        onSaved={() => setDataOpen(false)}
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
