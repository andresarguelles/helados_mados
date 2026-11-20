import { supabase } from './supabaseClient'

export type ResultadoDeCorreo = { ok: true } | { ok: false; motivo: 'credenciales' | 'sin_red' | 'otro' }

function rechazo(error: unknown): ResultadoDeCorreo {
  const datos = typeof error === 'object' && error !== null
    ? error as { name?: unknown; status?: unknown; code?: unknown } : {}
  if ((typeof navigator !== 'undefined' && navigator.onLine === false)
    || datos.name === 'AuthRetryableFetchError' || datos.status === 0
    || (error instanceof TypeError && /fetch|network|load failed/i.test(error.message))) {
    return { ok: false, motivo: 'sin_red' }
  }
  if (datos.code === 'invalid_credentials' || datos.status === 400) {
    return { ok: false, motivo: 'credenciales' }
  }
  return { ok: false, motivo: 'otro' }
}

/**
 * Solo lo importa EntrarConCorreo, que solo se carga fuera de producción (Story 6.8).
 * La contraseña no se almacena ni se registra.
 */
export async function entrarConCorreo(correo: string, contrasena: string): Promise<ResultadoDeCorreo> {
  try {
    const { error } = await supabase.auth.signInWithPassword({ email: correo, password: contrasena })
    return error ? rechazo(error) : { ok: true }
  } catch (error) {
    return rechazo(error)
  }
}
