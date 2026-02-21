import React, { useState } from 'react'
import { Box, Button, Container, TextField, Typography, Paper, Alert } from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../api'

const ResetPassword = () => {
  const navigate = useNavigate()
  const { search } = useLocation()
  const emailParam = new URLSearchParams(search).get('email') || ''
  const [form, setForm] = useState({ email: emailParam, otp: '', new_password: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      await api.post('/auth/reset-password', form)
      setSuccess('Password reset successful')
      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.detail || 'Reset failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 6 }}>
      <Container maxWidth="sm">
        <Paper elevation={0} sx={{ p: { xs: 4, md: 5 }, borderRadius: 4 }}>
          <Typography variant="h4" sx={{ mb: 1 }} data-testid="reset-title">Set a new password</Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }} data-testid="reset-subtitle">
            Enter the OTP you received and create a new password.
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 3 }} data-testid="reset-error-alert">{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 3 }} data-testid="reset-success-alert">{success}</Alert>}
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2.5 }}>
            <TextField
              name="email"
              label="Email"
              type="email"
              value={form.email}
              onChange={handleChange}
              fullWidth
              required
              inputProps={{ 'data-testid': 'reset-email-input' }}
            />
            <TextField
              name="otp"
              label="OTP"
              value={form.otp}
              onChange={handleChange}
              fullWidth
              required
              inputProps={{ 'data-testid': 'reset-otp-input' }}
            />
            <TextField
              name="new_password"
              label="New Password"
              type="password"
              value={form.new_password}
              onChange={handleChange}
              fullWidth
              required
              inputProps={{ 'data-testid': 'reset-password-input' }}
            />
            <Button type="submit" variant="contained" size="large" disabled={loading} data-testid="reset-submit-button">
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  )
}

export default ResetPassword
