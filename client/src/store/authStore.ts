import { create } from 'zustand'
import api from '../lib/axios'
import { forgetStoredFilters } from '../lib/useStoredFilter'

interface User {
  id: string
  email: string
}

interface AuthState {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => {
  return {
    user: null,
    token: localStorage.getItem('token'),

    login: async (email, password) => {
      const { data } = await api.post('/auth/login', { email, password })
      localStorage.setItem('token', data.token)
      set({ user: data.user, token: data.token })
    },

    logout: () => {
      // Cancels the refresh token on the server. The user is logged out here either way.
      api.post('/auth/logout').catch(() => {})
      localStorage.removeItem('token')
      // The next person on this device starts with every page's filters as they open
      forgetStoredFilters()
      set({ user: null, token: null })
    },
  }
})

