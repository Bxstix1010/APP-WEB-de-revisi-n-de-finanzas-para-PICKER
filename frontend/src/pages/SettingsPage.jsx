import { useNavigate } from 'react-router-dom'
import { LogOut, User } from 'lucide-react'
import useAuthStore from '../context/authStore'

export default function SettingsPage() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

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

      <div className="card text-center py-6 text-slate-500 text-sm">
        🚧 Más opciones en próximas fases
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
