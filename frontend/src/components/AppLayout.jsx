import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Building2, Settings, LogOut } from 'lucide-react'
import useAuthStore from '../context/authStore'
import clsx from 'clsx'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Inicio'   },
  { to: '/companies', icon: Building2,       label: 'Empresas' },
  { to: '/settings',  icon: Settings,        label: 'Config'   },
]

export default function AppLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col max-w-md mx-auto">

      {/* Top bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3.5
                         flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <span className="text-lg">🛒</span>
          <span className="text-emerald-400 font-semibold text-sm tracking-tight">
            Picker Tracker
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-500 text-xs">{user?.nombre}</span>
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="text-slate-600 hover:text-slate-300 transition-colors p-1"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-24 px-4 pt-4">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto
                      bg-slate-900 border-t border-slate-800
                      flex z-20 pb-safe">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => clsx(
              'flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs transition-colors',
              isActive ? 'text-emerald-400' : 'text-slate-600 hover:text-slate-400'
            )}
          >
            <Icon size={21} strokeWidth={1.8} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

    </div>
  )
}
