import { useEffect, useState } from 'react'
import { NEGOCIO } from '../../content/negocio'

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
 * La barra blanca de arriba de las pantallas de mostrador: logo, reloj y la estación. La
 * comparten el ranking y los sabores para que se vean como un juego.
 */
export default function BarraSuperior({ sinConexion = false }: {
  /** Solo para pantallas con datos en vivo: un punto naranja si dejaron de responder. */
  sinConexion?: boolean
}) {
  const hora = useHora()
  return (
    <header className="shrink-0 h-[7vh] bg-white border-b-4 border-brand-sombra flex items-center justify-between gap-[2vh] px-[2.6vh]">
      <img src="/mados-logo-full.svg" alt="Helados Mados" width={81} height={36} className="h-[4.6vh] w-auto" />
      <div className="text-right">
        <p className="font-mono font-bold text-brand-sombra text-[3.6vh] leading-none tabular-nums">{hora}</p>
        <p className="font-mono uppercase text-brand-gris text-[1.3vh] tracking-[0.25em] mt-[0.6vh] flex items-center justify-end gap-[0.8vh]">
          {/* Si los datos dejan de responder, el personal lo ve aquí; el público, apenas. */}
          {sinConexion && <span className="w-[1vh] h-[1vh] rounded-full bg-brand-naranja" aria-label="Reconectando" />}
          Estación 01 · {NEGOCIO.direccion.alcaldia}
        </p>
      </div>
    </header>
  )
}
