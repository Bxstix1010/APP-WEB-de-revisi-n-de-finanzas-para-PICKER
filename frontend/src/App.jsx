import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './context/authStore'
import AppLayout    from './components/AppLayout'
import LoginPage    from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import PlannerPage  from './pages/PlannerPage'
import MonthPage    from './pages/MonthPage'
import DayPage      from './pages/DayPage'
import CompaniesPage from './pages/CompaniesPage'
import EditTariffPage from './pages/EditTariffPage'
import SettingsPage from './pages/SettingsPage'

function PrivateRoute({ children }) {
  const { user, profileId, loadProfile } = useAuthStore()
  const [checking, setChecking] = useState(!profileId)

  useEffect(() => {
    // Si hay sesión pero falta profileId (ej: sesiones iniciadas antes
    // de que existiera este campo), lo cargamos una vez al entrar.
    if (user && !profileId) {
      loadProfile().finally(() => setChecking(false))
    } else {
      setChecking(false)
    }
  }, [user, profileId])

  if (!user) return <Navigate to="/login" replace />

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          <Route index                     element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"          element={<DashboardPage />} />
          <Route path="planner/:dayId"     element={<PlannerPage />} />
          <Route path="months/:monthId"    element={<MonthPage />} />
          <Route path="days/:dayId"        element={<DayPage />} />
          <Route path="companies"          element={<CompaniesPage />} />
          <Route path="companies/:companyId/tariff" element={<EditTariffPage />} />
          <Route path="settings"           element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
