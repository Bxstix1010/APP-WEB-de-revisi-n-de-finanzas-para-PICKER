import { create } from 'zustand'
import { authAPI, profilesAPI } from '../api'

const useAuthStore = create((set) => ({
  user:      JSON.parse(localStorage.getItem('user') || 'null'),
  profileId: JSON.parse(localStorage.getItem('profileId') || 'null'),
  loading:   false,
  error:     null,

  // Trae el perfil real del usuario logueado y lo guarda — se usa
  // en vez de asumir profileId = 1 en cualquier parte de la app.
  loadProfile: async () => {
    try {
      const { data } = await profilesAPI.me()
      const id = data?.[0]?.id ?? null
      localStorage.setItem('profileId', JSON.stringify(id))
      set({ profileId: id })
      return id
    } catch (err) {
      console.error('Error cargando perfil', err)
      return null
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const { data } = await authAPI.login({ email, password })
      localStorage.setItem('access_token',  data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      localStorage.setItem('user',          JSON.stringify(data.user))
      set({ user: data.user, loading: false })

      // Cargamos el perfil real inmediatamente después de loguear
      const { data: perfiles } = await profilesAPI.me()
      const id = perfiles?.[0]?.id ?? null
      localStorage.setItem('profileId', JSON.stringify(id))
      set({ profileId: id })

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

      const { data: perfiles } = await profilesAPI.me()
      const id = perfiles?.[0]?.id ?? null
      localStorage.setItem('profileId', JSON.stringify(id))
      set({ profileId: id })

      return true
    } catch (err) {
      set({ error: err.response?.data?.error || 'Error al registrarse', loading: false })
      return false
    }
  },

  logout: () => {
    localStorage.clear()
    set({ user: null, profileId: null })
  },

  updateRetencion: async (pct) => {
    try {
      const { data } = await authAPI.updateMe({ retencion_pct: pct })
      localStorage.setItem('user', JSON.stringify(data))
      set({ user: data })
      return true
    } catch (err) {
      set({ error: err.response?.data?.error || 'Error al actualizar' })
      return false
    }
  },

  clearError: () => set({ error: null }),
}))

export default useAuthStore
