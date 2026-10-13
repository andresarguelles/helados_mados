import { useEffect, useRef, useState } from 'react'
import { Calendar, Check, ChevronDown, Layers, Users } from 'lucide-react'
import { cn } from '../../lib/utils'
import { RANGOS, SEGMENTOS, type Granularidad, type Rango, type Segmento } from '../../lib/metricas'

export interface OpcionDinamica {
  id: string
  keyword: string
  premio: string
}

export interface EstadoFiltros {
  rango: Rango
  /** Fechas inclusivas 'YYYY-MM-DD' del rango personalizado. */
  desde: string
  hasta: string
  dinamicas: string[]
  segmento: Segmento
  granularidad: Granularidad
  comparar: boolean
}

const GRANULARIDADES: { valor: Granularidad; nombre: string }[] = [
  { valor: 'day', nombre: 'Día' },
  { valor: 'week', nombre: 'Semana' },
  { valor: 'month', nombre: 'Mes' },
]

const chip = (activo: boolean) => cn(
  'shrink-0 rounded-full px-3 py-1.5 font-body text-xs font-bold transition-colors border',
  activo
    ? 'bg-brand-sombra text-white border-brand-sombra'
    : 'bg-white text-brand-gris border-brand-grisclaro hover:text-brand-sombra hover:border-brand-gris'
)

/**
 * Una sola fila de filtros arriba de todo lo que acotan: cada gráfica, cifra y lista de la página
 * se recalcula con el mismo corte, así los números siempre cuadran entre sí.
 */
export default function BarraFiltros({
  estado,
  dinamicas,
  onCambio,
  mostrarGranularidad,
}: {
  estado: EstadoFiltros
  dinamicas: OpcionDinamica[]
  onCambio: (cambio: Partial<EstadoFiltros>) => void
  mostrarGranularidad: boolean
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* Rango: lo primero que se toca. Presets como chips; el personalizado abre dos fechas. */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-thin">
        <Calendar className="w-4 h-4 text-brand-gris shrink-0" aria-hidden="true" />
        {RANGOS.map(r => (
          <button key={r.valor} type="button" className={chip(estado.rango === r.valor)} onClick={() => onCambio({ rango: r.valor })}>
            {r.nombre}
          </button>
        ))}
        <button type="button" className={chip(estado.rango === 'custom')} onClick={() => onCambio({ rango: 'custom' })}>
          Personalizado
        </button>
      </div>

      {estado.rango === 'custom' && (
        <div className="flex flex-wrap items-center gap-2 font-body text-xs text-brand-gris">
          <label className="flex items-center gap-2">
            Desde
            <input
              type="date"
              value={estado.desde}
              max={estado.hasta}
              onChange={e => e.target.value && onCambio({ desde: e.target.value })}
              className="rounded-xl border border-brand-grisclaro bg-white px-3 py-1.5 text-brand-sombra"
            />
          </label>
          <label className="flex items-center gap-2">
            Hasta
            <input
              type="date"
              value={estado.hasta}
              min={estado.desde}
              onChange={e => e.target.value && onCambio({ hasta: e.target.value })}
              className="rounded-xl border border-brand-grisclaro bg-white px-3 py-1.5 text-brand-sombra"
            />
          </label>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <SelectorDinamicas
          opciones={dinamicas}
          elegidas={estado.dinamicas}
          onCambio={ids => onCambio({ dinamicas: ids })}
        />

        <label className="relative inline-flex items-center">
          <Users className="w-3.5 h-3.5 text-brand-gris absolute left-3 pointer-events-none" aria-hidden="true" />
          <span className="sr-only">Segmento de clientes</span>
          <select
            value={estado.segmento}
            onChange={e => onCambio({ segmento: e.target.value as Segmento })}
            title={SEGMENTOS.find(s => s.valor === estado.segmento)?.ayuda}
            className="appearance-none rounded-full border border-brand-grisclaro bg-white pl-8 pr-8 py-1.5 font-body text-xs font-bold text-brand-sombra"
          >
            {SEGMENTOS.map(s => <option key={s.valor} value={s.valor}>{s.nombre}</option>)}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-brand-gris absolute right-3 pointer-events-none" aria-hidden="true" />
        </label>

        {mostrarGranularidad && (
          <div className="inline-flex rounded-full border border-brand-grisclaro bg-white p-0.5" role="radiogroup" aria-label="Agrupar por">
            {GRANULARIDADES.map(g => (
              <button
                key={g.valor}
                type="button"
                role="radio"
                aria-checked={estado.granularidad === g.valor}
                onClick={() => onCambio({ granularidad: g.valor })}
                className={cn(
                  'rounded-full px-3 py-1 font-body text-xs font-bold transition-colors',
                  estado.granularidad === g.valor ? 'bg-brand-azul text-white' : 'text-brand-gris hover:text-brand-sombra'
                )}
              >
                {g.nombre}
              </button>
            ))}
          </div>
        )}

        <label className="inline-flex items-center gap-2 font-body text-xs text-brand-gris cursor-pointer select-none">
          <input
            type="checkbox"
            checked={estado.comparar}
            onChange={e => onCambio({ comparar: e.target.checked })}
            className="accent-brand-azul w-4 h-4"
          />
          Comparar con el periodo anterior
        </label>
      </div>
    </div>
  )
}

function SelectorDinamicas({
  opciones,
  elegidas,
  onCambio,
}: {
  opciones: OpcionDinamica[]
  elegidas: string[]
  onCambio: (ids: string[]) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const caja = useRef<HTMLDivElement>(null)

  // Se cierra al tocar fuera o con Escape, como cualquier menú.
  useEffect(() => {
    if (!abierto) return
    const fuera = (e: PointerEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierto(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false) }
    document.addEventListener('pointerdown', fuera)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', fuera)
      document.removeEventListener('keydown', esc)
    }
  }, [abierto])

  const etiqueta = elegidas.length === 0
    ? 'Todas las dinámicas'
    : elegidas.length === 1
      ? (opciones.find(o => o.id === elegidas[0])?.keyword ?? '1 dinámica')
      : `${elegidas.length} dinámicas`

  const alternar = (id: string) =>
    onCambio(elegidas.includes(id) ? elegidas.filter(x => x !== id) : [...elegidas, id])

  return (
    <div ref={caja} className="relative">
      <button
        type="button"
        onClick={() => setAbierto(a => !a)}
        aria-expanded={abierto}
        className="inline-flex items-center gap-2 rounded-full border border-brand-grisclaro bg-white px-3 py-1.5 font-body text-xs font-bold text-brand-sombra max-w-[14rem]"
      >
        <Layers className="w-3.5 h-3.5 text-brand-gris shrink-0" aria-hidden="true" />
        <span className="truncate">{etiqueta}</span>
        <ChevronDown className="w-3.5 h-3.5 text-brand-gris shrink-0" aria-hidden="true" />
      </button>

      {abierto && (
        <div className="absolute z-30 mt-2 w-72 max-h-80 overflow-y-auto rounded-2xl border border-brand-grisclaro bg-white shadow-lg p-1.5">
          <button
            type="button"
            onClick={() => onCambio([])}
            className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left font-body text-sm text-brand-sombra hover:bg-brand-papel"
          >
            <span className="w-4 shrink-0">{elegidas.length === 0 && <Check className="w-4 h-4 text-brand-azul" />}</span>
            Todas
          </button>
          <div className="h-px bg-brand-grisclaro/60 my-1" />
          {opciones.map(o => (
            <button
              key={o.id}
              type="button"
              onClick={() => alternar(o.id)}
              className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-brand-papel"
            >
              <span className="w-4 shrink-0">{elegidas.includes(o.id) && <Check className="w-4 h-4 text-brand-azul" />}</span>
              <span className="min-w-0">
                <span className="block font-body text-sm font-bold text-brand-sombra truncate">{o.keyword}</span>
                <span className="block font-body text-xs text-brand-gris truncate">{o.premio}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
