// Roles (migración 0044). La fuente de verdad es `profiles.role` y la frontera real está en el
// servidor: RLS y las funciones `is_staff()` / `is_admin()` / `is_superadmin()`. Lo de aquí solo
// decide qué pantallas se ofrecen.
//
//   cliente     — todos, por omisión.
//   staff       — personal del mostrador: escáner, Estación y pantallas.
//   gerente     — aquí, lo mismo que el staff, y nunca cuenta como admin. Lo que lo distinguirá
//                 vivirá en la app de administración: entre otras cosas, abrir y cerrar la caja,
//                 registrar Merma y Pedidos, cancelar Ventas. El sitio lo conoce desde la Story 1.5
//                 del MVP 0, antes de que la base lo permita (Story 1.6).
//   admin       — además, dinámicas y clientes.
//   superadmin  — además, Métricas y asignar roles.
//
// `scripts/roles-check.mjs` rompe el build si cambia, para algún rol, lo que decide este archivo:
// nivel, pantalla de inicio, permisos y nombre visible. La barra y las pantallas no las revisa.
import type { Profile } from './types'

export type Rol = 'cliente' | 'staff' | 'gerente' | 'admin' | 'superadmin'

// Gerente y staff comparten nivel, así que `alcanza` no los distingue: `alcanza('staff', 'gerente')`
// es verdadero. Ninguna ruta del sitio pide `gerente`; una que lo pidiera se abriría a todo el staff.
const NIVEL: Record<Rol, number> = { cliente: 0, staff: 1, gerente: 1, admin: 2, superadmin: 3 }

export const NOMBRE_ROL: Record<Rol, string> = {
  cliente: 'Cliente',
  staff: 'Staff',
  gerente: 'Gerente',
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

/** Si `rol` tiene al menos los permisos de `minimo`. Va por nivel: no distingue `gerente` de `staff`. */
export function alcanza(rol: Rol, minimo: Rol): boolean {
  return NIVEL[rol] >= NIVEL[minimo]
}

/**
 * Dónde empieza cada rol al entrar al panel, por nivel. Quien no llega a admin (staff, Gerente)
 * no tiene dashboard: su casa es el escáner.
 */
export function inicioDe(rol: Rol): string {
  if (alcanza(rol, 'admin')) return '/admin/dashboard'
  if (alcanza(rol, 'staff')) return '/admin/scanner'
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
