import { create } from 'zustand'
import { authAPI } from '../api'

const useAuthStore = create((set) => ({
  user:    JSON.parse(localStorage.getItem('user') || 'null'),
  loading: false,
  error:   null,

  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const { data } = await authAPI.login({ email, password })
      localStorage.setItem('access_token',  data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      localStorage.setItem('user',          JSON.stringify(data.user))
      set({ user: data.user, loading: false })
      return true
    } catch (err) {
      set({ error: err.response?.data?.error || 'Error de conexión', loading: false })
      return false
    }
  },

  register: async (nombre, email, password) => {
    set({ loading: true, error: null })
    try {
      const { data } = await authAPI.register({ nombre, email, password })
      localStorage.setItem('access_token',  data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      localStorage.setItem('user',          JSON.stringify(data.user))
      set({ user: data.user, loading: false })
      return true
    } catch (err) {
      set({ error: err.response?.data?.error || 'Error al registrarse', loading: false })
      return false
    }
  },

  logout: () => {
    localStorage.clear()
    set({ user: null })
  },

  clearError: () => set({ error: null }),
}))

export default useAuthStore