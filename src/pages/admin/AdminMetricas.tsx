import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as Tabs from '@radix-ui/react-tabs'
import { Loader2 } from 'lucide-react'
import AdminHeader from '../../components/admin/AdminHeader'
import { useBottomNavVisible } from '../../components/layout/BottomNav'
import BarraFiltros, { type EstadoFiltros, type OpcionDinamica } from '../../components/metricas/BarraFiltros'
import PanelResumen from '../../components/metricas/PanelResumen'
import PanelHorarios from '../../components/metricas/PanelHorarios'
import PanelDinamicas from '../../components/metricas/PanelDinamicas'
import PanelClientes from '../../components/metricas/PanelClientes'
import PanelEquipo from '../../components/metricas/PanelEquipo'
import { useConsulta, MENSAJE_ERROR } from '../../components/metricas/useConsulta'
import { fechaCorta } from '../../components/metricas/comun'
import { cn } from '../../lib/utils'
import {
  aFiltros, fechasDeRango, fetchOpcionesDinamicas, granularidadSugerida, hoyMx, metricas, sumarDias,
  RANGOS, SEGMENTOS, type Filtros, type Granularidad, type Rango, type Segmento,
} from '../../lib/metricas'

const PESTANAS = [
  { valor: 'resumen', nombre: 'Resumen' },
  { valor: 'horarios', nombre: 'Horarios' },
  { valor: 'dinamicas', nombre: 'Dinámicas' },
  { valor: 'clientes', nombre: 'Clientes' },
  { valor: 'equipo', nombre: 'Equipo' },
] as const

type Pestana = (typeof PESTANAS)[number]['valor']

const esFecha = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v)

/**
 * Los filtros viven en la URL: una vista se puede recargar, guardar o compartir tal cual.
 * Esta ruta es `spa` y nunca se prerenderiza, así que `useSearchParams` en el render es seguro.
 */
function useFiltrosEnUrl() {
  const [params, setParams] = useSearchParams()

  const estado: EstadoFiltros & { pestana: Pestana } = useMemo(() => {
    const rango = ([...RANGOS.map(r => r.valor), 'custom'] as string[]).includes(params.get('rango') ?? '')
      ? (params.get('rango') as Rango)
      : '30d'
    const hoy = hoyMx()
    const desde = esFecha(params.get('desde')) ? params.get('desde')! : sumarDias(hoy, -29)
    const hasta = esFecha(params.get('hasta')) ? params.get('hasta')! : hoy
    const fechas = fechasDeRango(rango, { desde, hasta })
    const gran = params.get('gran')
    return {
      pestana: (PESTANAS.find(p => p.valor === params.get('tab'))?.valor ?? 'resumen') as Pestana,
      rango,
      desde: fechas.desde,
      hasta: fechas.hasta,
      dinamicas: (params.get('din') ?? '').split(',').filter(Boolean),
      segmento: (SEGMENTOS.find(s => s.valor === params.get('seg'))?.valor ?? 'todos') as Segmento,
      granularidad: (gran === 'day' || gran === 'week' || gran === 'month') ? gran : granularidadSugerida(fechas),
      comparar: params.get('comparar') !== '0',
    }
  }, [params])

  const cambiar = (cambio: Partial<EstadoFiltros & { pestana: Pestana }>) => {
    const siguiente = { ...estado, ...cambio }
    const p = new URLSearchParams()
    if (siguiente.pestana !== 'resumen') p.set('tab', siguiente.pestana)
    p.set('rango', siguiente.rango)
    if (siguiente.rango === 'custom') {
      p.set('desde', siguiente.desde)
      p.set('hasta', siguiente.hasta)
    }
    if (siguiente.dinamicas.length) p.set('din', siguiente.dinamicas.join(','))
    if (siguiente.segmento !== 'todos') p.set('seg', siguiente.segmento)
    // La granularidad solo se fija si alguien la eligió; si no, se ajusta sola al rango.
    if ('granularidad' in cambio || params.has('gran')) p.set('gran', siguiente.granularidad)
    if (!siguiente.comparar) p.set('comparar', '0')
    setParams(p, { replace: true })
  }

  return { estado, cambiar }
}

export default function AdminMetricas() {
  const navVisible = useBottomNavVisible()
  const { estado, cambiar } = useFiltrosEnUrl()
  const [opciones, setOpciones] = useState<OpcionDinamica[]>([])

  useEffect(() => { void fetchOpcionesDinamicas().then(setOpciones) }, [])

  const filtros = useMemo(
    () => aFiltros({ desde: estado.desde, hasta: estado.hasta }, estado.dinamicas, estado.segmento),
    [estado.desde, estado.hasta, estado.dinamicas, estado.segmento],
  )
  const clave = JSON.stringify(filtros)
  const rotulo = estado.desde === estado.hasta
    ? fechaCorta(estado.desde)
    : `${fechaCorta(estado.desde)} – ${fechaCorta(estado.hasta)}`

  return (
    <div className={cn('min-h-screen bg-brand-papel', navVisible && 'pb-24')}>
      <AdminHeader title="Métricas" />

      <main className="max-w-6xl mx-auto px-4 pt-20 pb-8 flex flex-col gap-5">
        <Tabs.Root value={estado.pestana} onValueChange={v => cambiar({ pestana: v as Pestana })} className="flex flex-col gap-5">
          <Tabs.List aria-label="Secciones de métricas" className="flex gap-1 overflow-x-auto -mx-4 px-4 border-b border-brand-grisclaro">
            {PESTANAS.map(p => (
              <Tabs.Trigger
                key={p.valor}
                value={p.valor}
                className="shrink-0 px-3 py-2.5 font-heading text-sm text-brand-gris border-b-2 border-transparent -mb-px data-[state=active]:text-brand-sombra data-[state=active]:border-brand-azul hover:text-brand-sombra transition-colors"
              >
                {p.nombre}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          {/* Equipo no depende de los filtros: no tiene sentido mostrarlos ahí. */}
          {estado.pestana !== 'equipo' && (
            <div className="flex flex-col gap-2">
              <BarraFiltros
                estado={estado}
                dinamicas={opciones}
                onCambio={cambiar}
                mostrarGranularidad={estado.pestana === 'resumen'}
              />
              <p className="font-body text-xs text-brand-gris">
                Mostrando <strong className="text-brand-sombra">{rotulo}</strong>, en hora de Ciudad de México.
                Solo cuentan clientes: el personal no.
              </p>
            </div>
          )}

          <Tabs.Content value="resumen">
            <TabResumen filtros={filtros} clave={clave} granularidad={estado.granularidad} comparar={estado.comparar} />
          </Tabs.Content>
          <Tabs.Content value="horarios">
            <TabHorarios filtros={filtros} clave={clave} />
          </Tabs.Content>
          <Tabs.Content value="dinamicas">
            <TabDinamicas filtros={filtros} clave={clave} />
          </Tabs.Content>
          <Tabs.Content value="clientes">
            <TabClientes filtros={filtros} clave={clave} />
          </Tabs.Content>
          <Tabs.Content value="equipo">
            <PanelEquipo />
          </Tabs.Content>
        </Tabs.Root>
      </main>
    </div>
  )
}

/**
 * Lo común a cada pestaña: la primera vez, un spinner; después, al recargar, se atenúa lo
 * anterior en vez de vaciarlo (sin saltos de layout).
 */
function Estado({ cargando, error, hayDatos, children }: { cargando: boolean; error: string | null; hayDatos: boolean; children: ReactNode }) {
  if (error && !hayDatos) {
    return <p className="font-body text-sm text-brand-rosa py-6">{MENSAJE_ERROR[error] ?? MENSAJE_ERROR.error}</p>
  }
  if (!hayDatos) {
    return <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand-azul" /></div>
  }
  return (
    <div className={cn('transition-opacity', cargando && 'opacity-50')} aria-busy={cargando}>
      {error && <p className="font-body text-sm text-brand-rosa mb-3">{MENSAJE_ERROR[error] ?? MENSAJE_ERROR.error}</p>}
      {children}
    </div>
  )
}

function TabResumen({ filtros, clave, granularidad, comparar }: { filtros: Filtros; clave: string; granularidad: Granularidad; comparar: boolean }) {
  const resumen = useConsulta(() => metricas.resumen(filtros), clave)
  const serie = useConsulta(() => metricas.serie(filtros, granularidad), `${clave}|${granularidad}`)
  return (
    <Estado cargando={resumen.cargando || serie.cargando} error={resumen.error ?? serie.error} hayDatos={!!resumen.datos || !!serie.datos}>
      <PanelResumen resumen={resumen.datos} serie={serie.datos} granularidad={granularidad} comparar={comparar} />
    </Estado>
  )
}

function TabHorarios({ filtros, clave }: { filtros: Filtros; clave: string }) {
  const { datos, cargando, error } = useConsulta(() => metricas.horarios(filtros), clave)
  return (
    <Estado cargando={cargando} error={error} hayDatos={!!datos}>
      {datos && <PanelHorarios celdas={datos} />}
    </Estado>
  )
}

function TabDinamicas({ filtros, clave }: { filtros: Filtros; clave: string }) {
  const { datos, cargando, error } = useConsulta(() => metricas.dinamicas(filtros), clave)
  return (
    <Estado cargando={cargando} error={error} hayDatos={!!datos}>
      {datos && <PanelDinamicas dinamicas={datos} />}
    </Estado>
  )
}

function TabClientes({ filtros, clave }: { filtros: Filtros; clave: string }) {
  const { datos, cargando, error } = useConsulta(() => metricas.clientes(filtros), clave)
  return (
    <Estado cargando={cargando} error={error} hayDatos={!!datos}>
      <PanelClientes datos={datos} filtros={filtros} clave={clave} />
    </Estado>
  )
}
