// El cumpleaños se guarda sin año (migración 0040): solo interesa el día y el mes para
// felicitar. Sin `Date` a propósito: un día y un mes no son un instante, y pasarlos por
// `new Date()` es invitar a que la zona horaria los corra un día.

export const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
] as const

/** Días posibles de un mes (1-12). Febrero da 29: sin año no se sabe si es bisiesto. */
export function diasDelMes(mes: number): number {
  if (mes === 2) return 29
  return [4, 6, 9, 11].includes(mes) ? 30 : 31
}

/** El mismo criterio que el CHECK `profiles_birthday_valid`. */
export function cumpleValido(mes: number, dia: number): boolean {
  return mes >= 1 && mes <= 12 && dia >= 1 && dia <= diasDelMes(mes)
}

/** "14 de marzo", o null si falta alguno de los dos. */
export function formatCumple(mes: number | null, dia: number | null): string | null {
  if (mes == null || dia == null) return null
  return `${dia} de ${MESES[mes - 1]}`
}
