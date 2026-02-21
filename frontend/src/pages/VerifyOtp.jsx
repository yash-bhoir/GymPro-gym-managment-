import React, { useState } from 'react'
import { Box, Button, Container, TextField, Typography, Paper, Alert } from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'

const VerifyOtp = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const { search } = useLocation()
  const emailParam = new URLSearchParams(search).get('email') || ''
  const [form, setForm] = useState({ email: emailParam, otp: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const response = await api.post('/auth/verify-otp', form)
      login(response.data)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'OTP verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 6 }}>
      <Container maxWidth="sm">
        <Paper elevation={0} sx={{ p: { xs: 4, md: 5 }, borderRadius: 4 }}>
          <Typography variant="h4" sx={{ mb: 1 }} data-testid="verify-title">Verify your email</Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }} data-testid="verify-subtitle">
            Enter the 6-digit OTP sent to your email.
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 3 }} data-testid="verify-error-alert">{error}</Alert>}
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2.5 }}>
            <TextField
              name="email"
              label="Email"
              type="email"
              value={form.email}
              onChange={handleChange}
              fullWidth
              required
              inputProps={{ 'data-testid': 'verify-email-input' }}
            />
            <TextField
              name="otp"
              label="OTP"
              value={form.otp}
              onChange={handleChange}
              fullWidth
              required
              inputProps={{ 'data-testid': 'verify-otp-input' }}
            />
            <Button type="submit" variant="contained" size="large" disabled={loading} data-testid="verify-submit-button">
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  )
}

export default VerifyOtp
