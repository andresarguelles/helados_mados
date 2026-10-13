import { useEffect, useState } from 'react'
import type { Resultado } from '../../lib/metricas'

/**
 * Pide una métrica cada vez que cambia `clave` (los filtros serializados) y conserva lo último
 * que llegó mientras recarga: la vista se atenúa en vez de vaciarse, sin saltos de layout.
 */
export function useConsulta<T>(pedir: () => Promise<Resultado<T>>, clave: string) {
  const [datos, setDatos] = useState<T | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vigente = true
    setCargando(true)
    pedir().then(r => {
      if (!vigente) return
      if (r.ok) {
        setDatos(r.datos)
        setError(null)
      } else {
        setError(r.motivo)
      }
      setCargando(false)
    })
    return () => { vigente = false }
    // `pedir` cambia en cada render; lo que decide si hay que volver a pedir es `clave`.
  }, [clave])

  return { datos, cargando, error }
}

export const MENSAJE_ERROR: Record<string, string> = {
  forbidden: 'Solo el superadmin puede ver las métricas.',
  invalid: 'El rango de fechas no es válido.',
  rango_grande: 'Ese rango es demasiado largo para verlo por día. Agrupa por semana o por mes.',
  error: 'No pudimos cargar estos datos. Revisa tu conexión e intenta de nuevo.',
}
