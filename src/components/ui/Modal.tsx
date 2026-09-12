import { ReactNode, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

// Shell compartido para todos los modales. Se monta con un portal a document.body
// para no depender del containing block de ningún ancestro: un `backdrop-filter`
// (p. ej. backdrop-blur-md en Navbar/AdminHeader) convierte a ese ancestro en el
// containing block de sus descendientes `position: fixed`, así que un modal que se
// renderiza dentro de un header con blur se centra contra la franja del header en
// vez del viewport. El portal es inmune a eso (y a cualquier futuro ancestro con
// transform/filter).
export default function Modal({
  open,
  onClose,
  loading = false,
  labelledBy,
  children,
}: {
  open: boolean
  onClose: () => void
  loading?: boolean
  labelledBy: string
  children: ReactNode
}) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // Foco y bloqueo de scroll: solo al abrir y al cerrar. Si este efecto dependiera
  // de `loading` u `onClose`, cada cambio de esos volvería a capturar el foco —que
  // para entonces ya está dentro del diálogo— y al cerrar lo devolvería al propio
  // diálogo en vez de al botón que lo abrió.
  useEffect(() => {
    if (!open) return

    const trigger = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
      trigger?.focus?.()
    }
  }, [open])

  // El listener sí necesita el valor vigente de `loading` y `onClose`.
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, loading, onClose])

  if (!open) return null

  return createPortal(
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      tabIndex={-1}
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => !loading && onClose()}
      />
      {children}
    </div>,
    document.body
  )
}
