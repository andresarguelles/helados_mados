import { useMemo, useState } from 'react'
import { cn } from '../../lib/utils'
import type { CeldaHorario } from '../../lib/metricas'
import { RAMPA, SinDatos, TablaSimple, Tarjeta, VACIO, colorDeRampa, fmt } from './comun'

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const DIAS_LARGOS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
const HORAS = Array.from({ length: 24 }, (_, h) => h)

type Medida = 'canjes' | 'escaneos'

/**
 * Cuándo pasa todo: día de la semana × hora, en hora de Ciudad de México. Sirve para elegir
 * a qué hora hacer el Live y cuánta gente poner en el mostrador.
 */
export default function PanelHorarios({ celdas }: { celdas: CeldaHorario[] }) {
  const [medida, setMedida] = useState<Medida>('canjes')
  const [foco, setFoco] = useState<{ dia: number; hora: number } | null>(null)

  const { valor, maximo, total, porDia, porHora } = useMemo(() => {
    const mapa = new Map<string, number>()
    const porDia = Array(7).fill(0) as number[]
    const porHora = Array(24).fill(0) as number[]
    let maximo = 0
    let total = 0
    for (const c of celdas) {
      const v = c[medida]
      mapa.set(`${c.dia}-${c.hora}`, v)
      porDia[c.dia - 1] += v
      porHora[c.hora] += v
      maximo = Math.max(maximo, v)
      total += v
    }
    return { valor: (d: number, h: number) => mapa.get(`${d}-${h}`) ?? 0, maximo, total, porDia, porHora }
  }, [celdas, medida])

  const nombreMedida = medida === 'canjes' ? 'canjes' : 'cobros en tienda'
  const pico = porHora.indexOf(Math.max(...porHora))
  const diaPico = porDia.indexOf(Math.max(...porDia))

  const lectura = foco
    ? `${DIAS_LARGOS[foco.dia - 1]} de ${foco.hora}:00 a ${foco.hora + 1}:00 — ${fmt(valor(foco.dia, foco.hora))} ${nombreMedida}`
    : total > 0
      ? `Hora más fuerte: ${pico}:00–${pico + 1}:00 · día más fuerte: ${DIAS_LARGOS[diaPico]}`
      : ''

  const tabla = (
    <TablaSimple
      columnas={['Hora', ...DIAS]}
      filas={HORAS.map(h => [`${h}:00`, ...DIAS.map((_, i) => fmt(valor(i + 1, h)))])}
    />
  )

  return (
    <Tarjeta
      titulo="¿Cuándo pasa?"
      subtitulo="Por día de la semana y hora, en hora de Ciudad de México. Más oscuro, más actividad."
      tabla={tabla}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-brand-grisclaro bg-white p-0.5" role="radiogroup" aria-label="Qué medir">
          {(['canjes', 'escaneos'] as const).map(m => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={medida === m}
              onClick={() => setMedida(m)}
              className={cn(
                'rounded-full px-3 py-1 font-body text-xs font-bold transition-colors',
                medida === m ? 'bg-brand-azul text-white' : 'text-brand-gris hover:text-brand-sombra'
              )}
            >
              {m === 'canjes' ? 'Canjes' : 'Cobros en tienda'}
            </button>
          ))}
        </div>
        <p className="font-body text-xs text-brand-gris min-h-[1rem]" aria-live="polite">{lectura}</p>
      </div>

      {total === 0 ? <SinDatos /> : (
        <div className="overflow-x-auto">
          <div className="min-w-[34rem]">
            <div className="grid gap-[2px]" style={{ gridTemplateColumns: '2.5rem repeat(24, minmax(0, 1fr))' }}>
              <span />
              {HORAS.map(h => (
                <span key={h} className="font-body text-[10px] text-brand-gris text-center tabular-nums">
                  {h % 3 === 0 ? h : ''}
                </span>
              ))}
              {DIAS.map((dia, i) => (
                <FilaDia
                  key={dia}
                  nombre={dia}
                  dia={i + 1}
                  valor={valor}
                  maximo={maximo}
                  foco={foco}
                  onFoco={setFoco}
                />
              ))}
            </div>

            {/* La escala, siempre: el color de una celda no se lee sin ella. */}
            <div className="flex items-center gap-2 mt-3 font-body text-[11px] text-brand-gris">
              <span>0</span>
              <span className="w-4 h-3 rounded-[3px]" style={{ background: VACIO }} />
              {RAMPA.map(c => <span key={c} className="w-6 h-3 rounded-[3px]" style={{ background: c }} />)}
              <span className="tabular-nums">{fmt(maximo)} por hora</span>
            </div>
          </div>
        </div>
      )}
    </Tarjeta>
  )
}

function FilaDia({
  nombre, dia, valor, maximo, foco, onFoco,
}: {
  nombre: string
  dia: number
  valor: (d: number, h: number) => number
  maximo: number
  foco: { dia: number; hora: number } | null
  onFoco: (f: { dia: number; hora: number } | null) => void
}) {
  return (
    <>
      <span className="font-body text-[11px] text-brand-gris self-center">{nombre}</span>
      {HORAS.map(h => {
        const v = valor(dia, h)
        const activa = foco?.dia === dia && foco.hora === h
        return (
          <span
            key={h}
            tabIndex={0}
            role="img"
            aria-label={`${nombre} ${h}:00, ${v}`}
            onPointerEnter={() => onFoco({ dia, hora: h })}
            onPointerLeave={() => onFoco(null)}
            onFocus={() => onFoco({ dia, hora: h })}
            onBlur={() => onFoco(null)}
            className={cn('h-6 rounded-[4px] outline-none transition-shadow', activa && 'ring-2 ring-brand-sombra ring-offset-1')}
            style={{ background: colorDeRampa(maximo ? v / maximo : 0) }}
          />
        )
      })}
    </>
  )
}
