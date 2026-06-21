import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, User, Percent, Check } from 'lucide-react'
import useAuthStore from '../context/authStore'

export default function SettingsPage() {
  const { user, logout, updateRetencion } = useAuthStore()
  const navigate = useNavigate()

  const [pct,    setPct]    = useState(String(user?.retencion_pct ?? 15.25))
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  useEffect(() => {
    setPct(String(user?.retencion_pct ?? 15.25))
  }, [user?.retencion_pct])

  const handlePctChange = (e) => {
    // Permite números y un solo punto decimal
    let v = e.target.value.replace(/[^\d.]/g, '')
    const parts = v.split('.')
    if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('')
    setPct(v)
    setSaved(false)
  }

  const handleGuardar = async () => {
    const num = parseFloat(pct)
    if (isNaN(num) || num < 0 || num > 100) return

    setSaving(true)
    const ok = await updateRetencion(num)
    setSaving(false)
    if (ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      <h1 className="text-base font-semibold">Configuración</h1>

      <div className="card flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-900 rounded-xl flex items-center justify-center">
          <User size={18} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-200">{user?.nombre}</p>
          <p className="text-xs text-slate-500">{user?.email}</p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-1">
          <Percent size={14} className="text-amber-400" />
          <p className="section-label !mb-0">Retención boleta de honorarios</p>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Porcentaje que se descuenta de tus ingresos brutos (Chile). Se usa para
          calcular tu líquido real en el Dashboard, meses y días.
        </p>

        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              inputMode="decimal"
              value={pct}
              onChange={handlePctChange}
              className="input pr-8"
              placeholder="15.25"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">%</span>
          </div>
          <button
            onClick={handleGuardar}
            disabled={saving}
            className="bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50
                       text-slate-950 font-medium rounded-xl px-4 py-3 text-sm
                       transition-colors flex items-center gap-1.5 flex-shrink-0"
          >
            {saved ? <Check size={16} /> : null}
            {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar'}
          </button>
        </div>

        <p className="text-xs text-slate-600 mt-2">
          Este porcentaje sube cada año tributario según el cronograma legal —
          ajústalo aquí cuando cambie.
        </p>
      </div>

      <button
        onClick={() => { logout(); navigate('/login') }}
        className="btn-secondary text-red-400 border-red-900/50"
      >
        <LogOut size={16} /> Cerrar sesión
      </button>
    </div>
  )
}
