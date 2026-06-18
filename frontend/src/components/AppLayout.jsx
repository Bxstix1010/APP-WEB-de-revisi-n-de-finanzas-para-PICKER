import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Calendar, Settings, LogOut } from 'lucide-react'
import useAuthStore from '../context/authStore'
import clsx from 'clsx'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Inicio' },
  { to: '/settings',  icon: Settings,        label: 'Config' },
]

export default function AppLayout() {
  const logout   = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-surface-900 text-white flex flex-col">

      {/* Top bar */}
      <header className="bg-surface-800 border-b border-surface-700 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <span className="text-brand-400 font-bold text-lg tracking-tight">
          🛒 Picker Tracker
        </span>
        <button
          onClick={handleLogout}
          className="text-surface-600 hover:text-white transition-colors p-1"
        >
          <LogOut size={20} />
        </button>
      </header>

      {/* Contenido principal — padding bottom para la navbar móvil */}
      <main className="flex-1 overflow-y-auto pb-20 px-4 pt-4 max-w-2xl mx-auto w-full">
        <Outlet />
      </main>

      {/* Bottom navigation — solo en móvil */}
      <nav className="fixed bottom-0 left-0 right-0 bg-surface-800 border-t border-surface-700 flex md:hidden z-10">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex-1 flex flex-col items-center justify-center py-3 text-xs gap-1 transition-colors',
                isActive
                  ? 'text-brand-400'
                  : 'text-surface-600 hover:text-white'
              )
            }
          >
            <Icon size={22} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

    </div>
  )
}
