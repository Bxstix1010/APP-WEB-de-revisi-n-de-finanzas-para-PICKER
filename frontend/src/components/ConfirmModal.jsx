import { Trash2 } from 'lucide-react'

/**
 * Modal de confirmación reutilizable para acciones destructivas
 * (eliminar día, mes, empresa, etc).
 *
 * Props:
 *   open      boolean   si se muestra o no
 *   title     string    título corto, ej: "Eliminar día"
 *   message   ReactNode descripción — puede incluir <b> para resaltar datos
 *   onConfirm function  se ejecuta al confirmar
 *   onCancel  function  se ejecuta al cancelar / cerrar
 *   loading   boolean   deshabilita botones y cambia texto mientras procesa
 */
export default function ConfirmModal({
  open,
  title = 'Eliminar',
  message,
  onConfirm,
  onCancel,
  loading = false,
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-slate-950/70 flex items-center justify-center px-4 z-50"
      onClick={onCancel}
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-11 h-11 rounded-xl bg-red-950 flex items-center justify-center mb-3.5">
          <Trash2 size={20} className="text-red-400" />
        </div>

        <h3 className="text-base font-medium text-slate-100 mb-1.5">{title}</h3>
        <p className="text-sm text-slate-400 leading-relaxed mb-5">{message}</p>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium
                       rounded-xl py-2.5 text-sm transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-red-500 hover:bg-red-400 text-red-50 font-medium
                       rounded-xl py-2.5 text-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}
