import { useState } from 'react'
import { EyeOff, MessageCircle } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { cn } from '../../lib/utils'
import { formatPhone } from '../../lib/phone'
import { excluirDeListas, metricas, type Filtros, type Lista, type MetricasClientes } from '../../lib/metricas'
import ConfirmDialog from '../ui/ConfirmDialog'
import { useConsulta, MENSAJE_ERROR } from './useConsulta'
import {
  COLOR, RAMPA, REJILLA, TINTA_SECUNDARIA, MESES_CORTOS, SinDatos, TablaSimple, Tarjeta,
  colorDeRampa, fechaCorta, fechaHora, fmt, tintaSobre, type PropsTooltip,
} from './comun'

// ─── Embudo ───────────────────────────────────────────────────────────────────

function Embudo({ embudo }: { embudo: MetricasClientes['embudo'] }) {
  // Etapas ordenadas: rampa ordinal, de clara a oscura.
  const pasos = [
    { nombre: 'Entraron con Google', n: embudo.cuentas },
    { nombre: 'Terminaron el registro', n: embudo.con_alta },
    { nombre: 'Canjearon una palabra', n: embudo.con_canje },
    { nombre: 'Cobraron en tienda', n: embudo.con_escaneo },
    { nombre: 'Cobraron dos veces o más', n: embudo.recurrentes },
  ]
  const base = embudo.cuentas || 1
  return (
    <Tarjeta
      titulo="Embudo"
      subtitulo="De las cuentas creadas en el rango: hasta dónde llegaron (hasta hoy)."
      tabla={<TablaSimple columnas={['Paso', 'Cuentas', '% del inicio']} filas={pasos.map(p => [p.nombre, fmt(p.n), `${Math.round((p.n / base) * 100)} %`])} />}
    >
      {embudo.cuentas === 0 ? <SinDatos texto="Nadie creó su cuenta en este rango." /> : (
        <ol className="flex flex-col gap-2">
          {pasos.map((p, i) => {
            const pct = Math.round((p.n / base) * 100)
            const previo = i > 0 ? pasos[i - 1].n : null
            return (
              <li key={p.nombre} className="flex flex-col gap-1">
                <div className="flex justify-between gap-3 font-body text-sm">
                  <span className="text-brand-sombra">{p.nombre}</span>
                  <span className="text-brand-gris tabular-nums shrink-0">
                    <strong className="text-brand-sombra">{fmt(p.n)}</strong> · {pct} %
                    {previo ? <span className="hidden sm:inline"> · {Math.round((p.n / previo) * 100)} % del paso anterior</span> : null}
                  </span>
                </div>
                <div className="h-3 rounded-[4px] bg-brand-papel overflow-hidden">
                  <div className="h-full rounded-[4px]" style={{ width: `${Math.max(pct, p.n > 0 ? 1 : 0)}%`, background: RAMPA[i] }} />
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </Tarjeta>
  )
}

// ─── Barras simples (frecuencia y cumpleaños) ────────────────────────────────

function TooltipBarra({ active, payload, label, unidad }: PropsTooltip & { unidad: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-2xl border border-brand-grisclaro bg-white px-3 py-2 shadow-md font-body text-xs">
      <p className="font-extrabold text-brand-sombra tabular-nums">{fmt(Number(payload[0].value))} <span className="font-normal text-brand-gris">{unidad}</span></p>
      <p className="text-brand-gris">{String(label)}</p>
    </div>
  )
}

function Barras({ datos, colores, unidad }: { datos: { etiqueta: string; valor: number }[]; colores: string[] | string; unidad: string }) {
  return (
    <div className="h-52 -ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap={4}>
          <CartesianGrid vertical={false} stroke={REJILLA} />
          <XAxis dataKey="etiqueta" tick={{ fontSize: 11, fill: TINTA_SECUNDARIA }} tickLine={false} axisLine={{ stroke: REJILLA }} interval={0} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: TINTA_SECUNDARIA }} tickLine={false} axisLine={false} width={36} />
          <Tooltip content={props => <TooltipBarra {...props} unidad={unidad} />} cursor={{ fill: '#F4F6FB' }} />
          {/* Esquinas redondeadas solo en la punta; la base queda pegada al eje. */}
          <Bar dataKey="valor" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {datos.map((d, i) => (
              <Cell key={d.etiqueta} fill={Array.isArray(colores) ? colores[i % colores.length] : colores} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function Frecuencia({ frecuencia }: { frecuencia: MetricasClientes['frecuencia'] }) {
  const datos = frecuencia.map(f => ({ etiqueta: `${f.rango}`, valor: f.clientes }))
  return (
    <Tarjeta
      titulo="¿Cuántas veces canjean?"
      subtitulo="Clientes activos del rango, según cuántas palabras canjearon."
      tabla={<TablaSimple columnas={['Canjes', 'Clientes']} filas={frecuencia.map(f => [f.rango, fmt(f.clientes)])} />}
    >
      {datos.length === 0 ? <SinDatos /> : <Barras datos={datos} colores={[...RAMPA]} unidad="clientes" />}
    </Tarjeta>
  )
}

function CumpleanosPorMes({ meses }: { meses: MetricasClientes['cumpleanos_por_mes'] }) {
  const datos = MESES_CORTOS.map((m, i) => ({ etiqueta: m, valor: meses.find(x => x.mes === i + 1)?.clientes ?? 0 }))
  const total = datos.reduce((s, d) => s + d.valor, 0)
  return (
    <Tarjeta
      titulo="Cumpleaños por mes"
      subtitulo={`De los ${fmt(total)} clientes que nos dieron su cumpleaños.`}
      tabla={<TablaSimple columnas={['Mes', 'Clientes']} filas={datos.map(d => [d.etiqueta, fmt(d.valor)])} />}
    >
      {total === 0 ? <SinDatos texto="Nadie del segmento nos ha dado su cumpleaños." /> : <Barras datos={datos} colores={COLOR.altas} unidad="cumpleaños" />}
    </Tarjeta>
  )
}

// ─── Cohortes ─────────────────────────────────────────────────────────────────

function Cohortes({ cohortes }: { cohortes: MetricasClientes['cohortes'] }) {
  const semanas = Array.from({ length: 9 }, (_, k) => k)
  return (
    <Tarjeta
      titulo="¿Regresan?"
      subtitulo="Por semana de alta: qué porcentaje ganó algún punto esa semana (0) y las siguientes."
    >
      {cohortes.length === 0 ? <SinDatos texto="Nadie se dio de alta en este rango." /> : (
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full min-w-[36rem] font-body text-xs border-separate" style={{ borderSpacing: 2 }}>
            <thead>
              <tr>
                <th className="text-left font-bold text-brand-gris pr-2 py-1">Semana de alta</th>
                <th className="text-right font-bold text-brand-gris pr-2">Clientes</th>
                {semanas.map(k => <th key={k} className="text-center font-bold text-brand-gris w-10">{k}</th>)}
              </tr>
            </thead>
            <tbody>
              {cohortes.map(c => (
                <tr key={c.semana}>
                  <td className="text-brand-sombra pr-2 whitespace-nowrap">{fechaCorta(c.semana)}</td>
                  <td className="text-right tabular-nums text-brand-sombra pr-2">{fmt(c.clientes)}</td>
                  {semanas.map(k => {
                    const v = c.retencion?.[k]
                    if (v == null) return <td key={k} />
                    const fondo = colorDeRampa(v / 100)
                    return (
                      <td
                        key={k}
                        className="text-center tabular-nums rounded-[4px] py-1.5"
                        style={{ background: fondo, color: tintaSobre(fondo) }}
                        title={`Semana ${k}: ${v} %`}
                      >
                        {Math.round(v)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Tarjeta>
  )
}

// ─── Listas ───────────────────────────────────────────────────────────────────

const LISTAS: { valor: Lista; nombre: string; ayuda: string }[] = [
  { valor: 'top', nombre: 'Más participativos', ayuda: 'Más puntos ganados en el rango.' },
  { valor: 'en_riesgo', nombre: 'Dejaron de venir', ayuda: 'Dos o más cupones, y ningún punto en 21 días.' },
  { valor: 'cumpleanos', nombre: 'Cumplen pronto', ayuda: 'Cumpleaños en los próximos 30 días.' },
  { valor: 'nuevos', nombre: 'Nuevos', ayuda: 'Crearon su cuenta en el rango.' },
]

function Listas({ filtros, clave }: { filtros: Filtros; clave: string }) {
  const [lista, setLista] = useState<Lista>('top')
  const [recarga, setRecarga] = useState(0)
  const [aExcluir, setAExcluir] = useState<{ id: string; username: string } | null>(null)
  const { datos, cargando, error } = useConsulta(() => metricas.lista(filtros, lista), `${clave}|${lista}|${recarga}`)
  const ayuda = LISTAS.find(l => l.valor === lista)?.ayuda

  const excluir = async () => {
    if (!aExcluir) return
    await excluirDeListas(aExcluir.id, true)
    setAExcluir(null)
    setRecarga(n => n + 1)
  }

  return (
    <Tarjeta
      titulo="Listas de clientes"
      subtitulo={<>
        Para ofrecer promociones. El teléfono solo aparece si el cliente dio permiso de WhatsApp.
        Quien pida no figurar se excluye con <EyeOff className="inline w-3 h-3" aria-label="excluir" />.
      </>}
    >
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5" role="tablist" aria-label="Lista">
        {LISTAS.map(l => (
          <button
            key={l.valor}
            type="button"
            role="tab"
            aria-selected={lista === l.valor}
            onClick={() => setLista(l.valor)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 font-body text-xs font-bold border transition-colors',
              lista === l.valor ? 'bg-brand-sombra text-white border-brand-sombra' : 'bg-white text-brand-gris border-brand-grisclaro hover:text-brand-sombra'
            )}
          >
            {l.nombre}
          </button>
        ))}
      </div>
      <p className="font-body text-xs text-brand-gris -mt-2">
        {ayuda}{datos ? ` ${fmt(datos.total)} en total${datos.total > datos.filas.length ? `; se muestran los primeros ${datos.filas.length}` : ''}.` : ''}
      </p>

      {error ? <p className="font-body text-sm text-brand-rosa">{MENSAJE_ERROR[error] ?? MENSAJE_ERROR.error}</p>
        : !datos ? null
        : datos.filas.length === 0 ? <SinDatos texto="Nadie en esta lista." />
        : (
          <div className={cn('overflow-x-auto -mx-5 px-5 transition-opacity', cargando && 'opacity-50')}>
            <table className="w-full min-w-[40rem] text-sm font-body">
              <thead>
                <tr className="border-b border-brand-grisclaro text-xs text-brand-gris">
                  <th className="text-left py-2 pr-3 font-bold">Apodo</th>
                  <th className="text-right py-2 pr-3 font-bold">Puntos rango</th>
                  <th className="text-right py-2 pr-3 font-bold">Total</th>
                  <th className="text-right py-2 pr-3 font-bold">Último punto</th>
                  <th className="text-right py-2 pr-3 font-bold">Cumpleaños</th>
                  <th className="text-left py-2 pr-3 font-bold">WhatsApp</th>
                  <th className="py-2"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {datos.filas.map(f => (
                  <tr key={f.id} className="border-b border-brand-grisclaro/50 last:border-0">
                    <td className="py-2 pr-3 font-bold text-brand-sombra">{f.username}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{fmt(f.puntos_periodo)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{fmt(f.total_points)}</td>
                    <td className="py-2 pr-3 text-right whitespace-nowrap">{fechaHora(f.ultimo_punto)}</td>
                    <td className="py-2 pr-3 text-right whitespace-nowrap">
                      {f.cumple_mes && f.cumple_dia
                        ? <>{f.cumple_dia} {MESES_CORTOS[f.cumple_mes - 1]}{lista === 'cumpleanos' && f.dias_para_cumple != null && <span className="text-brand-gris"> · {f.dias_para_cumple === 0 ? 'hoy' : `en ${f.dias_para_cumple} d`}</span>}</>
                        : '—'}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {f.telefono
                        ? <span className="inline-flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5 text-brand-azul" aria-hidden="true" />{formatPhone(f.telefono)}</span>
                        : <span className="text-brand-gris">{f.whatsapp ? 'sí' : 'no'}</span>}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setAExcluir({ id: f.id, username: f.username })}
                        aria-label={`Excluir a ${f.username} de las listas`}
                        title="Pidió no figurar en las listas"
                        className="text-brand-gris hover:text-brand-rosa transition-colors p-1"
                      >
                        <EyeOff className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      <ConfirmDialog
        open={aExcluir !== null}
        icon={<EyeOff className="w-5 h-5 text-brand-rosa" />}
        title={`¿Excluir a ${aExcluir?.username ?? ''}?`}
        description="Úsalo cuando el cliente pidió no recibir promociones personalizadas. Deja de aparecer en estas listas, pero sus cifras siguen contando en las gráficas, que no identifican a nadie."
        confirmLabel="Excluir de las listas"
        onConfirm={() => { void excluir() }}
        onCancel={() => setAExcluir(null)}
      />
    </Tarjeta>
  )
}

export default function PanelClientes({ datos, filtros, clave }: { datos: MetricasClientes | null; filtros: Filtros; clave: string }) {
  return (
    <div className="flex flex-col gap-4">
      {datos && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Embudo embudo={datos.embudo} />
          <Frecuencia frecuencia={datos.frecuencia} />
          <Cohortes cohortes={datos.cohortes} />
          <CumpleanosPorMes meses={datos.cumpleanos_por_mes} />
        </div>
      )}
      <Listas filtros={filtros} clave={clave} />
    </div>
  )
}
