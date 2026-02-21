import React, { useState } from 'react'
import { Box, Button, Container, TextField, Typography, Paper, Alert, Divider } from '@mui/material'
import { Link, useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import api from '../api'
import { useAuth } from '../context/AuthContext'

const Login = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const googleClientId = import.meta.env.REACT_APP_GOOGLE_CLIENT_ID

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await api.post('/auth/login', form)
      login(response.data)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('')
    try {
      const response = await api.post('/auth/google', { id_token: credentialResponse.credential })
      login(response.data)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Google login failed')
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 6 }}>
      <Container maxWidth="sm">
        <Paper elevation={0} sx={{ p: { xs: 4, md: 5 }, borderRadius: 4 }}>
          <Typography variant="h4" sx={{ mb: 1 }} data-testid="login-title">Welcome back</Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }} data-testid="login-subtitle">
            Sign in to manage memberships and renewals.
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 3 }} data-testid="login-error-alert">{error}</Alert>}
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2.5 }}>
            <TextField
              name="email"
              label="Email"
              type="email"
              value={form.email}
              onChange={handleChange}
              fullWidth
              required
              inputProps={{ 'data-testid': 'login-email-input' }}
            />
            <TextField
              name="password"
              label="Password"
              type="password"
              value={form.password}
              onChange={handleChange}
              fullWidth
              required
              inputProps={{ 'data-testid': 'login-password-input' }}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              data-testid="login-submit-button"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </Box>
          <Box sx={{ mt: 2, textAlign: 'right' }}>
            <Button component={Link} to="/forgot" size="small" data-testid="forgot-password-link">
              Forgot password?
            </Button>
          </Box>
          <Divider sx={{ my: 3 }}>or</Divider>
          <Box sx={{ display: 'flex', justifyContent: 'center' }} data-testid="google-login-container">
            {googleClientId ? (
              <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError('Google login failed')} />
            ) : (
              <Typography variant="body2" color="text.secondary" data-testid="google-login-disabled">
                Google sign-in requires a client ID.
              </Typography>
            )}
          </Box>
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              New here?{' '}
              <Button component={Link} to="/register" size="small" data-testid="register-link">
                Create account
              </Button>
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  )
}

export default Login
