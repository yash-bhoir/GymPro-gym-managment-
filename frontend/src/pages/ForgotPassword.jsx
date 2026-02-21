import React, { useState } from 'react'
import { Box, Button, Container, TextField, Typography, Paper, Alert } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import api from '../api'

const ForgotPassword = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSuccess('OTP sent to your email')
      navigate(`/reset?email=${encodeURIComponent(email)}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 6 }}>
      <Container maxWidth="sm">
        <Paper elevation={0} sx={{ p: { xs: 4, md: 5 }, borderRadius: 4 }}>
          <Typography variant="h4" sx={{ mb: 1 }} data-testid="forgot-title">Reset password</Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }} data-testid="forgot-subtitle">
            We will send a 6-digit OTP to your email.
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 3 }} data-testid="forgot-error-alert">{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 3 }} data-testid="forgot-success-alert">{success}</Alert>}
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2.5 }}>
            <TextField
              name="email"
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              fullWidth
              required
              inputProps={{ 'data-testid': 'forgot-email-input' }}
            />
            <Button type="submit" variant="contained" size="large" disabled={loading} data-testid="forgot-submit-button">
              {loading ? 'Sending...' : 'Send OTP'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  )
}

export default ForgotPassword
