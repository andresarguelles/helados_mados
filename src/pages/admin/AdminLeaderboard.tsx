import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Sparkle } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useStore, type LeaderboardEntry, type LeaderboardPeriod } from '../../lib/store'
import { cn } from '../../lib/utils'
import { NEGOCIO, SITE_URL } from '../../content/negocio'
import { KioscoMarco } from '../../components/kiosco/KioscoShell'
import { tamanoQueCabe } from '../../components/kiosco/tamano'
import { Card } from '../../components/ui/Card'
import { ScrollArea } from '../../components/ui/ScrollArea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table'

/** Cada cuánto se vuelve a pedir el marcador. Un minuto basta para una pantalla de pared. */
const REFRESCO_MS = 60_000
/** Top 10: tres en el podio y siete en la lista, sin desplazarse. */
const FILAS = 10

// Lo que se teclea en la URL de cada monitor: /admin/leaderboard?periodo=semana.
const PERIODOS: { clave: string; period: LeaderboardPeriod; pestana: string; encabezado: string }[] = [
  { clave: 'hoy', period: 'day', pestana: 'Hoy', encabezado: 'Ranking de hoy' },
  { clave: 'semana', period: 'week', pestana: 'Semana', encabezado: 'Ranking de la semana' },
  { clave: 'mes', period: 'month', pestana: 'Mes', encabezado: 'Ranking del mes' },
  { clave: 'historico', period: 'all', pestana: 'Histórico', encabezado: 'Ranking histórico' },
]
const HISTORICO = PERIODOS[3]

/** `?periodo=Histórico` también vale: sin acentos ni mayúsculas. Cualquier otra cosa, histórico. */
function periodoDe(valor: string | null) {
  const clave = (valor ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
  return PERIODOS.find(p => p.clave === clave) ?? HISTORICO
}

const formatoHora = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

/** La hora de la pared, al minuto. */
function useHora(): string {
  const [hora, setHora] = useState(() => formatoHora.format(new Date()))
  useEffect(() => {
    // Cada segundo y no cada minuto: así nunca va un minuto atrasada. React descarta el
    // render cuando el texto no cambió.
    const id = window.setInterval(() => setHora(formatoHora.format(new Date())), 1000)
    return () => window.clearInterval(id)
  }, [])
  return hora
}

/**
 * El marcador del periodo, refrescado cada minuto y al volver a ser visible. Un fallo
 * conserva lo último que se pintó: un corte de red no debe dejar la pared en blanco.
 * `entries` es null hasta la primera respuesta buena.
 */
function useMarcador(period: LeaderboardPeriod) {
  const fetchLeaderboard = useStore(s => s.fetchLeaderboard)
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null)
  const [sinConexion, setSinConexion] = useState(false)

  useEffect(() => {
    let cancelado = false
    setEntries(null)
    setSinConexion(false)

    const cargar = async () => {
      const lista = await fetchLeaderboard(period)
      if (cancelado) return
      if (lista) setEntries(lista.slice(0, FILAS))
      setSinConexion(!lista)
    }

    void cargar()
    const intervalo = window.setInterval(() => void cargar(), REFRESCO_MS)
    const alVolver = () => { if (document.visibilityState === 'visible') void cargar() }
    document.addEventListener('visibilitychange', alVolver)

    return () => {
      cancelado = true
      window.clearInterval(intervalo)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [period, fetchLeaderboard])

  return { entries, sinConexion }
}

export default function AdminLeaderboard() {
  const [params] = useSearchParams()
  const periodo = periodoDe(params.get('periodo'))
  const { entries, sinConexion } = useMarcador(periodo.period)

  return (
    <KioscoMarco className="bg-brand-azul">
      <BarraSuperior sinConexion={sinConexion} />

      <section className="shrink-0 overflow-hidden bg-brand-noche bg-dots-azul border-b-4 border-brand-sombra flex flex-col items-center px-[2.6vh] pt-[2vh]">
        <p className="flex items-center gap-[1.2vh] font-mono font-bold uppercase text-brand-verde text-[1.8vh] tracking-[0.3em]">
          <img src="/astronauta_mados_nuevo.svg" alt="" width={30} height={37} className="h-[2.4vh] w-auto rotate-[155deg]" />
          {periodo.encabezado}
        </p>
        {/* Interlineado 1.05 y no menos: más apretado, el acento de la Í choca con TABLA. */}
        <h1 className="font-heading text-white text-[4.8vh] leading-[1.05] text-center mt-[1.2vh]">
          Tabla de<br />líderes
        </h1>

        {/* Señala el periodo que muestra este monitor. Son enlaces solo por comodidad del
            personal al configurarlo: frente al público nadie los toca. */}
        <nav aria-label="Periodo" className="mt-[2vh] flex items-center gap-[0.4vh] rounded-full bg-brand-sombra p-[0.6vh]">
          {PERIODOS.map(p => {
            const activo = p.clave === periodo.clave
            return (
              <Link
                key={p.clave}
                to={`?periodo=${p.clave}`}
                replace
                aria-current={activo ? 'page' : undefined}
                className={cn(
                  'rounded-full px-[2.2vh] py-[0.8vh] font-body font-black uppercase text-[1.8vh] leading-none',
                  activo ? 'bg-brand-verde text-brand-sombra' : 'text-white'
                )}
              >
                {p.pestana}
              </Link>
            )
          })}
        </nav>

        <div className="w-full mt-[1.6vh] flex items-end justify-center gap-[2%]">
          {/* 2º a la izquierda, 1º al centro y más alto, 3º a la derecha: como el podio de la home. */}
          {[2, 1, 3].map(rank => (
            <LugarPodio key={rank} rank={rank} entry={entries?.[rank - 1]} cargando={entries === null} />
          ))}
        </div>
      </section>

      <section className="flex-1 min-h-0 px-[2.6vh] py-[2vh]">
        <Card className="h-full overflow-hidden">
          <ListaResto entries={entries} sinConexion={sinConexion} />
        </Card>
      </section>

      <Llamado />
    </KioscoMarco>
  )
}

function BarraSuperior({ sinConexion }: { sinConexion: boolean }) {
  const hora = useHora()
  return (
    <header className="shrink-0 h-[7vh] bg-white border-b-4 border-brand-sombra flex items-center justify-between gap-[2vh] px-[2.6vh]">
      <img src="/mados-logo-full.svg" alt="Helados Mados" width={81} height={36} className="h-[4.6vh] w-auto" />
      <div className="text-right">
        <p className="font-mono font-bold text-brand-sombra text-[3.6vh] leading-none tabular-nums">{hora}</p>
        <p className="font-mono uppercase text-brand-gris text-[1.3vh] tracking-[0.25em] mt-[0.6vh] flex items-center justify-end gap-[0.8vh]">
          {/* Si el marcador deja de responder, el personal lo ve aquí; el público, apenas. */}
          {sinConexion && <span className="w-[1vh] h-[1vh] rounded-full bg-brand-naranja" aria-label="Reconectando" />}
          Estación 01 · {NEGOCIO.direccion.alcaldia}
        </p>
      </div>
    </header>
  )
}

// Medidas del podio. Los bloques crecen hacia el centro; el contenido va arriba, así que
// el alto de cada uno tiene que alcanzar para número + apodo + puntos.
const PODIO: Record<number, { ancho: string; bloque: string; astronauta: string; numero: string; apodoVh: number; puntos: string; giro: string }> = {
  1: { ancho: 'w-[36%]', bloque: 'h-[13vh] bg-brand-amarillo', astronauta: 'h-[7.4vh]', numero: 'text-[4.4vh]', apodoVh: 2.6, puntos: 'text-[2.4vh]', giro: 'rotate-[155deg]' },
  2: { ancho: 'w-[29%]', bloque: 'h-[11.5vh] bg-white', astronauta: 'h-[6vh]', numero: 'text-[3.4vh]', apodoVh: 2.3, puntos: 'text-[2.1vh]', giro: 'rotate-[150deg]' },
  // El 3º es el espejo del 2º. Tailwind aplica la escala antes que el giro, así que el espejo
  // de "girar 150°" es "reflejar y girar -150°".
  3: { ancho: 'w-[29%]', bloque: 'h-[10.5vh] bg-brand-naranja', astronauta: 'h-[6vh]', numero: 'text-[3.4vh]', apodoVh: 2.3, puntos: 'text-[2.1vh]', giro: '-rotate-[150deg] -scale-x-100' },
}

function LugarPodio({ rank, entry, cargando }: { rank: number; entry?: LeaderboardEntry; cargando: boolean }) {
  const p = PODIO[rank]

  return (
    <div className={cn('flex flex-col items-center', p.ancho)}>
      {/* El único astronauta que hay flota de cabeza; girado, flota sobre su lugar. El
          desfase evita que los tres suban y bajen al mismo tiempo. */}
      <div className="relative animate-float" style={{ animationDelay: `${rank * -0.8}s` }}>
        {rank === 1 && (
          <>
            <Sparkle className="absolute -left-[3vh] top-[1vh] w-[2vh] h-[2vh] text-brand-amarillo fill-brand-amarillo" />
            <Sparkle className="absolute -right-[2.6vh] top-0 w-[1.6vh] h-[1.6vh] text-brand-verde fill-brand-verde" />
            <Sparkle className="absolute -right-[3.4vh] top-[4vh] w-[1.2vh] h-[1.2vh] text-white fill-white" />
          </>
        )}
        <img src="/astronauta_mados_nuevo.svg" alt="" width={80} height={99} className={cn('w-auto', p.astronauta, p.giro)} />
      </div>

      <div
        className={cn(
          'mt-[1vh] w-full rounded-t-[2.4vh] border-4 border-b-0 border-brand-sombra flex flex-col items-center px-[1.2vh] pt-[0.8vh] [container-type:inline-size]',
          p.bloque
        )}
      >
        <span className={cn(p.numero, 'font-heading text-brand-sombra leading-none')}>{rank}</span>
        {cargando ? (
          <div className="relative overflow-hidden w-3/4 h-[2.2vh] mt-[0.8vh] rounded-full bg-brand-sombra/15">
            <div className="absolute inset-0 shimmer" />
          </div>
        ) : entry ? (
          <>
            <p
              className="w-full text-center font-subheading text-brand-sombra leading-tight truncate mt-[0.5vh]"
              style={{ fontSize: tamanoQueCabe(entry.username, { maximoVh: p.apodoVh, minimoVh: 1.6, em: BALOO_EM }) }}
            >
              {entry.username}
            </p>
            <p className="text-brand-sombra leading-none tabular-nums mt-[0.3vh]">
              <span className={cn(p.puntos, 'font-heading')}>{entry.points}</span>
              <span className="font-mono font-bold text-[1.3vh] ml-[0.5vh]">PTS</span>
            </p>
          </>
        ) : (
          <p className="font-subheading text-brand-sombra/50 text-[2vh] leading-tight mt-[0.5vh]">Lugar libre</p>
        )}
      </div>
    </div>
  )
}

/** Del 4º al 10º. Alto fijo por fila: siete llenan la tarjeta a 1080×1920. */
const ALTO_FILA = 'h-[4vh]'
/** Ancho medio de un carácter de Baloo 2 en los apodos, con dígitos y mayúsculas anchas. */
const BALOO_EM = 0.62

function ListaResto({ entries, sinConexion }: { entries: LeaderboardEntry[] | null; sinConexion: boolean }) {
  if (entries === null && sinConexion) {
    return <Aviso texto="Reconectando con el marcador…" />
  }
  if (entries !== null && entries.length <= 3) {
    return <Aviso texto="Aún hay lugares libres en la tabla" />
  }

  return (
    <ScrollArea className="h-full">
      <Table className="table-fixed">
        {/* Los anchos van aquí y no en las celdas: con el encabezado oculto, table-fixed
            tomaba la primera fila (la invisible) y repartía tres columnas iguales. */}
        <colgroup>
          <col className="w-[17%]" />
          <col />
          <col className="w-[30%]" />
        </colgroup>
        {/* Sin encabezado visible, como en el diseño; queda para los lectores de pantalla. */}
        <TableHeader className="sr-only">
          <TableRow>
            <TableHead>Lugar</TableHead>
            <TableHead>Apodo</TableHead>
            <TableHead>Puntos</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries === null
            ? Array.from({ length: FILAS - 3 }).map((_, i) => <FilaEsqueleto key={i} />)
            : entries.slice(3).map((entry, i) => <FilaRanking key={entry.username} entry={entry} rank={i + 4} />)}
        </TableBody>
      </Table>
    </ScrollArea>
  )
}

function Aviso({ texto }: { texto: string }) {
  return (
    <div className="h-full flex items-center justify-center text-center px-[4vh]">
      <p className="font-heading text-brand-gris text-[2.6vh]">{texto}</p>
    </div>
  )
}

function FilaRanking({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  return (
    <TableRow className={ALTO_FILA}>
      <TableCell className="pl-[2.6vh] font-mono font-bold text-brand-gris text-[2.4vh] leading-none">#{rank}</TableCell>
      <TableCell>
        {/* El contenedor es este div y no la celda: la contención no aplica a una celda. */}
        <div className="w-full [container-type:inline-size]">
          <p
            className="font-subheading text-brand-sombra leading-tight truncate"
            style={{ fontSize: tamanoQueCabe(entry.username, { maximoVh: 3, minimoVh: 2, em: BALOO_EM }) }}
          >
            {entry.username}
          </p>
        </div>
      </TableCell>
      {/* leading-none: con el interlineado heredado (1.5) los puntos estiraban cada fila. */}
      <TableCell className="pr-[3vh] text-right whitespace-nowrap leading-none">
        <span className="font-heading text-brand-azul text-[3vh] tabular-nums">{entry.points}</span>
        <span className="font-mono font-bold text-brand-azul text-[1.5vh] ml-[0.6vh]">PTS</span>
      </TableCell>
    </TableRow>
  )
}

/** Mismo alto que una fila real, para que la lista no salte cuando llegan los datos. */
function FilaEsqueleto() {
  const barra = 'relative overflow-hidden rounded-full bg-brand-sombra/10'
  return (
    <TableRow className={ALTO_FILA} aria-hidden="true">
      <TableCell className="pl-[2.6vh]">
        <div className={cn(barra, 'w-[5vh] h-[2.4vh]')}><div className="absolute inset-0 shimmer" /></div>
      </TableCell>
      <TableCell>
        <div className={cn(barra, 'w-2/3 h-[2.4vh]')}><div className="absolute inset-0 shimmer" /></div>
      </TableCell>
      <TableCell className="pr-[3vh]">
        <div className={cn(barra, 'w-2/3 h-[2.4vh] ml-auto')}><div className="absolute inset-0 shimmer" /></div>
      </TableCell>
    </TableRow>
  )
}

/** La franja de abajo: a quien mira la pantalla, cómo entrar a la tabla. */
function Llamado() {
  const titulo = '¡Sube a la tabla!'
  return (
    <footer className="shrink-0 bg-brand-verde border-t-4 border-brand-sombra flex items-center gap-[2.2vh] px-[2.6vh] py-[1.2vh]">
      {/* El margen blanco alrededor del código es su zona de silencio: sin ella, muchos
          lectores no lo detectan sobre el verde. */}
      <div className="shrink-0 bg-white border-4 border-brand-sombra rounded-[1.6vh] p-[1vh]">
        <QRCodeSVG value={`${SITE_URL}/canjear`} size={256} fgColor="#1C2440" className="w-[8vh] h-[8vh]" />
      </div>
      <div className="flex-1 min-w-0 [container-type:inline-size]">
        <p className="font-heading text-brand-sombra leading-none" style={{ fontSize: tamanoQueCabe(titulo, { maximoVh: 3.4, em: 0.7 }) }}>
          {titulo}
        </p>
        <p className="font-body text-brand-sombra text-[1.8vh] leading-snug mt-[0.8vh]">
          Escanea, canjea la palabra secreta y gana tu medalla aquí mismo.
        </p>
      </div>
      <div className="shrink-0 animate-float">
        <img src="/astronauta_mados_nuevo.svg" alt="" width={80} height={99} className="h-[9vh] w-auto rotate-[200deg]" />
      </div>
    </footer>
  )
}
