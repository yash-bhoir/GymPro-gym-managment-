import React, { createContext, useContext, useEffect, useState } from 'react'
import api from '../api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async () => {
    try {
      const response = await api.get('/auth/me')
      setAdmin(response.data.admin)
    } catch (error) {
      setAdmin(null)
    }
  }

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('access_token')
      if (token) {
        await fetchProfile()
      }
      setLoading(false)
    }
    init()
  }, [])

  const login = ({ access_token, refresh_token, admin: adminData }) => {
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('refresh_token', refresh_token)
    setAdmin(adminData)
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setAdmin(null)
  }

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout, refreshProfile: fetchProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
