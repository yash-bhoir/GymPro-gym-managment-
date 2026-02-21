import React, { useState } from 'react'
import { Box, Button, Container, TextField, Typography, Paper, Alert } from '@mui/material'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'

const Register = () = {
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm_password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (event) = {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  const handleSubmit = async (event) = {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/register', form)
      navigate(`/verify?email=${encodeURIComponent(form.email)}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 6 }}
      Container maxWidth="sm"
        Paper elevation={0} sx={{ p: { xs: 4, md: 5 }, borderRadius: 4 }}
          Typography variant="h4" sx={{ mb: 1 }} data-testid="register-title"Create your admin account/Typography
          Typography color="text.secondary" sx={{ mb: 4 }} data-testid="register-subtitle"
            Start managing memberships in minutes.
          /TypoGraphy
          {error && Alert severity="error" sx={{ mb: 3 }} data-testid="register-error-alert"{error}/Alert}
          Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2.5 }}
            TextField
              name="full_name"
              label="Full Name"
              value={form.full_name}
              onChange={handleChange}
              fullWidth
              required
              inputProps={{ 'data-testid': 'register-name-input' }}
            /
            TextField
              name="email"
              label="Email"
              type="email"
              value={form.email}
              onChange={handleChange}
              fullWidth
              required
              inputProps={{ 'data-testid': 'register-email-input' }}
            /
            TextField
              name="password"
              label="Password"
              type="password"
              value={form.password}
              onChange={handleChange}
              fullWidth
              required
              inputProps={{ 'data-testid': 'register-password-input' }}
            /
            TextField
              name="confirm_password"
              label="Confirm Password"
              type="password"
              value={form.confirm_password}
              onChange={handleChange}
              fullWidth
              required
              inputProps={{ 'data-testid': 'register-confirm-password-input' }}
            /
            Button type="submit" variant="contained" size="large" disabled={loading} data-testid="register-submit-button"
              {loading ? 'Creating...' : 'Create Account'}
            /Button
          /Box
          Box sx={{ mt: 3, textAlign: 'center' }}
            Typography variant="body2" color="text.secondary"
              Already have an account?{' '}
              Button component={Link} to="/login" size="small" data-testid="login-link"
                Sign in
              /Button
            /TypoGraphy
          /Box
        /Paper
      /Container
    /Box
  )
}

export default Register
