import { useEffect, useState } from 'react'
import { Loader2, Search, ShieldCheck } from 'lucide-react'
import { cn } from '../../lib/utils'
import { NOMBRE_ROL, type Rol } from '../../lib/roles'
import {
  asignarRol, buscarUsuarios, fetchBitacoraRoles, fetchEquipo,
  type CambioDeRol, type Miembro, type MotivoRol,
} from '../../lib/metricas'
import { useStore } from '../../lib/store'
import ConfirmDialog from '../ui/ConfirmDialog'
import ErrorAlert from '../ui/ErrorAlert'
import { Tarjeta, fechaHora } from './comun'

type RolAsignable = Exclude<Rol, 'superadmin'>

const QUE_PUEDE: Record<RolAsignable, string> = {
  cliente: 'Solo su cuenta de cliente. Vuelve a aparecer en el ranking.',
  staff: 'Escanear QR y manejar la Estación y las pantallas del mostrador. No ve dinámicas ni clientes. Sale del ranking.',
  admin: 'Todo lo del staff, más crear dinámicas y ver el panel de clientes. Sale del ranking.',
}

const MOTIVOS: Record<MotivoRol, string> = {
  forbidden: 'Solo el superadmin puede asignar roles.',
  invalid_role: 'Ese rol no se puede asignar.',
  not_found: 'Esa cuenta ya no existe.',
  self: 'No puedes cambiar tu propio rol.',
  target_superadmin: 'El rol de otro superadmin no se cambia desde aquí.',
  no_username: 'Esa cuenta no ha terminado su registro.',
  sin_acceso: 'Es una cuenta antigua sin acceso con Google: no podría entrar.',
  sin_cambio: 'Esa cuenta ya tiene ese rol.',
  error: 'No pudimos guardar el cambio. Intenta de nuevo.',
}

const insignia = (rol: Rol) => cn(
  'inline-flex items-center rounded-full px-2 py-0.5 font-body text-[11px] font-bold',
  rol === 'superadmin' ? 'bg-brand-sombra text-white'
    : rol === 'admin' ? 'bg-brand-azul text-white'
    : rol === 'staff' ? 'bg-brand-verde text-brand-sombra'
    : 'bg-brand-papel text-brand-gris'
)

/**
 * Quién tiene acceso al panel, y el único lugar donde se reparte. Solo el superadmin llega
 * aquí, y aun así la regla real está en `asignar_rol`: nunca crea superadmins, no deja que nadie
 * se cambie a sí mismo y deja constancia en `cambios_de_rol`.
 */
export default function PanelEquipo() {
  const yo = useStore(s => s.profile?.id)
  const [equipo, setEquipo] = useState<Miembro[] | null>(null)
  const [bitacora, setBitacora] = useState<CambioDeRol[]>([])
  const [texto, setTexto] = useState('')
  const [resultados, setResultados] = useState<Miembro[]>([])
  const [buscando, setBuscando] = useState(false)
  const [pendiente, setPendiente] = useState<{ miembro: Miembro; rol: RolAsignable } | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const recargar = async () => {
    const [e, b] = await Promise.all([fetchEquipo(), fetchBitacoraRoles()])
    setEquipo(e)
    setBitacora(b)
  }

  useEffect(() => { void recargar() }, [])

  // Búsqueda con pausa: una consulta por frase, no por tecla.
  useEffect(() => {
    if (texto.trim().length < 2) { setResultados([]); return }
    setBuscando(true)
    const t = window.setTimeout(async () => {
      setResultados(await buscarUsuarios(texto))
      setBuscando(false)
    }, 350)
    return () => window.clearTimeout(t)
  }, [texto])

  const confirmar = async () => {
    if (!pendiente) return
    setGuardando(true)
    const r = await asignarRol(pendiente.miembro.id, pendiente.rol)
    setGuardando(false)
    if (!r.ok) {
      setError(MOTIVOS[r.motivo] ?? MOTIVOS.error)
      setPendiente(null)
      return
    }
    setError('')
    setPendiente(null)
    setResultados(rs => rs.map(m => (m.id === pendiente.miembro.id ? { ...m, role: pendiente.rol } : m)))
    await recargar()
  }

  const fila = (m: Miembro) => {
    const editable = m.id !== yo && m.role !== 'superadmin'
    return (
      <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-brand-grisclaro/50 last:border-0">
        <div className="min-w-0">
          <p className="font-body text-sm font-bold text-brand-sombra truncate">
            {m.username ?? 'Sin apodo'} <span className={insignia(m.role)}>{NOMBRE_ROL[m.role]}</span>
          </p>
          <p className="font-body text-xs text-brand-gris truncate">{m.email ?? 'sin correo'}</p>
        </div>
        {editable ? (
          <div className="inline-flex rounded-full border border-brand-grisclaro bg-white p-0.5" role="radiogroup" aria-label={`Rol de ${m.username}`}>
            {(['cliente', 'staff', 'admin'] as const).map(rol => (
              <button
                key={rol}
                type="button"
                role="radio"
                aria-checked={m.role === rol}
                onClick={() => m.role !== rol && setPendiente({ miembro: m, rol })}
                className={cn(
                  'rounded-full px-3 py-1 font-body text-xs font-bold transition-colors',
                  m.role === rol ? 'bg-brand-sombra text-white' : 'text-brand-gris hover:text-brand-sombra'
                )}
              >
                {NOMBRE_ROL[rol]}
              </button>
            ))}
          </div>
        ) : (
          <span className="font-body text-xs text-brand-gris">{m.id === yo ? 'Tú' : 'No editable'}</span>
        )}
      </li>
    )
  }

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="flex flex-col gap-4">
        <Tarjeta titulo="El equipo" subtitulo="Quién tiene acceso al panel hoy.">
          {error && <ErrorAlert msg={error} />}
          {!equipo ? <Loader2 className="w-5 h-5 animate-spin text-brand-azul" /> : (
            <ul>{equipo.map(fila)}</ul>
          )}
        </Tarjeta>

        <Tarjeta titulo="Dar acceso" subtitulo="Busca por apodo o correo. Solo aparecen cuentas con registro completo y acceso con Google.">
          <label className="relative block">
            <Search className="w-4 h-4 text-brand-gris absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            <span className="sr-only">Buscar cuenta</span>
            <input
              type="search"
              value={texto}
              onChange={e => setTexto(e.target.value)}
              placeholder="Apodo o correo"
              className="w-full rounded-2xl border border-brand-grisclaro bg-white pl-9 pr-9 py-2.5 font-body text-sm text-brand-sombra"
            />
            {buscando && <Loader2 className="w-4 h-4 animate-spin text-brand-gris absolute right-3 top-1/2 -translate-y-1/2" />}
          </label>
          {resultados.length > 0 && <ul>{resultados.map(fila)}</ul>}
          {!buscando && texto.trim().length >= 2 && resultados.length === 0 && (
            <p className="font-body text-sm text-brand-gris">No encontramos esa cuenta.</p>
          )}
        </Tarjeta>
      </div>

      <Tarjeta titulo="Bitácora" subtitulo="Los últimos cambios de rol, con quién los hizo.">
        {bitacora.length === 0 ? <p className="font-body text-sm text-brand-gris">Todavía no hay cambios.</p> : (
          <ul className="flex flex-col">
            {bitacora.map(c => (
              <li key={c.id} className="py-2.5 border-b border-brand-grisclaro/50 last:border-0 font-body text-sm">
                <p className="text-brand-sombra">
                  <strong>{c.username ?? 'cuenta borrada'}</strong>: {NOMBRE_ROL[c.rol_anterior as Rol] ?? c.rol_anterior} → {NOMBRE_ROL[c.rol_nuevo as Rol] ?? c.rol_nuevo}
                </p>
                <p className="text-xs text-brand-gris">{fechaHora(c.creado_en)} · por {c.ejecutado_por}</p>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      <ConfirmDialog
        open={pendiente !== null}
        icon={<ShieldCheck className="w-5 h-5 text-brand-azul" />}
        title={pendiente ? `¿${pendiente.miembro.username} pasa a ${NOMBRE_ROL[pendiente.rol]}?` : ''}
        description={pendiente ? QUE_PUEDE[pendiente.rol] : ''}
        confirmLabel={guardando ? 'Guardando...' : 'Cambiar rol'}
        confirmDisabled={guardando}
        onConfirm={() => { void confirmar() }}
        onCancel={() => setPendiente(null)}
      />
    </div>
  )
}
