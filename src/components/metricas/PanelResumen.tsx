import { useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { cn } from '../../lib/utils'
import type { Granularidad, Kpis, PuntoSerie, Resumen } from '../../lib/metricas'
import {
  COLOR, REJILLA, TINTA_SECUNDARIA, Clave, SinDatos, TablaSimple, Tarjeta, fechaCorta, fmt, fmtPct, MESES_CORTOS,
  type PropsTooltip,
} from './comun'

// ─── Cifras clave ─────────────────────────────────────────────────────────────

const KPIS: { clave: keyof Kpis; nombre: string; ayuda: string; formato?: (n: number | null) => string }[] = [
  { clave: 'altas', nombre: 'Altas', ayuda: 'Cuentas que terminaron su registro' },
  { clave: 'activos', nombre: 'Clientes activos', ayuda: 'Ganaron al menos un punto' },
  { clave: 'canjes', nombre: 'Cupones generados', ayuda: 'Cupones generados con la palabra secreta (+1)' },
  { clave: 'escaneos', nombre: 'Canjes', ayuda: 'Cupones canjeados en el mostrador (+10)' },
  { clave: 'conversion', nombre: 'Conversión a canje', ayuda: 'De los cupones generados en el rango, cuántos ya se canjearon', formato: fmtPct },
  { clave: 'mediana_horas', nombre: 'De generado a canjeado', ayuda: 'Mediana de horas entre generar el cupón y canjearlo', formato: n => (n == null ? '—' : `${fmt(n)} h`) },
  { clave: 'puntos', nombre: 'Puntos otorgados', ayuda: 'Suma de +1 y +10 del rango' },
]

function Cambio({ actual, anterior }: { actual: number | null; anterior: number | null }) {
  if (actual == null || anterior == null) return <span className="text-brand-gris">sin comparación</span>
  if (anterior === 0) return <span className="text-brand-gris">{actual === 0 ? 'igual' : 'antes: 0'}</span>
  const pct = Math.round(((actual - anterior) / anterior) * 100)
  // El cambio va en tinta neutra con flecha: subir no siempre es bueno (más horas hasta el canje, no).
  const Icono = pct > 0 ? ArrowUpRight : pct < 0 ? ArrowDownRight : Minus
  return (
    <span className="inline-flex items-center gap-0.5 text-brand-gris">
      <Icono className="w-3.5 h-3.5" aria-hidden="true" />
      {pct > 0 ? '+' : ''}{pct} % <span className="sr-only">contra el periodo anterior</span>
      <span aria-hidden="true" className="ml-1">vs. {fmt(anterior)}</span>
    </span>
  )
}

function Cifras({ resumen, comparar }: { resumen: Resumen; comparar: boolean }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {KPIS.map(k => {
        const valor = resumen.actual[k.clave]
        return (
          <div key={k.clave} className="bg-white rounded-3xl border border-brand-grisclaro/70 p-4 flex flex-col gap-1 min-w-0" title={k.ayuda}>
            <p className="font-body text-xs text-brand-gris truncate">{k.nombre}</p>
            {/* Cifras grandes con números proporcionales: tabular-nums solo donde se alinean en columna. */}
            <p className="font-body font-extrabold text-brand-sombra text-2xl leading-tight">
              {(k.formato ?? fmt)(valor)}
            </p>
            {comparar && (
              <p className="font-body text-[11px]">
                <Cambio actual={valor} anterior={resumen.anterior[k.clave]} />
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Serie en el tiempo ───────────────────────────────────────────────────────

const SERIES = [
  { clave: 'canjes', nombre: 'Cupones generados', color: COLOR.canjes },
  { clave: 'escaneos', nombre: 'Canjes', color: COLOR.escaneos },
  { clave: 'altas', nombre: 'Altas', color: COLOR.altas },
] as const

type ClaveSerie = (typeof SERIES)[number]['clave']

function etiquetaCubeta(cubeta: string, granularidad: Granularidad): string {
  if (granularidad === 'month') {
    const [a, m] = cubeta.split('-').map(Number)
    return `${MESES_CORTOS[m - 1]} ${String(a).slice(2)}`
  }
  return granularidad === 'week' ? `sem. ${fechaCorta(cubeta)}` : fechaCorta(cubeta)
}

function TooltipSerie({ active, payload, label, granularidad }: PropsTooltip & { granularidad: Granularidad }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-2xl border border-brand-grisclaro bg-white px-3 py-2 shadow-md font-body text-xs">
      <p className="text-brand-gris mb-1">{etiquetaCubeta(String(label), granularidad)}</p>
      {payload.map(p => (
        <p key={String(p.dataKey)} className="flex items-center gap-2">
          <Clave color={String(p.color)} />
          {/* El valor manda; el nombre de la serie va detrás. */}
          <span className="font-extrabold text-brand-sombra tabular-nums">{fmt(Number(p.value))}</span>
          <span className="text-brand-gris">{String(p.name)}</span>
        </p>
      ))}
    </div>
  )
}

function GraficaSerie({ serie, granularidad }: { serie: PuntoSerie[]; granularidad: Granularidad }) {
  // Se pueden apagar series desde la leyenda; el color sigue a la serie, no a su posición.
  const [ocultas, setOcultas] = useState<Set<ClaveSerie>>(new Set())
  const visibles = SERIES.filter(s => !ocultas.has(s.clave))
  const alternar = (c: ClaveSerie) => setOcultas(prev => {
    const nuevo = new Set(prev)
    if (nuevo.has(c)) nuevo.delete(c)
    else nuevo.add(c)
    return nuevo
  })

  const tabla = (
    <TablaSimple
      columnas={['Periodo', ...SERIES.map(s => s.nombre), 'Activos']}
      filas={serie.map(p => [etiquetaCubeta(p.cubeta, granularidad), fmt(p.canjes), fmt(p.escaneos), fmt(p.altas), fmt(p.activos)])}
    />
  )

  return (
    <Tarjeta
      titulo="En el tiempo"
      subtitulo="Cada punto cuenta el día en que se ganó: el cupón el día que se genera con la palabra, el canje el día que se escanea en tienda."
      tabla={tabla}
    >
      {/* Leyenda siempre presente con dos o más series; también sirve para apagar una. */}
      <div className="flex flex-wrap gap-2">
        {SERIES.map(s => (
          <button
            key={s.clave}
            type="button"
            aria-pressed={!ocultas.has(s.clave)}
            onClick={() => alternar(s.clave)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1 font-body text-xs transition-opacity',
              ocultas.has(s.clave) ? 'opacity-40 border-brand-grisclaro' : 'border-brand-grisclaro'
            )}
          >
            <Clave color={s.color} />
            <span className="text-brand-sombra">{s.nombre}</span>
          </button>
        ))}
      </div>

      {serie.length === 0 ? <SinDatos /> : (
        <div className="h-64 -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={serie} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={REJILLA} />
              <XAxis
                dataKey="cubeta"
                tickFormatter={c => etiquetaCubeta(String(c), granularidad)}
                tick={{ fontSize: 11, fill: TINTA_SECUNDARIA }}
                tickLine={false}
                axisLine={{ stroke: REJILLA }}
                minTickGap={24}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: TINTA_SECUNDARIA }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                content={props => <TooltipSerie {...props} granularidad={granularidad} />}
                cursor={{ stroke: TINTA_SECUNDARIA, strokeWidth: 1 }}
              />
              {visibles.map(s => (
                <Line
                  key={s.clave}
                  type="monotone"
                  dataKey={s.clave}
                  name={s.nombre}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: '#FFFFFF' }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Tarjeta>
  )
}

// ─── Qué datos opcionales nos dan ─────────────────────────────────────────────

function DatosOpcionales({ perfil }: { perfil: Resumen['perfil'] }) {
  const filas = [
    { nombre: 'Permiso de WhatsApp', n: perfil.con_whatsapp },
    { nombre: 'Teléfono', n: perfil.con_telefono },
    { nombre: 'Nombre', n: perfil.con_nombre },
    { nombre: 'Cumpleaños', n: perfil.con_cumple },
  ]
  const pct = (n: number) => (perfil.clientes ? Math.round((n / perfil.clientes) * 100) : 0)
  return (
    <Tarjeta
      titulo="Datos que nos dan"
      subtitulo={`De ${fmt(perfil.clientes)} clientes del segmento, hoy. Todos son opcionales.`}
    >
      <ul className="flex flex-col gap-3">
        {filas.map(f => (
          <li key={f.nombre} className="flex flex-col gap-1">
            <div className="flex justify-between font-body text-sm">
              <span className="text-brand-sombra">{f.nombre}</span>
              <span className="text-brand-gris tabular-nums">{fmt(f.n)} · <strong className="text-brand-sombra">{pct(f.n)} %</strong></span>
            </div>
            <div className="h-2 rounded-full bg-brand-papel overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${pct(f.n)}%`, background: COLOR.canjes }} />
            </div>
          </li>
        ))}
      </ul>
    </Tarjeta>
  )
}

export default function PanelResumen({
  resumen,
  serie,
  granularidad,
  comparar,
}: {
  resumen: Resumen | null
  serie: PuntoSerie[] | null
  granularidad: Granularidad
  comparar: boolean
}) {
  return (
    <div className="flex flex-col gap-4">
      {resumen && <Cifras resumen={resumen} comparar={comparar} />}
      <div className="grid lg:grid-cols-3 gap-4">
        {serie && <div className="lg:col-span-2 min-w-0"><GraficaSerie serie={serie} granularidad={granularidad} /></div>}
        {resumen && <DatosOpcionales perfil={resumen.perfil} />}
      </div>
    </div>
  )
}
