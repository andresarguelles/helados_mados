/**
 * `React.lazy` que además expone `.preload()`, y que no vuelve a suspender si el chunk ya
 * está en memoria cuando le toca pintarse.
 *
 * Por qué no basta con `React.lazy` a secas: guarda el estado de su promesa en un payload
 * propio que se crea la primera vez que ALGUIEN lo renderiza, no cuando alguien de fuera
 * llama a un `preload()`. Y aunque se precargue con una llamada aparte a `import()` —que sí
 * calienta la caché de módulos del navegador, no hay una segunda descarga— esa llamada
 * sigue devolviendo una promesa nueva que se cumple un microtask después, nunca de forma
 * síncrona. Así que el primer render de un `React.lazy` "precargado" así de todos modos
 * lanza una promesa y suspende — justo lo que hay que evitar al hidratar (ver
 * src/main.tsx: si el boundary sigue pendiente cuando llega una actualización de fuera,
 * como la de `initAuth`, React puede rendirse con ESE árbol y remontarlo desde cero en el
 * cliente, el parpadeo de vuelta al fallback que el prerender existe para evitar).
 *
 * Este wrapper guarda su propio caché de módulo (una sola promesa por componente, tanto si
 * la dispara `preload()` como el primer render) y, si ya resolvió, dibuja el componente
 * real de forma síncrona, sin pasar por Suspense. Si no, cae en un `React.lazy` de verdad
 * sobre esa MISMA promesa, así que sigue funcionando exactamente igual sin precarga (y en
 * el servidor, donde `prerender` sí espera a Suspense).
 */
import { createElement, lazy, type ComponentType, type ReactElement } from 'react'

type Modulo<P> = { default: ComponentType<P> }
type Factory<P> = () => Promise<Modulo<P>>

interface Entrada<P> {
  estado: 'pendiente' | 'lista' | 'fallida'
  promesa: Promise<Modulo<P>>
  componente?: ComponentType<P>
  error?: unknown
}

export interface ComponentePrecargable<P extends object> {
  (props: P): ReactElement
  /** Dispara (o reutiliza) la descarga y devuelve el componente ya resuelto. */
  preload: () => Promise<ComponentType<P>>
}

export function lazyWithPreload<P extends object>(factory: Factory<P>): ComponentePrecargable<P> {
  let entrada: Entrada<P> | null = null

  function cargar(): Entrada<P> {
    if (entrada) return entrada
    const nueva: Entrada<P> = { estado: 'pendiente', promesa: factory() }
    nueva.promesa.then(
      (modulo) => {
        nueva.estado = 'lista'
        nueva.componente = modulo.default
      },
      (error) => {
        nueva.estado = 'fallida'
        nueva.error = error
      }
    )
    entrada = nueva
    return nueva
  }

  // Solo se usa mientras SIGUE sin cargar: la misma promesa de `cargar()`, así que en
  // cuanto resuelva, el próximo render ya la ve 'lista' arriba y deja de montarse.
  const Perezoso = lazy(() => cargar().promesa)

  const Componente = ((props: P): ReactElement => {
    const actual = cargar()
    if (actual.estado === 'lista' && actual.componente) {
      return createElement(actual.componente, props)
    }
    if (actual.estado === 'fallida') throw actual.error
    return createElement(Perezoso, props)
  }) as unknown as ComponentePrecargable<P>

  Componente.preload = () => cargar().promesa.then((modulo) => modulo.default)

  return Componente
}
