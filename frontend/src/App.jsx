import React, { useMemo, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, CssBaseline, Box } from '@mui/material'
import getTheme from './theme'
import { useAuth } from './context/AuthContext'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyOtp from './pages/VerifyOtp'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Members from './pages/Members'
import Packages from './pages/Packages'
import Payments from './pages/Payments'
import Settings from './pages/Settings'

const AppLayout = ({ title, children, mode, onToggleMode }) => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { admin, logout } = useAuth()

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev)
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }} data-testid="app-layout">
      <Sidebar mobileOpen={mobileOpen} onClose={handleDrawerToggle} />
      <Box sx={{ flexGrow: 1, width: { md: `calc(100% - 260px)` }, px: { xs: 3, md: 4 }, py: 2 }}>
        <Topbar
          title={title}
          onMenuClick={handleDrawerToggle}
          mode={mode}
          onToggleMode={onToggleMode}
          admin={admin}
          onLogout={logout}
        />
        <Box sx={{ mt: 3 }}>{children}</Box>
      </Box>
    </Box>
  )
}

const App = () => {
  const { admin } = useAuth()
  const [mode, setMode] = useState(localStorage.getItem('theme_mode') || 'light')
  const theme = useMemo(() => getTheme(mode), [mode])

  const handleToggleMode = () => {
    const next = mode === 'dark' ? 'light' : 'dark'
    setMode(next)
    localStorage.setItem('theme_mode', next)
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/" element={<Navigate to={admin ? '/dashboard' : '/login'} replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify" element={<VerifyOtp />} />
        <Route path="/forgot" element={<ForgotPassword />} />
        <Route path="/reset" element={<ResetPassword />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AppLayout title="Dashboard" mode={mode} onToggleMode={handleToggleMode}>
                <Dashboard />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/members"
          element={
            <ProtectedRoute>
              <AppLayout title="Members" mode={mode} onToggleMode={handleToggleMode}>
                <Members />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/packages"
          element={
            <ProtectedRoute>
              <AppLayout title="Packages" mode={mode} onToggleMode={handleToggleMode}>
                <Packages />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/payments"
          element={
            <ProtectedRoute>
              <AppLayout title="Payments" mode={mode} onToggleMode={handleToggleMode}>
                <Payments />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <AppLayout title="Settings" mode={mode} onToggleMode={handleToggleMode}>
                <Settings />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  )
}

export default App
