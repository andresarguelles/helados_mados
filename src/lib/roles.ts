// Roles (migración 0044). La fuente de verdad es `profiles.role` y la frontera real está en el
// servidor: RLS y las funciones `is_staff()` / `is_admin()` / `is_superadmin()`. Lo de aquí solo
// decide qué pantallas se ofrecen.
//
//   cliente     — todos, por omisión.
//   staff       — personal del mostrador: escáner, Estación y pantallas.
//   admin       — además, dinámicas y clientes.
//   superadmin  — además, Métricas y asignar roles.
import type { Profile } from './types'

export type Rol = 'cliente' | 'staff' | 'admin' | 'superadmin'

const NIVEL: Record<Rol, number> = { cliente: 0, staff: 1, admin: 2, superadmin: 3 }

export const NOMBRE_ROL: Record<Rol, string> = {
  cliente: 'Cliente',
  staff: 'Staff',
  admin: 'Admin',
  superadmin: 'Superadmin',
}

function esRol(valor: unknown): valor is Rol {
  return typeof valor === 'string' && valor in NIVEL
}

/** El rol de un perfil. Sin `role` reconocible cae en `is_admin`, que el servidor mantiene como espejo. */
export function rolDe(profile: Pick<Profile, 'role' | 'is_admin'> | null): Rol {
  if (!profile) return 'cliente'
  if (esRol(profile.role)) return profile.role
  return profile.is_admin ? 'admin' : 'cliente'
}

/** Si `rol` tiene al menos los permisos de `minimo`. */
export function alcanza(rol: Rol, minimo: Rol): boolean {
  return NIVEL[rol] >= NIVEL[minimo]
}

/** Dónde empieza cada rol al entrar al panel. El staff no tiene dashboard: su casa es el escáner. */
export function inicioDe(rol: Rol): string {
  if (rol === 'staff') return '/admin/scanner'
  if (alcanza(rol, 'admin')) return '/admin/dashboard'
  return '/admin'
}

/** Los cuatro indicadores derivados que guarda el store. */
export function permisosDe(profile: Pick<Profile, 'role' | 'is_admin'> | null) {
  const rol = rolDe(profile)
  return {
    rol,
    isStaff: alcanza(rol, 'staff'),
    isAdmin: alcanza(rol, 'admin'),
    isSuperadmin: rol === 'superadmin',
  }
}
