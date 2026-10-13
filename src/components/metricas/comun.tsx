import { useState, type ReactNode } from 'react'
import { BarChart3, Table2 } from 'lucide-react'
import { cn } from '../../lib/utils'

// Colores de las gráficas. Validados con el script de la skill de dataviz sobre blanco
// (validate_palette.js): tres series categóricas que pasan banda de luminosidad, croma, separación
// para daltonismo (peor par ΔE 25) y contraste ≥ 3:1; y una rampa ordinal azul de un solo tono.
// El color sigue a la entidad: Canjes siempre es azul, aunque un filtro deje una sola serie.
export const COLOR = {
  canjes: '#3C5DDC',
  escaneos: '#E8622C',
  altas: '#7A4CB0',
} as const

/** Rampa ordinal azul, clara → oscura (validada con --ordinal). Para embudo, calor y cohortes. */
export const RAMPA = ['#9AACEE', '#7189E6', '#4E6CDE', '#3550C4', '#23327A'] as const

/** Celda sin datos: casi la superficie, para que el cero no compita con el uno. */
export const VACIO = '#EEF1FA'

/** Rejilla y ejes: una línea fina, apenas distinta del fondo. */
export const REJILLA = '#E3E7F2'
export const TINTA_SECUNDARIA = '#6B7390'

const numero = new Intl.NumberFormat('es-MX')
export const fmt = (n: number | null | undefined) => (n == null ? '—' : numero.format(n))
export const fmtPct = (n: number | null | undefined) => (n == null ? '—' : `${numero.format(n)} %`)

/** Un color de la rampa para una fracción 0–1. El cero exacto es `VACIO`. */
export function colorDeRampa(fraccion: number): string {
  if (!(fraccion > 0)) return VACIO
  const i = Math.min(RAMPA.length - 1, Math.floor(fraccion * RAMPA.length))
  return RAMPA[i]
}

/** Texto legible sobre un paso de la rampa: los tres oscuros llevan texto blanco. */
export function tintaSobre(color: string): string {
  return RAMPA.indexOf(color as (typeof RAMPA)[number]) >= 2 ? '#FFFFFF' : '#1C2440'
}

/**
 * Lo único que leen nuestros tooltips de recharts. Más laxo que `TooltipContentProps` a
 * propósito: así cualquier gráfica le puede pasar sus props sin pelear con los genéricos.
 */
export interface PropsTooltip {
  active?: boolean
  label?: unknown
  payload?: ReadonlyArray<{ value?: unknown; name?: unknown; color?: string; dataKey?: unknown }>
}

export const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** 'YYYY-MM-DD' → '12 oct'. */
export function fechaCorta(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split('-').map(Number)
  return `${d} ${MESES_CORTOS[m - 1]}`
}

/** Fecha y hora en Ciudad de México: '12 oct, 16:04'. */
export function fechaHora(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

/**
 * La tarjeta de cada gráfica, con su gemela en tabla: ningún valor depende solo del tooltip ni
 * del color (accesibilidad, y para copiar números a mano).
 */
export function Tarjeta({
  titulo,
  subtitulo,
  tabla,
  children,
  className,
}: {
  titulo: string
  subtitulo?: ReactNode
  /** Si viene, la tarjeta ofrece alternar entre la gráfica y esta tabla. */
  tabla?: ReactNode
  children: ReactNode
  className?: string
}) {
  const [verTabla, setVerTabla] = useState(false)
  return (
    <section className={cn('bg-white rounded-3xl border border-brand-grisclaro/70 p-5 flex flex-col gap-4 min-w-0', className)}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-heading text-brand-sombra text-base leading-tight">{titulo}</h3>
          {subtitulo && <p className="font-body text-xs text-brand-gris mt-1 leading-relaxed">{subtitulo}</p>}
        </div>
        {tabla && (
          <button
            type="button"
            onClick={() => setVerTabla(v => !v)}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-brand-grisclaro px-3 py-1.5 font-body text-xs text-brand-gris hover:text-brand-sombra hover:border-brand-gris transition-colors"
          >
            {verTabla ? <BarChart3 className="w-3.5 h-3.5" /> : <Table2 className="w-3.5 h-3.5" />}
            {verTabla ? 'Gráfica' : 'Tabla'}
          </button>
        )}
      </header>
      {tabla && verTabla ? <div className="overflow-x-auto">{tabla}</div> : children}
    </section>
  )
}

/** Tabla sobria para las vistas de tabla y las listas. */
export function TablaSimple({ columnas, filas }: { columnas: string[]; filas: ReactNode[][] }) {
  return (
    <table className="w-full text-sm font-body">
      <thead>
        <tr className="border-b border-brand-grisclaro">
          {columnas.map((c, i) => (
            <th key={c} className={cn('py-2 pr-3 font-bold text-xs text-brand-gris whitespace-nowrap', i > 0 ? 'text-right' : 'text-left')}>
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filas.map((fila, i) => (
          <tr key={i} className="border-b border-brand-grisclaro/50 last:border-0">
            {fila.map((celda, j) => (
              <td key={j} className={cn('py-2 pr-3 text-brand-sombra whitespace-nowrap', j > 0 ? 'text-right tabular-nums' : 'text-left')}>
                {celda}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Mensaje en lugar de una gráfica sin datos: mejor que unos ejes vacíos. */
export function SinDatos({ texto = 'Sin datos en este rango.' }: { texto?: string }) {
  return <p className="font-body text-sm text-brand-gris py-8 text-center">{texto}</p>
}

/** La clave de una serie en la leyenda y el tooltip: un trazo corto, no una caja. */
export function Clave({ color, linea = true }: { color: string; linea?: boolean }) {
  return linea
    ? <span aria-hidden="true" className="inline-block w-3.5 h-[3px] rounded-full shrink-0" style={{ background: color }} />
    : <span aria-hidden="true" className="inline-block w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: color }} />
}
