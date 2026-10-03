import { useEffect } from 'react'
import { Droplets, Loader2, Milk, type LucideIcon } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useStore } from '../../lib/store'
import { SABORES, type BaseSabor, type Sabor } from '../../content/sabores'
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
 * Cuánto cabe en cada tarjeta, medido a 1080×1920 con capturas: `grande` hasta 3 filas,
 * `normal` hasta 6 (12 sabores) y `compacta` hasta 8 (16 sabores). Con más de 16 las tarjetas
 * ya no caben y habría que pasar a tres columnas o rotar páginas.
 */
type Densidad = 'grande' | 'normal' | 'compacta'

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
  compacta: {
    nombreVh: 2.2,
    franja: 'px-[1.2vh] py-[0.6vh]',
    pildora: 'text-[1.1vh] px-[0.8vh] py-[0.35vh]',
    posicion: 'top-[0.8vh] left-[0.8vh]',
    icono: 'w-[1.4vh] h-[1.4vh]',
  },
}

/** Ancho medio de un carácter de Baloo 2 en mayúsculas y minúsculas (ver tamano.ts). */
const BALOO_EM = 0.62

/** Todos los nombres al mismo tamaño y en una línea: el que deja caber el nombre más largo
 *  del catálogo entero, para que la letra no brinque cuando se oculta o vuelve un sabor. */
const NOMBRE_MAS_LARGO = SABORES.reduce((largo, s) => (s.nombre.length > largo.length ? s.nombre : largo), '')

export default function AdminFlavors() {
  const estacion = useStore(s => s.estacion)
  const suscribirEstacion = useStore(s => s.suscribirEstacion)
  // En vivo: cuando el panel quita o pone un sabor, Realtime trae la fila y esta pantalla se
  // redibuja sola, sin recargar.
  useEffect(() => suscribirEstacion(), [suscribirEstacion])

  if (!estacion) {
    return (
      <KioscoShell titulo="Sabores de hoy">
        <div className="h-full flex items-center justify-center">
          <Loader2 className="w-[6vh] h-[6vh] animate-spin text-white/70" />
        </div>
      </KioscoShell>
    )
  }

  // Lo que aparece es lo que hay: el sabor que se acaba se oculta desde /admin/estacion.
  const ocultos = new Set(estacion.saboresOcultos)
  const sabores = SABORES.filter(s => !ocultos.has(s.id))

  if (sabores.length === 0) {
    return (
      <KioscoShell titulo="Sabores de hoy">
        <div className="h-full flex items-center justify-center text-center px-[4vh]">
          <p className="font-heading text-white text-[3.4vh] leading-tight">Estamos preparando los sabores de hoy</p>
        </div>
      </KioscoShell>
    )
  }

  // Dos columnas salvo con muy pocos sabores. Las filas se reparten todo el alto por igual, así
  // que la pantalla siempre queda llena de arriba abajo, y la densidad sale de cuántas filas
  // hay: más filas, tarjetas más bajas.
  const columnas = sabores.length <= 3 ? 1 : 2
  const filas = Math.ceil(sabores.length / columnas)
  const densidad: Densidad = filas <= 3 ? 'grande' : filas <= 6 ? 'normal' : 'compacta'

  return (
    <KioscoShell titulo="Sabores de hoy" subtitulo={resumen(sabores)}>
      <div
        className={cn('h-full grid gap-[1.2vh]', columnas === 1 ? 'grid-cols-1' : 'grid-cols-2')}
        style={{ gridTemplateRows: `repeat(${filas}, minmax(0, 1fr))` }}
      >
        {sabores.map(sabor => (
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
          el color plano del sabor en vez de un ícono roto. */}
      <div className="relative flex-1 min-h-0" style={{ backgroundColor: sabor.color }}>
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
