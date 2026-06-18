import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './context/authStore'

// Pages
import LoginPage    from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import MonthPage    from './pages/MonthPage'
import DayPage      from './pages/DayPage'
import SettingsPage from './pages/SettingsPage'

// Layout
import AppLayout from './components/AppLayout'

function PrivateRoute({ children }) {
  const user = useAuthStore((s) => s.user)
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <div className="dark">
      <BrowserRouter>
        <Routes>
          {/* Públicas */}
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Privadas con layout */}
          <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
            <Route index                        element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"             element={<DashboardPage />} />
            <Route path="months/:monthId"       element={<MonthPage />} />
            <Route path="days/:dayId"           element={<DayPage />} />
            <Route path="settings"              element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  )
}
