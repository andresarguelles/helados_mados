import { useEffect, useState } from 'react'
import { Droplets, Loader2, Milk, type LucideIcon } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useStore } from '../../lib/store'
import { PAGINAS_DE_SABORES, SABORES, fondoDe, type BaseSabor, type Sabor } from '../../content/sabores'
import KioscoShell from '../../components/kiosco/KioscoShell'
import { tamanoQueCabe } from '../../components/kiosco/tamano'
import { Card } from '../../components/ui/Card'

const BASE: Record<BaseSabor, { icono: LucideIcon; texto: string }> = {
  leche: { icono: Milk, texto: 'Leche' },
  agua: { icono: Droplets, texto: 'Agua' },
}

/** "12 sabores · 8 de leche · 4 de agua", sin la base que no tenga ninguno. */
function resumen(sabores: readonly Sabor[]): string {
  const leche = sabores.filter(s => s.base === 'leche').length
  const agua = sabores.length - leche
  return [
    `${sabores.length} sabor${sabores.length === 1 ? '' : 'es'}`,
    leche && `${leche} de leche`,
    agua && `${agua} de agua`,
  ].filter(Boolean).join(' · ')
}

/**
 * Cuánto cabe en cada tarjeta, medido a 1080×1920 con capturas: `grande` hasta 3 filas y
 * `normal` hasta 6. Nunca hay más de 6 filas porque nunca hay más de 12 sabores por página.
 */
type Densidad = 'grande' | 'normal'

const TAMANOS: Record<Densidad, { nombreVh: number; franja: string; pildora: string; posicion: string; icono: string }> = {
  grande: {
    nombreVh: 3.6,
    franja: 'px-[2vh] py-[1.2vh]',
    pildora: 'text-[1.6vh] px-[1.2vh] py-[0.6vh]',
    posicion: 'top-[1.4vh] left-[1.4vh]',
    icono: 'w-[2vh] h-[2vh]',
  },
  normal: {
    nombreVh: 2.5,
    franja: 'px-[1.4vh] py-[0.8vh]',
    pildora: 'text-[1.3vh] px-[0.9vh] py-[0.45vh]',
    posicion: 'top-[1vh] left-[1vh]',
    icono: 'w-[1.6vh] h-[1.6vh]',
  },
}

/**
 * Ancho medio de un carácter de Baloo 2 en los nombres del catálogo, medido en el navegador:
 * el más ancho, "Queso con Zarzamora", da 0.52em por carácter. 0.55 deja margen.
 */
const BALOO_EM = 0.55

/** Todos los nombres al mismo tamaño y en una línea: el que deja caber el nombre más largo
 *  del catálogo entero, para que la letra no brinque cuando se oculta o vuelve un sabor. */
const NOMBRE_MAS_LARGO = SABORES.reduce((largo, s) => (s.nombre.length > largo.length ? s.nombre : largo), '')

// Más de 12 no caben a dos columnas con letra legible a distancia: se pasa a páginas.
const { maximoPorPagina: MAXIMO_POR_PAGINA, segundosPorPagina: SEGUNDOS_POR_PAGINA } = PAGINAS_DE_SABORES

export default function AdminFlavors() {
  const estacion = useStore(s => s.estacion)
  const suscribirEstacion = useStore(s => s.suscribirEstacion)
  // En vivo: cuando el panel quita o pone un sabor, Realtime trae la fila y esta pantalla se
  // redibuja sola, sin recargar.
  useEffect(() => suscribirEstacion(), [suscribirEstacion])

  // Lo que aparece es lo que hay: el sabor que se acaba se oculta desde /admin/estacion.
  const ocultos = new Set(estacion?.saboresOcultos ?? [])
  const sabores = estacion ? SABORES.filter(s => !ocultos.has(s.id)) : []

  // Páginas parejas: 17 sabores son 9 + 8, no 12 + 5, para que todas se vean igual de llenas.
  const paginas = Math.max(1, Math.ceil(sabores.length / MAXIMO_POR_PAGINA))
  const porPagina = Math.max(1, Math.ceil(sabores.length / paginas))
  const [pagina, setPagina] = useState(0)
  useEffect(() => {
    // Si el panel oculta o devuelve sabores y cambia el número de páginas, se empieza de nuevo.
    setPagina(0)
    if (paginas < 2) return
    const id = window.setInterval(() => setPagina(p => (p + 1) % paginas), SEGUNDOS_POR_PAGINA * 1000)
    return () => window.clearInterval(id)
  }, [paginas])
  // Mientras el efecto de arriba corre, que nunca se pinte una página que ya no existe.
  const actual = Math.min(pagina, paginas - 1)

  if (!estacion) {
    return (
      <KioscoShell titulo="Sabores de hoy">
        <div className="h-full flex items-center justify-center">
          <Loader2 className="w-[6vh] h-[6vh] animate-spin text-white/70" />
        </div>
      </KioscoShell>
    )
  }

  if (sabores.length === 0) {
    return (
      <KioscoShell titulo="Sabores de hoy">
        <div className="h-full flex items-center justify-center text-center px-[4vh]">
          <p className="font-heading text-white text-[3.4vh] leading-tight">Estamos preparando los sabores de hoy</p>
        </div>
      </KioscoShell>
    )
  }

  // Dos columnas salvo con muy pocos sabores. La rejilla sale del tamaño de página, no de los
  // que caen en la página actual: así todas las páginas tienen tarjetas del mismo tamaño.
  const columnas = porPagina <= 3 ? 1 : 2
  const filas = Math.ceil(porPagina / columnas)
  const densidad: Densidad = filas <= 3 ? 'grande' : 'normal'
  const enPagina = sabores.slice(actual * porPagina, (actual + 1) * porPagina)

  return (
    <KioscoShell
      titulo="Sabores de hoy"
      subtitulo={
        <>
          {resumen(sabores)}
          {paginas > 1 && (
            <span className="inline-flex items-center gap-[0.8vh] ml-[1.6vh] align-middle" aria-label={`Página ${actual + 1} de ${paginas}`}>
              {Array.from({ length: paginas }, (_, i) => (
                <span
                  key={i}
                  className={cn('w-[1.3vh] h-[1.3vh] rounded-full transition-colors', i === actual ? 'bg-brand-verde' : 'bg-white/30')}
                />
              ))}
            </span>
          )}
        </>
      }
    >
      <div
        key={actual}
        className={cn('h-full grid gap-[1.2vh] animate-fade-in', columnas === 1 ? 'grid-cols-1' : 'grid-cols-2')}
        style={{ gridTemplateRows: `repeat(${filas}, minmax(0, 1fr))` }}
      >
        {enPagina.map(sabor => (
          <TarjetaSabor key={sabor.id} sabor={sabor} densidad={densidad} />
        ))}
      </div>
    </KioscoShell>
  )
}

function TarjetaSabor({ sabor, densidad }: { sabor: Sabor; densidad: Densidad }) {
  const { icono: Icono, texto } = BASE[sabor.base]
  const t = TAMANOS[densidad]

  return (
    <Card className="h-full min-w-0 overflow-hidden">
      {/* El helado a sangre: las esquinas de la tarjeta lo recortan. La imagen la genera
          `npm --prefix tools/brand-assets run sabores` a partir del color; si falta, queda
          el color (o las bandas) del sabor en vez de un ícono roto. */}
      <div className="relative flex-1 min-h-0" style={{ background: fondoDe(sabor) }}>
        <img
          src={`/sabores/${sabor.id}.jpg`}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          onError={e => { e.currentTarget.style.display = 'none' }}
        />
        <span
          className={cn(
            t.pildora,
            t.posicion,
            'absolute flex items-center gap-[0.5vh] rounded-full border-2 border-brand-sombra bg-white font-mono font-bold uppercase leading-none text-brand-sombra'
          )}
        >
          <Icono className={t.icono} />
          {texto}
        </span>
      </div>

      <div className={cn(t.franja, 'shrink-0 border-t-4 border-brand-sombra [container-type:inline-size]')}>
        {/* normal-case: el estilo base pone los h2 en mayúsculas, y Baloo se lee mejor así. */}
        <h2
          className="font-subheading normal-case text-brand-sombra leading-[1.15] truncate"
          style={{ fontSize: tamanoQueCabe(NOMBRE_MAS_LARGO, { maximoVh: t.nombreVh, em: BALOO_EM }) }}
        >
          {sabor.nombre}
        </h2>
      </div>
    </Card>
  )
}
