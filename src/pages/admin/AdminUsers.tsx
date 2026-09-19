import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../../lib/store'
import { Profile } from '../../lib/types'
import { formatDate } from '../../lib/utils'
import { cn } from '../../lib/utils'
import AdminHeader from '../../components/admin/AdminHeader'
import { formatPhone } from '../../lib/phone'
import { Search, ChevronDown, Users2, Gift, QrCode, Cake, Mail, Phone, MessageCircle, Trash2, AlertCircle, Check } from 'lucide-react'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import type { BajaVia } from '../../lib/store'

type SortKey = 'points' | 'recent'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'points', label: 'Más puntos' },
  { key: 'recent', label: 'Más recientes' },
]

const VIAS: { key: BajaVia; label: string; hint: string }[] = [
  { key: 'admin_a_peticion', label: 'A petición del cliente', hint: 'Lo pidió por correo' },
  { key: 'admin_prueba', label: 'Prueba o limpieza', hint: 'No es una solicitud real' },
]

/** Lo que hay que teclear para confirmar: el apodo, o el correo si aún no eligió apodo. */
const identificadorDe = (p: Profile) => p.username ?? p.email ?? ''

const MENSAJES: Record<string, string> = {
  forbidden: 'Tu cuenta no tiene permisos de administrador.',
  not_found: 'Esa cuenta ya no existe. Recarga la lista.',
  target_is_admin: 'No se puede eliminar una cuenta del personal desde aquí.',
  confirmation_mismatch: 'El nombre no coincide. No se eliminó nada.',
  no_identifier: 'Esa cuenta no tiene apodo ni correo, así que no se puede confirmar desde aquí.',
  not_authenticated: 'Tu sesión expiró. Vuelve a entrar.',
}

function fullName(profile: Profile): string {
  return [profile.first_name, profile.last_name].filter(Boolean).join(' ')
}

/** Solo día y mes: para las promos de cumpleaños el año no aporta. */
function formatBirthday(value: string): string {
  const [, month, day] = value.split('-')
  return `${day}/${month}`
}

export default function AdminUsers() {
  const { profiles, coupons, fetchAllProfiles, fetchDynamics } = useStore()
  const adminDeleteAccount = useStore(s => s.adminDeleteAccount)
  const [loaded, setLoaded] = useState(false)
  // El error del borrado vive aparte y se pinta sobre la lista: dentro del modal quedaría
  // escondido detrás de un diálogo que ya se cerró.
  const [listError, setListError] = useState('')
  const [aviso, setAviso] = useState('')
  const [objetivo, setObjetivo] = useState<Profile | null>(null)
  const [via, setVia] = useState<BajaVia | null>(null)
  const [tecleado, setTecleado] = useState('')
  const [borrando, setBorrando] = useState(false)

  const cerrarDialogo = () => { setObjetivo(null); setVia(null); setTecleado('') }

  const confirmarBaja = async () => {
    if (!objetivo || !via) return
    setBorrando(true)
    setListError('')
    setAviso('')
    const r = await adminDeleteAccount(objetivo.id, tecleado.trim(), via)
    setBorrando(false)
    if (r.success) setAviso('Se eliminó la cuenta de ' + (r.username ?? 'ese cliente') + '.')
    else setListError(MENSAJES[r.reason] ?? 'No pudimos eliminar la cuenta. Inténtalo de nuevo.')
    cerrarDialogo()
  }
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('points')
  const [sortOpen, setSortOpen] = useState(false)

  useEffect(() => {
    Promise.all([fetchAllProfiles(), fetchDynamics()]).then(() => setLoaded(true))
  }, [fetchAllProfiles, fetchDynamics])

  const customers = useMemo(() => {
    const q = query.trim().toLowerCase()
    return profiles
      .filter(p => !p.is_admin)
      // Ahora hay más de un dato por el que buscar a alguien en el mostrador.
      .filter(p => !q || [p.username, p.first_name, p.last_name, p.email, p.phone]
        .some(value => value?.toLowerCase().includes(q)))
      .sort((a, b) => sort === 'points'
        ? b.total_points - a.total_points
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
  }, [profiles, query, sort])

  const getCouponCounts = (userId: string) => {
    const userCoupons = coupons.filter(c => c.user_id === userId)
    return {
      digital: userCoupons.filter(c => c.digital_awarded).length,
      physical: userCoupons.filter(c => c.physical_awarded).length,
    }
  }

  const currentSortLabel = SORT_OPTIONS.find(o => o.key === sort)?.label ?? 'Más puntos'

  return (
    <div className="min-h-screen bg-brand-azul flex flex-col">
      <AdminHeader title="Panel Comandante" />

      <div className="flex-1 max-w-lg mx-auto w-full px-4 pt-20 pb-24 flex flex-col gap-6">

        <div>
          <h1 className="font-heading text-white text-xl uppercase">Clientes</h1>
          <p className="text-white/85 text-xs font-body mt-0.5">
            {loaded ? `${customers.length} cliente${customers.length === 1 ? '' : 's'} registrado${customers.length === 1 ? '' : 's'}` : 'Cargando...'}
          </p>
        </div>

        {/* Search + sort */}
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-white/40 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar por apodo..."
              className="field-input-dark pl-10"
            />
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setSortOpen(o => !o)}
              aria-haspopup="listbox"
              aria-expanded={sortOpen}
              className="field-input-dark flex items-center justify-between cursor-pointer"
            >
              <span>{currentSortLabel}</span>
              <ChevronDown className={cn('w-4 h-4 text-white/60 transition-transform', sortOpen && 'rotate-180')} />
            </button>

            {sortOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                <div
                  role="listbox"
                  className="absolute left-0 right-0 mt-2 z-20 bg-brand-azul border-2 border-white/20 rounded-2xl shadow-sticker-sm overflow-hidden"
                >
                  {SORT_OPTIONS.map(option => (
                    <button
                      key={option.key}
                      type="button"
                      role="option"
                      aria-selected={sort === option.key}
                      onClick={() => { setSort(option.key); setSortOpen(false) }}
                      className={cn(
                        'w-full text-left px-4 py-2.5 text-sm font-body transition-colors',
                        sort === option.key ? 'bg-white/15 text-white font-bold' : 'text-white/85 hover:bg-white/10'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Customer list */}
        {listError && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300 font-body">{listError}</p>
          </div>
        )}

        {/* Sin esto, si el admin tenía una búsqueda que solo casaba con esa persona, la
            lista queda en "ningún cliente coincide" y eso se lee como "no lo encuentro". */}
        {aviso && (
          <div className="flex items-start gap-2 bg-brand-verde/15 border border-brand-verde/30 rounded-2xl px-4 py-3">
            <Check className="w-4 h-4 text-brand-verde shrink-0 mt-0.5" />
            <p className="text-xs text-white/90 font-body">{aviso}</p>
          </div>
        )}

        {!loaded ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="relative overflow-hidden bg-white/5 border border-white/10 rounded-3xl h-20">
                <div className="absolute inset-0 shimmer opacity-20" />
              </div>
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-16 text-white/75">
            <Users2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-heading">
              {query ? 'Ningún cliente coincide con tu búsqueda' : 'Sin clientes registrados aún'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {customers.map(customer => {
              const { digital, physical } = getCouponCounts(customer.id)
              return (
                <div key={customer.id} className="bg-white/5 border border-white/10 rounded-3xl p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-white text-sm truncate">
                      {/* Un registro con Google a medias todavía no tiene apodo. */}
                      {customer.username ?? <span className="text-white/50">Sin apodo</span>}
                    </p>
                    {fullName(customer) && (
                      <p className="text-white/85 text-xs font-body mt-0.5 truncate">{fullName(customer)}</p>
                    )}
                    <p className="text-white/60 text-xs font-body mt-0.5">Miembro desde {formatDate(customer.created_at)}</p>

                    {(customer.email || customer.phone || customer.birthdate) && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/75 font-body mt-1.5">
                        {customer.email && (
                          <span className="flex items-center gap-1 min-w-0">
                            <Mail className="w-3 h-3 text-brand-amarillo/70 shrink-0" />
                            <span className="truncate">{customer.email}</span>
                          </span>
                        )}
                        {customer.phone && (
                          <span className="flex items-center gap-1">
                            {/* El icono de WhatsApp distingue a quién sí se le puede escribir. */}
                            {customer.whatsapp_opt_in
                              ? <MessageCircle className="w-3 h-3 text-brand-verde shrink-0" />
                              : <Phone className="w-3 h-3 text-brand-amarillo/70 shrink-0" />}
                            {formatPhone(customer.phone)}
                          </span>
                        )}
                        {customer.birthdate && (
                          <span className="flex items-center gap-1">
                            <Cake className="w-3 h-3 text-brand-amarillo/70 shrink-0" />
                            {formatBirthday(customer.birthdate)}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-xs text-white/75 font-body mt-1.5">
                      <span className="flex items-center gap-1">
                        <Gift className="w-3 h-3 text-brand-amarillo/70" />{digital} digitales
                      </span>
                      <span className="flex items-center gap-1">
                        <QrCode className="w-3 h-3 text-brand-amarillo/70" />{physical} físicos
                      </span>
                    </div>
                  </div>
                  <span className="points-chip shrink-0">{customer.total_points} pts</span>
                  {/* Un toque accidental al desplazar es inofensivo: borrar exige teclear
                      el apodo, así que abrir el diálogo por error no hace nada. */}
                  <button
                    onClick={() => { setObjetivo(customer); setVia(null); setTecleado(''); setListError(''); setAviso('') }}
                    aria-label={'Eliminar la cuenta de ' + (customer.username ?? 'este cliente')}
                    className="w-8 h-8 shrink-0 bg-white/10 rounded-xl flex items-center justify-center text-white/75 hover:text-red-400 hover:bg-white/20 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!objetivo}
        tone="danger"
        icon={<Trash2 className="w-6 h-6 text-red-500" />}
        title="¿Eliminar esta cuenta?"
        description={objetivo && (
          <>
            Vas a eliminar la cuenta de{' '}
            <span className="font-bold text-brand-azul">{identificadorDe(objetivo)}</span>
            {' '}con {objetivo.total_points} puntos. Es permanente y no se puede deshacer.
          </>
        )}
        confirmLabel="Eliminar"
        confirmId="confirm-delete-user-btn"
        loading={borrando}
        confirmDisabled={!via || tecleado.trim().toLowerCase() !== identificadorDe(objetivo ?? ({} as Profile)).toLowerCase()}
        onConfirm={confirmarBaja}
        onCancel={cerrarDialogo}
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <p className="font-heading text-brand-sombra text-[11px] uppercase">Motivo</p>
            {VIAS.map(v => (
              <button
                key={v.key}
                onClick={() => setVia(v.key)}
                className={cn(
                  'w-full text-left rounded-2xl border-2 px-3 py-2 transition-all',
                  via === v.key
                    ? 'border-brand-azul bg-brand-azul/10'
                    : 'border-brand-sombra/15 hover:border-brand-azul/40'
                )}
              >
                <span className="block font-body text-sm text-brand-sombra">{v.label}</span>
                <span className="block font-body text-[11px] text-brand-gris">{v.hint}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            {/* Teclear el nombre no es solo fricción: el servidor comprueba que corresponda
                al id, así que un id arrastrado por error no puede borrar a quien no es. */}
            <label htmlFor="confirmar-apodo" className="font-body text-xs text-brand-gris">
              Escribe <span className="font-bold text-brand-sombra">{objetivo && identificadorDe(objetivo)}</span> para confirmar
            </label>
            <input
              id="confirmar-apodo"
              value={tecleado}
              onChange={e => setTecleado(e.target.value)}
              autoComplete="off"
              className="field-input"
            />
          </div>

          <p className="font-body text-[11px] text-brand-gris">
            Queda constancia de esta baja: a quién, quién la ejecutó y cuándo.
          </p>
        </div>
      </ConfirmDialog>
    </div>
  )
}
