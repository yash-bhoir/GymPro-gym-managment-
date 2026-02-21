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
import SuperDashboard from './pages/SuperDashboard'
import SuperAdmins from './pages/SuperAdmins'
import SuperMembers from './pages/SuperMembers'

const AppLayout = ({ title, children, mode, onToggleMode }) => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { admin, logout } = useAuth()

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev)
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%' }} data-testid="app-layout">
      <Sidebar mobileOpen={mobileOpen} onClose={handleDrawerToggle} admin={admin} />
      <Box
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - 260px)` },
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 1.5, md: 2 },
          overflowX: 'hidden'
        }}
      >
        <Topbar
          title={title}
          onMenuClick={handleDrawerToggle}
          mode={mode}
          onToggleMode={onToggleMode}
          admin={admin}
          onLogout={logout}
        />
        <Box sx={{ mt: { xs: 2, md: 3 } }}>{children}</Box>
      </Box>
    </Box>
  )
}

const App = () => {
  const { admin } = useAuth()
  const [mode, setMode] = useState(localStorage.getItem('theme_mode') || 'light')
  const theme = useMemo(() => getTheme(mode), [mode])
  const isSuperAdmin = admin?.role === 'super_admin'

  const handleToggleMode = () => {
    const next = mode === 'dark' ? 'light' : 'dark'
    setMode(next)
    localStorage.setItem('theme_mode', next)
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/" element={<Navigate to={admin ? (isSuperAdmin ? '/super-dashboard' : '/dashboard') : '/login'} replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify" element={<VerifyOtp />} />
        <Route path="/forgot" element={<ForgotPassword />} />
        <Route path="/reset" element={<ResetPassword />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              {isSuperAdmin ? (
                <Navigate to="/super-dashboard" replace />
              ) : (
                <AppLayout title="Dashboard" mode={mode} onToggleMode={handleToggleMode}>
                  <Dashboard />
                </AppLayout>
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="/members"
          element={
            <ProtectedRoute>
              {isSuperAdmin ? (
                <Navigate to="/super-dashboard" replace />
              ) : (
                <AppLayout title="Members" mode={mode} onToggleMode={handleToggleMode}>
                  <Members />
                </AppLayout>
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="/packages"
          element={
            <ProtectedRoute>
              {isSuperAdmin ? (
                <Navigate to="/super-dashboard" replace />
              ) : (
                <AppLayout title="Packages" mode={mode} onToggleMode={handleToggleMode}>
                  <Packages />
                </AppLayout>
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="/payments"
          element={
            <ProtectedRoute>
              {isSuperAdmin ? (
                <Navigate to="/super-dashboard" replace />
              ) : (
                <AppLayout title="Payments" mode={mode} onToggleMode={handleToggleMode}>
                  <Payments />
                </AppLayout>
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              {isSuperAdmin ? (
                <Navigate to="/super-dashboard" replace />
              ) : (
                <AppLayout title="Settings" mode={mode} onToggleMode={handleToggleMode}>
                  <Settings />
                </AppLayout>
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="/super-dashboard"
          element={
            <ProtectedRoute>
              {isSuperAdmin ? (
                <AppLayout title="Super Dashboard" mode={mode} onToggleMode={handleToggleMode}>
                  <SuperDashboard />
                </AppLayout>
              ) : (
                <Navigate to="/dashboard" replace />
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="/super-admins"
          element={
            <ProtectedRoute>
              {isSuperAdmin ? (
                <AppLayout title="All Admins" mode={mode} onToggleMode={handleToggleMode}>
                  <SuperAdmins />
                </AppLayout>
              ) : (
                <Navigate to="/dashboard" replace />
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="/super-members"
          element={
            <ProtectedRoute>
              {isSuperAdmin ? (
                <AppLayout title="All Members" mode={mode} onToggleMode={handleToggleMode}>
                  <SuperMembers />
                </AppLayout>
              ) : (
                <Navigate to="/dashboard" replace />
              )}
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  )
}

export default App
