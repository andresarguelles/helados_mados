import { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

export default function ConfirmDialog({
  open,
  icon,
  title,
  description,
  confirmLabel = 'Confirmar',
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  icon: ReactNode
  title: string
  description: string
  confirmLabel?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !loading && onCancel()} />
      <div className="relative bg-brand-papel w-full max-w-sm rounded-3xl border-2 border-brand-sombra shadow-sticker-lg p-6 flex flex-col items-center gap-4 text-center animate-scale-in">
        <div className="w-12 h-12 rounded-2xl bg-brand-rosa/15 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <h2 className="font-heading text-brand-sombra text-lg">{title}</h2>
          <p className="text-brand-gris text-sm font-body mt-1">{description}</p>
        </div>
        <div className="flex gap-3 w-full mt-1">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 font-heading text-xs uppercase tracking-wide text-brand-sombra bg-brand-sombra/10 rounded-2xl py-3 hover:bg-brand-sombra/15 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 font-heading text-xs uppercase tracking-wide text-white bg-brand-rosa rounded-2xl py-3 border-2 border-brand-sombra hover:brightness-95 transition-all disabled:opacity-70"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
