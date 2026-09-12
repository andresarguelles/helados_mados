import { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import Modal from './Modal'
import { cn } from '../../lib/utils'

export default function ConfirmDialog({
  open,
  icon,
  title,
  description,
  confirmLabel = 'Confirmar',
  confirmId,
  tone = 'default',
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  icon: ReactNode
  title: string
  description: ReactNode
  confirmLabel?: string
  confirmId?: string
  tone?: 'default' | 'danger'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal open={open} onClose={onCancel} loading={loading} labelledBy="confirm-dialog-title">
      <div className="relative bg-brand-papel w-full max-w-sm rounded-3xl border-2 border-brand-sombra shadow-sticker-lg p-6 flex flex-col items-center gap-4 text-center animate-scale-in">
        <div className={cn(
          'w-12 h-12 rounded-2xl flex items-center justify-center',
          tone === 'danger' ? 'bg-red-100' : 'bg-brand-rosa/15'
        )}>
          {icon}
        </div>
        <div>
          <h2 id="confirm-dialog-title" className="font-heading text-brand-sombra text-lg">{title}</h2>
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
            id={confirmId}
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 font-heading text-xs uppercase tracking-wide text-white rounded-2xl py-3 border-2 border-brand-sombra transition-all disabled:opacity-70',
              tone === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-brand-rosa hover:brightness-95'
            )}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
