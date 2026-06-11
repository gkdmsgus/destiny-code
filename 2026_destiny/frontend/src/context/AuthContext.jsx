import { createContext, useContext, useState, useCallback } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) return null
    return {
      nickname: localStorage.getItem('nickname'),
      email: localStorage.getItem('email'),
    }
  })

  const saveSession = (data) => {
    if (data?.accessToken)  localStorage.setItem('accessToken', data.accessToken)
    if (data?.refreshToken) localStorage.setItem('refreshToken', data.refreshToken)
    if (data?.nickname)     localStorage.setItem('nickname', data.nickname)
    if (data?.email)        localStorage.setItem('email', data.email)
    setUser({ nickname: data.nickname, email: data.email })
  }

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    saveSession(data)
  }, [])

  const signup = useCallback(async (email, password, nickname) => {
    const { data } = await api.post('/auth/signup', { email, password, nickname })
    saveSession(data)
  }, [])

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout') } finally {
      localStorage.clear()
      setUser(null)
    }
  }, [])

  const deleteAccount = useCallback(async () => {
    await api.delete('/auth/me')
    localStorage.clear()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
