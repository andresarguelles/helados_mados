import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { MetricaDinamica } from '../../lib/metricas'
import { COLOR, SinDatos, Tarjeta, fechaCorta, fechaHora, fmt, fmtPct } from './comun'

type Columna = 'keyword' | 'canjes' | 'escaneos' | 'conversion' | 'existencias' | 'pct_nuevos' | 'mediana_horas'

const COLUMNAS: { clave: Columna; nombre: string; ayuda: string }[] = [
  { clave: 'keyword', nombre: 'Dinámica', ayuda: 'Palabra secreta y premio' },
  { clave: 'canjes', nombre: 'Canjes', ayuda: 'Palabras canjeadas en el rango' },
  { clave: 'escaneos', nombre: 'Cobros', ayuda: 'QR cobrados en tienda en el rango' },
  { clave: 'conversion', nombre: 'Conversión', ayuda: 'De los canjes del rango, cuántos ya se cobraron' },
  { clave: 'existencias', nombre: 'Existencias', ayuda: 'Piezas entregadas de las disponibles (total, no solo el rango)' },
  { clave: 'pct_nuevos', nombre: 'Clientes nuevos', ayuda: 'Canjes que fueron el primer cupón de ese cliente' },
  { clave: 'mediana_horas', nombre: 'Canje → cobro', ayuda: 'Mediana de horas entre canjear y cobrar' },
]

function valorDe(d: MetricaDinamica, c: Columna): number | string {
  if (c === 'keyword') return d.keyword.toLowerCase()
  if (c === 'existencias') return d.existencias ? d.entregados / d.existencias : 0
  return d[c] ?? -1
}

/** Cómo le fue a cada dinámica vigente en el rango. Se ordena tocando el encabezado. */
export default function PanelDinamicas({ dinamicas }: { dinamicas: MetricaDinamica[] }) {
  const [orden, setOrden] = useState<{ col: Columna; desc: boolean }>({ col: 'canjes', desc: true })

  const filas = useMemo(() => [...dinamicas].sort((a, b) => {
    const va = valorDe(a, orden.col)
    const vb = valorDe(b, orden.col)
    const cmp = va < vb ? -1 : va > vb ? 1 : 0
    return orden.desc ? -cmp : cmp
  }), [dinamicas, orden])

  const ordenarPor = (col: Columna) =>
    setOrden(o => (o.col === col ? { col, desc: !o.desc } : { col, desc: col !== 'keyword' }))

  return (
    <Tarjeta
      titulo="Dinámicas"
      subtitulo="Las vigentes en algún momento del rango. Toca un encabezado para ordenar."
    >
      {filas.length === 0 ? <SinDatos texto="Ninguna dinámica estuvo vigente en este rango." /> : (
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full min-w-[46rem] text-sm font-body">
            <thead>
              <tr className="border-b border-brand-grisclaro">
                {COLUMNAS.map((c, i) => (
                  <th key={c.clave} className={cn('py-2 pr-3 whitespace-nowrap', i > 0 ? 'text-right' : 'text-left')}>
                    <button
                      type="button"
                      title={c.ayuda}
                      onClick={() => ordenarPor(c.clave)}
                      className={cn(
                        'inline-flex items-center gap-1 font-bold text-xs transition-colors',
                        orden.col === c.clave ? 'text-brand-sombra' : 'text-brand-gris hover:text-brand-sombra'
                      )}
                    >
                      {c.nombre}
                      {orden.col === c.clave && (orden.desc
                        ? <ArrowDown className="w-3 h-3" aria-label="de mayor a menor" />
                        : <ArrowUp className="w-3 h-3" aria-label="de menor a mayor" />)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map(d => {
                const usado = d.existencias ? Math.min(1, d.entregados / d.existencias) : 0
                return (
                  <tr key={d.id} className="border-b border-brand-grisclaro/50 last:border-0 align-top">
                    <td className="py-3 pr-3">
                      <p className="font-bold text-brand-sombra">{d.keyword}</p>
                      <p className="text-xs text-brand-gris">{d.premio}</p>
                      <p className="text-[11px] text-brand-gris mt-0.5">{fechaCorta(d.inicia)} – {fechaCorta(d.termina)}</p>
                    </td>
                    <td className="py-3 pr-3 text-right tabular-nums text-brand-sombra">{fmt(d.canjes)}</td>
                    <td className="py-3 pr-3 text-right tabular-nums text-brand-sombra">{fmt(d.escaneos)}</td>
                    <td className="py-3 pr-3 text-right tabular-nums text-brand-sombra">{fmtPct(d.conversion)}</td>
                    <td className="py-3 pr-3 text-right">
                      <p className="tabular-nums text-brand-sombra">{fmt(d.entregados)} / {fmt(d.existencias)}</p>
                      <div className="ml-auto mt-1 h-1.5 w-24 rounded-full bg-brand-papel overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${usado * 100}%`, background: COLOR.escaneos }} />
                      </div>
                      {d.agotado_en && <p className="text-[11px] text-brand-gris mt-1">Agotado {fechaHora(d.agotado_en)}</p>}
                    </td>
                    <td className="py-3 pr-3 text-right tabular-nums text-brand-sombra">{fmtPct(d.pct_nuevos)}</td>
                    <td className="py-3 pr-3 text-right tabular-nums text-brand-sombra">
                      {d.mediana_horas == null ? '—' : `${fmt(d.mediana_horas)} h`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Tarjeta>
  )
}
