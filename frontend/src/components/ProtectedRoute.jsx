import React from 'react'
import { Navigate } from 'react-router-dom'
import { CircularProgress, Box } from '@mui/material'
import { useAuth } from '../context/AuthContext'

const ProtectedRoute = ({ children }) => {
  const { admin, loading } = useAuth()

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress data-testid="auth-loading-indicator" />
      </Box>
    )
  }

  if (!admin) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute
