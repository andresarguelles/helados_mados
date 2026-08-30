import { useEffect, useState } from 'react'
import { useStore } from '../../lib/store'
import { Dynamic } from '../../lib/types'
import { formatDate, isDynamicActive, isDynamicExpired, isDynamicUpcoming, toDatetimeLocalValue } from '../../lib/utils'
import { cn } from '../../lib/utils'
import AdminHeader from '../../components/admin/AdminHeader'
import {
  Plus, QrCode, Pencil, Trash2, X,
  Package, ChevronRight, ChevronDown, Loader2, AlertCircle, Clock, ArrowRight,
} from 'lucide-react'

type ModalMode = 'create' | 'edit' | null
type StatusGroupKey = 'active' | 'upcoming' | 'expired'

const emptyForm: {
  keyword: string
  physical_stock: number | ''
  starts_at: string
  ends_at: string
  description: string
  prize_label: string
} = {
  keyword: '',
  physical_stock: 30,
  starts_at: '',
  ends_at: '',
  description: '',
  prize_label: '',
}

export default function AdminDashboard() {
  const { dynamics, addDynamic, updateDynamic, deleteDynamic, coupons, fetchDynamics } = useStore()
  const [modal, setModal] = useState<ModalMode>(null)
  const [editTarget, setEditTarget] = useState<Dynamic | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [listError, setListError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Dynamic | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [dynamicsLoaded, setDynamicsLoaded] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | StatusGroupKey>('all')
  const [filterOpen, setFilterOpen] = useState(false)

  useEffect(() => { fetchDynamics().then(() => setDynamicsLoaded(true)) }, [fetchDynamics])

  const openCreate = () => {
    const now = new Date()
    const sixHoursLater = new Date(now.getTime() + 6 * 60 * 60 * 1000)
    setForm({
      ...emptyForm,
      starts_at: toDatetimeLocalValue(now),
      ends_at: toDatetimeLocalValue(sixHoursLater),
    })
    setEditTarget(null)
    setError('')
    setModal('create')
  }

  const openEdit = (d: Dynamic) => {
    setForm({
      keyword: d.keyword,
      physical_stock: d.physical_stock,
      starts_at: d.starts_at.slice(0, 16),
      ends_at: d.ends_at.slice(0, 16),
      description: d.description,
      prize_label: d.prize_label,
    })
    setEditTarget(d)
    setError('')
    setModal('edit')
  }

  const handleSave = async () => {
    setError('')
    if (!form.keyword.trim()) { setError('La palabra secreta es requerida'); return }
    if (form.physical_stock === '' || Number(form.physical_stock) < 1) { setError('Indica el stock físico (mínimo 1)'); return }
    if (!form.starts_at || !form.ends_at) { setError('Configura las fechas de vigencia'); return }
    if (modal === 'create' && form.starts_at.slice(0, 10) < toDatetimeLocalValue(new Date()).slice(0, 10)) {
      setError('La fecha de inicio no puede ser anterior a hoy')
      return
    }
    if (new Date(form.starts_at) >= new Date(form.ends_at)) { setError('La fecha de fin debe ser posterior a la de inicio'); return }
    if (!form.prize_label.trim()) { setError('Describe el premio'); return }

    setSaving(true)

    const data = {
      keyword: form.keyword.trim().toUpperCase(),
      physical_stock: Number(form.physical_stock),
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
      description: form.description,
      prize_label: form.prize_label.trim(),
    }

    const result = modal === 'create'
      ? await addDynamic(data)
      : editTarget ? await updateDynamic(editTarget.id, data) : { success: true as const }

    setSaving(false)

    if (!result.success) { setError(result.error); return }
    setModal(null)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setListError('')
    const result = await deleteDynamic(deleteTarget.id)
    setDeleting(false)
    if (!result.success) setListError(result.error)
    setDeleteTarget(null)
  }

  const getStatusBadge = (d: Dynamic) => {
    if (isDynamicActive(d)) return { label: 'Activa', dot: 'bg-brand-verde', cls: 'bg-brand-verde/15 text-brand-verde' }
    if (isDynamicExpired(d)) return { label: 'Expirada', dot: 'bg-white/30', cls: 'bg-white/10 text-white/80' }
    if (isDynamicUpcoming(d)) return { label: 'Próxima', dot: 'bg-brand-amarillo', cls: 'bg-brand-amarillo/15 text-brand-amarillo' }
    return { label: 'Desconocido', dot: 'bg-white/30', cls: '' }
  }

  const getCouponCount = (dynamicId: string) =>
    coupons.filter(c => c.dynamic_id === dynamicId).length

  // Activas primero, luego próximas, luego expiradas; dentro de cada grupo,
  // las más recientes primero (dynamics ya llega ordenado así desde fetchDynamics).
  const getStatusGroup = (d: Dynamic): StatusGroupKey => {
    if (isDynamicActive(d)) return 'active'
    if (isDynamicUpcoming(d)) return 'upcoming'
    return 'expired'
  }
  const dynamicGroups: { key: StatusGroupKey; label: string; dot: string; items: Dynamic[] }[] = [
    { key: 'active', label: 'Activas', dot: 'bg-brand-verde', items: dynamics.filter(d => getStatusGroup(d) === 'active') },
    { key: 'upcoming', label: 'Próximas', dot: 'bg-brand-amarillo', items: dynamics.filter(d => getStatusGroup(d) === 'upcoming') },
    { key: 'expired', label: 'Expiradas', dot: 'bg-white/30', items: dynamics.filter(d => getStatusGroup(d) === 'expired') },
  ]
  const visibleDynamicGroups = dynamicGroups.filter(g =>
    (statusFilter === 'all' || statusFilter === g.key) && g.items.length > 0
  )
  const filterOptions: { key: 'all' | StatusGroupKey; label: string }[] = [
    { key: 'all', label: 'Todas' },
    ...dynamicGroups.map(g => ({ key: g.key, label: g.label })),
  ]
  const currentFilterLabel = filterOptions.find(o => o.key === statusFilter)?.label ?? 'Todas'

  const renderDynamicCard = (d: Dynamic) => {
    const badge = getStatusBadge(d)
    const stockLeft = d.physical_stock - d.physical_redeemed
    const stockPct = Math.max(0, (stockLeft / d.physical_stock) * 100)

    return (
      <div key={d.id} className="bg-white/5 border border-white/10 rounded-3xl p-5 flex flex-col gap-4">
        {/* Top row */}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-heading text-brand-amarillo text-lg tracking-wider">
                {d.keyword}
              </span>
              <span className={cn('flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full', badge.cls)}>
                <span className={cn('w-1.5 h-1.5 rounded-full', badge.dot)} />
                {badge.label}
              </span>
            </div>
            <p className="text-white/85 text-xs font-body mt-1">{d.prize_label}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => openEdit(d)}
              aria-label={`Editar ${d.keyword}`}
              className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center text-white/75 hover:text-white hover:bg-white/20 transition-all"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeleteTarget(d)}
              aria-label={`Eliminar ${d.keyword}`}
              className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center text-white/75 hover:text-red-400 hover:bg-white/20 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Stock bar */}
        <div>
          <div className="flex items-center justify-between text-xs font-body mb-1.5">
            <span className="text-white/80">Stock físico</span>
            <span className={cn('font-bold', stockLeft === 0 ? 'text-red-400' : 'text-white/80')}>
              {stockLeft}/{d.physical_stock} disponibles
            </span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                stockLeft === 0 ? 'bg-red-500' : stockPct > 30 ? 'bg-brand-verde' : 'bg-brand-azul'
              )}
              style={{ width: `${stockPct}%` }}
            />
          </div>
        </div>

        {/* Dates + coupon count */}
        <div className="flex items-center gap-4 text-xs text-white/75 font-body flex-wrap">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDate(d.starts_at)}
            <ArrowRight className="w-3 h-3" />
            {formatDate(d.ends_at)}
          </span>
          <span className="ml-auto flex items-center gap-1 text-brand-amarillo/70">
            <QrCode className="w-3 h-3" />
            {getCouponCount(d.id)} cupones
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-azul flex flex-col">
      <AdminHeader title="Panel Comandante" />

      {/* Content */}
      <div className="flex-1 max-w-lg mx-auto w-full px-4 pt-20 pb-6 flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-white text-xl uppercase">Entrenamientos</h1>
            <p className="text-white/85 text-xs font-body mt-0.5">Palabras secretas y medallas</p>
          </div>
          <button
            id="create-dynamic-btn"
            onClick={openCreate}
            className="flex items-center gap-1.5 bg-brand-amarillo text-brand-sombra font-heading text-xs uppercase tracking-wide px-4 py-2.5 rounded-xl border-2 border-brand-sombra shadow-sticker-white hover:shadow-sticker-lg hover:-translate-x-0.5 hover:-translate-y-0.5 active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
          >
            <Plus className="w-4 h-4" />Nueva
          </button>
        </div>

        {listError && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300 font-body">{listError}</p>
          </div>
        )}

        {/* Dynamics list */}
        {!dynamicsLoaded ? (
          <div className="flex flex-col gap-3">
            {[0, 1].map(i => (
              <div key={i} className="relative overflow-hidden bg-white/5 border border-white/10 rounded-3xl h-32">
                <div className="absolute inset-0 shimmer opacity-20" />
              </div>
            ))}
          </div>
        ) : dynamics.length === 0 ? (
          <div className="text-center py-16 text-white/75">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-heading">Sin entrenamientos creados</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Status filter */}
            <div className="relative">
              <button
                type="button"
                id="status-filter"
                onClick={() => setFilterOpen(o => !o)}
                aria-haspopup="listbox"
                aria-expanded={filterOpen}
                className="field-input-dark flex items-center justify-between cursor-pointer"
              >
                <span>{currentFilterLabel}</span>
                <ChevronDown className={cn('w-4 h-4 text-white/60 transition-transform', filterOpen && 'rotate-180')} />
              </button>

              {filterOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
                  <div
                    role="listbox"
                    className="absolute left-0 right-0 mt-2 z-20 bg-brand-azul border-2 border-white/20 rounded-2xl shadow-sticker-sm overflow-hidden"
                  >
                    {filterOptions.map(option => (
                      <button
                        key={option.key}
                        type="button"
                        role="option"
                        aria-selected={statusFilter === option.key}
                        onClick={() => { setStatusFilter(option.key); setFilterOpen(false) }}
                        className={cn(
                          'w-full text-left px-4 py-2.5 text-sm font-body transition-colors',
                          statusFilter === option.key ? 'bg-white/15 text-white font-bold' : 'text-white/85 hover:bg-white/10'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {visibleDynamicGroups.length === 0 ? (
              <div className="text-center py-16 text-white/75">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-heading">
                  {statusFilter === 'all'
                    ? 'Ninguna dinámica coincide con el filtro'
                    : `No hay dinámicas ${dynamicGroups.find(g => g.key === statusFilter)?.label.toLowerCase()}`}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {visibleDynamicGroups.map(group => (
                  <div key={group.key} className="flex flex-col gap-3">
                    <h2 className="flex items-center gap-2 font-heading text-xs uppercase tracking-wide text-white/70">
                      <span className={cn('w-1.5 h-1.5 rounded-full', group.dot)} />
                      {group.label}
                    </h2>
                    {group.items.map(renderDynamicCard)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative bg-brand-papel w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto animate-slide-up">
            {/* Modal header */}
            <div className="sticky top-0 bg-brand-papel border-b border-brand-sombra/10 px-5 py-4 flex items-center justify-between rounded-t-3xl">
              <h2 className="font-heading text-brand-sombra text-lg flex items-center gap-2">
                {modal === 'create' ? <Plus className="w-5 h-5 text-brand-azul" /> : <Pencil className="w-5 h-5 text-brand-azul" />}
                {modal === 'create' ? 'Nuevo entrenamiento' : 'Editar entrenamiento'}
              </h2>
              <button onClick={() => setModal(null)} aria-label="Cerrar" className="text-brand-gris hover:text-brand-sombra transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              {/* Keyword */}
              <div>
                <label className="font-heading text-brand-sombra text-xs mb-1.5 block">
                  Palabra secreta <span className="text-brand-azul">*</span>
                </label>
                <input
                  type="text"
                  value={form.keyword}
                  onChange={e => setForm(f => ({ ...f, keyword: e.target.value.toUpperCase() }))}
                  placeholder="Ej. LIMONADA"
                  className="field-input uppercase font-heading tracking-widest text-lg"
                  maxLength={30}
                />
              </div>

              {/* Prize label */}
              <div>
                <label className="font-heading text-brand-sombra text-xs mb-1.5 block">
                  Medalla / descripción <span className="text-brand-azul">*</span>
                </label>
                <input
                  type="text"
                  value={form.prize_label}
                  onChange={e => setForm(f => ({ ...f, prize_label: e.target.value }))}
                  placeholder="Paleta de limón gratis"
                  className="field-input"
                />
              </div>

              {/* Stock */}
              <div>
                <label className="font-heading text-brand-sombra text-xs mb-1.5 block">
                  Stock físico (premios disponibles en mostrador)
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.physical_stock}
                  onChange={e => setForm(f => ({ ...f, physical_stock: e.target.value === '' ? '' : Number(e.target.value) }))}
                  className="field-input"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-heading text-brand-sombra text-xs mb-1.5 block">
                    Inicio <span className="text-brand-azul">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={e => {
                      const value = e.target.value
                      setForm(f => ({ ...f, starts_at: value }))
                      if (modal === 'create' && value.slice(0, 10) < toDatetimeLocalValue(new Date()).slice(0, 10)) {
                        setError('La fecha de inicio no puede ser anterior a hoy')
                      } else {
                        setError('')
                      }
                    }}
                    min={modal === 'create' ? `${toDatetimeLocalValue(new Date()).slice(0, 10)}T00:00` : undefined}
                    className="field-input text-sm"
                  />
                </div>
                <div>
                  <label className="font-heading text-brand-sombra text-xs mb-1.5 block">
                    Fin <span className="text-brand-azul">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))}
                    className="field-input text-sm"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600 font-body">{error}</p>
                </div>
              )}

              <button
                id="save-dynamic-btn"
                onClick={handleSave}
                disabled={saving}
                className="btn-fresa mt-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                {saving ? 'Guardando...' : modal === 'create' ? 'Crear entrenamiento' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !deleting && setDeleteTarget(null)} />
          <div className="relative bg-brand-papel w-full max-w-sm rounded-3xl border-2 border-brand-sombra shadow-sticker-lg p-6 flex flex-col items-center gap-4 text-center animate-scale-in">
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h2 className="font-heading text-brand-sombra text-lg">¿Eliminar esta dinámica?</h2>
              <p className="text-brand-gris text-sm font-body mt-1">
                Vas a eliminar <span className="font-bold text-brand-azul">{deleteTarget.keyword}</span>
                {isDynamicActive(deleteTarget) && ' — esta dinámica está activa ahora mismo'}. Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex gap-3 w-full mt-1">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 font-heading text-xs uppercase tracking-wide text-brand-sombra bg-brand-sombra/10 rounded-2xl py-3 hover:bg-brand-sombra/15 transition-all"
              >
                Cancelar
              </button>
              <button
                id="confirm-delete-btn"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-1.5 font-heading text-xs uppercase tracking-wide text-white bg-red-500 rounded-2xl py-3 border-2 border-brand-sombra hover:bg-red-600 transition-all disabled:opacity-70"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
