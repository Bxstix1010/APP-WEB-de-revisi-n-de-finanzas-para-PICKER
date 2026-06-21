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
  const user = useAuthStore((s) => s.user)
  return user ? children : <Navigate to="/login" replace />
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
