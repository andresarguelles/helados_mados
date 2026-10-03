import { useEffect, useState, type ReactNode } from 'react'
import { AlertCircle, Droplets, ExternalLink, IceCreamCone, Milk, Trophy, type LucideIcon } from 'lucide-react'
import AdminHeader from '../../components/admin/AdminHeader'
import { useStore, type LeaderboardPeriod } from '../../lib/store'
import { SABORES, type Sabor } from '../../content/sabores'
import { cn } from '../../lib/utils'

const PERIODOS: { period: LeaderboardPeriod; etiqueta: string }[] = [
  { period: 'day', etiqueta: 'Hoy' },
  { period: 'week', etiqueta: 'Semana' },
  { period: 'month', etiqueta: 'Mes' },
  { period: 'all', etiqueta: 'Histórico' },
]

const BASE: Record<Sabor['base'], { icono: LucideIcon; texto: string }> = {
  leche: { icono: Milk, texto: 'Leche' },
  agua: { icono: Droplets, texto: 'Agua' },
}

/**
 * El panel de control de las pantallas de mostrador. Lo que se cambia aquí se guarda en la
 * tabla `estacion` y Realtime lo empuja a /admin/leaderboard y /admin/flavors, que se
 * redibujan solas: nadie tiene que recargar el monitor.
 */
export default function AdminEstacion() {
  const estacion = useStore(s => s.estacion)
  const suscribirEstacion = useStore(s => s.suscribirEstacion)
  const setPeriodoRanking = useStore(s => s.setPeriodoRanking)
  const setSaborVisible = useStore(s => s.setSaborVisible)
  const mostrarTodosLosSabores = useStore(s => s.mostrarTodosLosSabores)
  const [error, setError] = useState('')

  // El panel también escucha: si otro admin cambia algo desde su celular, aquí se ve.
  useEffect(() => suscribirEstacion(), [suscribirEstacion])

  const guardar = async (accion: () => Promise<boolean>) => {
    setError('')
    if (!(await accion())) setError('No se guardó. Revisa tu conexión e inténtalo de nuevo.')
  }

  const ocultos = new Set(estacion?.saboresOcultos ?? [])
  const enPantalla = SABORES.filter(s => !ocultos.has(s.id)).length

  return (
    <div className="min-h-screen bg-brand-azul flex flex-col">
      <AdminHeader title="Panel Comandante" />

      <div className="flex-1 max-w-lg mx-auto w-full px-4 pt-20 pb-24 flex flex-col gap-6">
        <div>
          <h1 className="font-heading text-white text-xl uppercase">Estación</h1>
          <p className="text-white/85 text-xs font-body mt-0.5">Controla lo que se ve en las pantallas del mostrador</p>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300 font-body">{error}</p>
          </div>
        )}

        {!estacion ? (
          <div className="flex flex-col gap-4" aria-busy="true">
            {['h-44', 'h-96'].map(alto => (
              <div key={alto} className={cn('relative overflow-hidden bg-white/5 border border-white/10 rounded-3xl', alto)}>
                <div className="absolute inset-0 shimmer opacity-20" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <Seccion
              icono={Trophy}
              titulo="Tabla de líderes"
              detalle="Qué periodo muestra la pantalla"
              ruta="/admin/leaderboard"
              abrir="Abrir tabla de líderes"
            >
              <div role="radiogroup" aria-label="Periodo de la tabla de líderes" className="grid grid-cols-4 gap-1 rounded-2xl bg-brand-sombra p-1">
                {PERIODOS.map(p => {
                  const activo = estacion.periodoRanking === p.period
                  return (
                    <button
                      key={p.period}
                      type="button"
                      role="radio"
                      aria-checked={activo}
                      onClick={() => { if (!activo) void guardar(() => setPeriodoRanking(p.period)) }}
                      className={cn(
                        'rounded-xl py-2.5 font-body font-black uppercase text-xs transition-colors',
                        activo ? 'bg-brand-verde text-brand-sombra' : 'text-white/85 hover:bg-white/10'
                      )}
                    >
                      {p.etiqueta}
                    </button>
                  )
                })}
              </div>
            </Seccion>

            <Seccion
              icono={IceCreamCone}
              titulo="Sabores"
              detalle={`${enPantalla} de ${SABORES.length} en pantalla`}
              ruta="/admin/flavors"
              abrir="Abrir sabores"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-white/75 text-xs font-body">Toca un sabor para quitarlo o volver a ponerlo.</p>
                {/* Para cuando se surte todo, normalmente al abrir. */}
                <button
                  type="button"
                  onClick={() => void guardar(mostrarTodosLosSabores)}
                  disabled={ocultos.size === 0}
                  className="shrink-0 rounded-xl border border-white/20 px-3 py-2 font-heading text-[11px] uppercase tracking-wide text-white hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                >
                  Mostrar todos
                </button>
              </div>

              <ul className="flex flex-col gap-2">
                {SABORES.map(sabor => (
                  <FilaSabor
                    key={sabor.id}
                    sabor={sabor}
                    visible={!ocultos.has(sabor.id)}
                    onCambiar={visible => void guardar(() => setSaborVisible(sabor.id, visible))}
                  />
                ))}
              </ul>
            </Seccion>
          </>
        )}
      </div>
    </div>
  )
}

/** Una subsección: qué pantalla controla, el botón para abrirla y sus controles. */
function Seccion({ icono: Icono, titulo, detalle, ruta, abrir, children }: {
  icono: LucideIcon
  titulo: string
  detalle: string
  ruta: string
  abrir: string
  children: ReactNode
}) {
  return (
    <section className="bg-white/5 border border-white/10 rounded-3xl p-4 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
          <Icono className="w-5 h-5 text-brand-amarillo" />
        </div>
        <div className="min-w-0">
          <h2 className="font-heading text-white text-base leading-tight">{titulo}</h2>
          <p className="text-white/75 text-xs font-body">{detalle}</p>
        </div>
      </div>

      {/* En otra pestaña: el panel se queda abierto para seguir controlando la pantalla. */}
      <a
        href={ruta}
        target="_blank"
        rel="noopener"
        className="flex items-center justify-center gap-2 bg-brand-amarillo text-brand-sombra font-heading text-xs uppercase tracking-wide px-4 py-3 rounded-xl border-2 border-brand-sombra shadow-sticker-white hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
      >
        {abrir}
        <ExternalLink className="w-4 h-4" />
      </a>

      {children}
    </section>
  )
}

function FilaSabor({ sabor, visible, onCambiar }: { sabor: Sabor; visible: boolean; onCambiar: (visible: boolean) => void }) {
  const { icono: Icono, texto } = BASE[sabor.base]
  return (
    <li>
      <button
        type="button"
        role="switch"
        aria-checked={visible}
        onClick={() => onCambiar(!visible)}
        className={cn(
          'w-full flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors',
          visible ? 'bg-white/10 border-white/20' : 'bg-transparent border-white/10'
        )}
      >
        <span
          className={cn('w-11 h-11 shrink-0 overflow-hidden rounded-xl border-2 border-brand-sombra transition-opacity', !visible && 'opacity-35')}
          style={{ backgroundColor: sabor.color }}
        >
          <img
            src={`/sabores/${sabor.id}.jpg`}
            alt=""
            className="w-full h-full object-cover"
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
        </span>
        <span className="flex-1 min-w-0">
          <span className={cn('block font-heading text-sm truncate', visible ? 'text-white' : 'text-white/50')}>{sabor.nombre}</span>
          <span className="flex items-center gap-1 text-[11px] font-body text-white/60">
            <Icono className="w-3 h-3" />
            {texto} · {visible ? 'En pantalla' : 'Oculto'}
          </span>
        </span>
        {/* El interruptor es dibujo: el botón entero es el control. */}
        <span aria-hidden="true" className={cn('relative w-11 h-6 shrink-0 rounded-full transition-colors', visible ? 'bg-brand-verde' : 'bg-white/20')}>
          <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', visible && 'translate-x-5')} />
        </span>
      </button>
    </li>
  )
}
