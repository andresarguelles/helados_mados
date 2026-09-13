import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Revisa tu .env.local.')
}

// flowType 'pkce': el redirect de Google vuelve con ?code= y detectSessionInUrl (true por defecto)
// hace el intercambio solo. Es también el flujo que requiere linkIdentity().
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: { flowType: 'pkce' },
})
