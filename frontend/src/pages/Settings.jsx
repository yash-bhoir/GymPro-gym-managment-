import React, { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Grid,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
  Switch,
  FormControlLabel,
  Alert,
  MenuItem
} from '@mui/material'
import api from '../api'
import { useAuth } from '../context/AuthContext'

const Settings = () => {
  const { admin, refreshProfile } = useAuth()
  const [tab, setTab] = useState(0)
  const [profile, setProfile] = useState({ full_name: '', email: '' })
  const [password, setPassword] = useState({ current_password: '', new_password: '' })
  const [smtp, setSmtp] = useState({ email: '', app_password: '', enabled: false })
  const [whatsapp, setWhatsapp] = useState({ access_token: '', phone_number_id: '', business_id: '', enabled: false })
  const [reminders, setReminders] = useState({ days_before_expiry: [1, 3, 7], reminder_type: 'both', payment_pending_enabled: true })
  const [customDays, setCustomDays] = useState('')
  const [alert, setAlert] = useState({ type: '', message: '' })

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await api.get('/settings')
        const settings = response.data.settings
        setSmtp(settings.smtp || { email: '', app_password: '', enabled: false })
        setWhatsapp(settings.whatsapp || { access_token: '', phone_number_id: '', business_id: '', enabled: false })
        setReminders(settings.reminders || { days_before_expiry: [1, 3, 7], reminder_type: 'both', payment_pending_enabled: true })
      } catch (error) {
        setAlert({ type: 'error', message: 'Unable to load settings' })
      }
    }
    loadSettings()
  }, [])

  useEffect(() => {
    if (admin) {
      setProfile({ full_name: admin.full_name || '', email: admin.email || '' })
    }
  }, [admin])

  const handleSaveProfile = async () => {
    try {
      const response = await api.put('/settings/profile', profile)
      refreshProfile()
      setAlert({ type: 'success', message: 'Profile updated' })
    } catch (error) {
      setAlert({ type: 'error', message: error.response?.data?.detail || 'Profile update failed' })
    }
  }

  const handleChangePassword = async () => {
    try {
      await api.put('/settings/password', password)
      setPassword({ current_password: '', new_password: '' })
      setAlert({ type: 'success', message: 'Password updated' })
    } catch (error) {
      setAlert({ type: 'error', message: error.response?.data?.detail || 'Password update failed' })
    }
  }

  const handleSaveNotifications = async () => {
    try {
      const extraDays = customDays
        .split(',')
        .map((item) => parseInt(item.trim(), 10))
        .filter((value) => !Number.isNaN(value))
      const days = Array.from(new Set([...(reminders.days_before_expiry || []), ...extraDays]))
      const payload = {
        smtp,
        whatsapp,
        reminders: { ...reminders, days_before_expiry: days }
      }
      await api.put('/settings', payload)
      setAlert({ type: 'success', message: 'Notification settings saved' })
    } catch (error) {
      setAlert({ type: 'error', message: error.response?.data?.detail || 'Failed to save notifications' })
    }
  }

  const toggleReminderDay = (day) => {
    const current = reminders.days_before_expiry || []
    const updated = current.includes(day) ? current.filter((value) => value !== day) : [...current, day]
    setReminders({ ...reminders, days_before_expiry: updated })
  }

  return (
    <Box data-testid="settings-page">
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3 }}>
        <Tabs value={tab} onChange={(_, value) => setTab(value)} data-testid="settings-tabs">
          <Tab label="Profile" data-testid="settings-tab-profile" />
          <Tab label="Security" data-testid="settings-tab-security" />
          <Tab label="Notifications" data-testid="settings-tab-notifications" />
        </Tabs>
        {alert.message && (
          <Alert severity={alert.type} sx={{ mt: 2 }} data-testid="settings-alert">
            {alert.message}
          </Alert>
        )}

        {tab === 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }} data-testid="profile-section-title">Profile</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Full Name"
                  value={profile.full_name}
                  onChange={(event) => setProfile({ ...profile, full_name: event.target.value })}
                  fullWidth
                  inputProps={{ 'data-testid': 'profile-name-input' }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Email"
                  value={profile.email}
                  onChange={(event) => setProfile({ ...profile, email: event.target.value })}
                  fullWidth
                  inputProps={{ 'data-testid': 'profile-email-input' }}
                />
              </Grid>
            </Grid>
            <Button variant="contained" sx={{ mt: 3 }} onClick={handleSaveProfile} data-testid="profile-save-button">
              Save Profile
            </Button>
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }} data-testid="security-section-title">Change Password</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Current Password"
                  type="password"
                  value={password.current_password}
                  onChange={(event) => setPassword({ ...password, current_password: event.target.value })}
                  fullWidth
                  inputProps={{ 'data-testid': 'password-current-input' }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="New Password"
                  type="password"
                  value={password.new_password}
                  onChange={(event) => setPassword({ ...password, new_password: event.target.value })}
                  fullWidth
                  inputProps={{ 'data-testid': 'password-new-input' }}
                />
              </Grid>
            </Grid>
            <Button variant="contained" sx={{ mt: 3 }} onClick={handleChangePassword} data-testid="password-save-button">
              Update Password
            </Button>
          </Box>
        )}

        {tab === 2 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }} data-testid="notifications-section-title">Email Settings</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Gmail ID"
                  value={smtp.email}
                  onChange={(event) => setSmtp({ ...smtp, email: event.target.value })}
                  fullWidth
                  inputProps={{ 'data-testid': 'smtp-email-input' }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="App Password"
                  value={smtp.app_password}
                  onChange={(event) => setSmtp({ ...smtp, app_password: event.target.value })}
                  fullWidth
                  inputProps={{ 'data-testid': 'smtp-password-input' }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={<Switch checked={smtp.enabled} onChange={(event) => setSmtp({ ...smtp, enabled: event.target.checked })} data-testid="smtp-enabled-switch" />}
                  label="Enable Email Reminders"
                />
              </Grid>
            </Grid>

            <Typography variant="h6" sx={{ mt: 4, mb: 2 }} data-testid="whatsapp-section-title">WhatsApp Settings</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Access Token"
                  value={whatsapp.access_token}
                  onChange={(event) => setWhatsapp({ ...whatsapp, access_token: event.target.value })}
                  fullWidth
                  inputProps={{ 'data-testid': 'whatsapp-token-input' }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Phone Number ID"
                  value={whatsapp.phone_number_id}
                  onChange={(event) => setWhatsapp({ ...whatsapp, phone_number_id: event.target.value })}
                  fullWidth
                  inputProps={{ 'data-testid': 'whatsapp-phone-id-input' }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Business ID"
                  value={whatsapp.business_id}
                  onChange={(event) => setWhatsapp({ ...whatsapp, business_id: event.target.value })}
                  fullWidth
                  inputProps={{ 'data-testid': 'whatsapp-business-id-input' }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={<Switch checked={whatsapp.enabled} onChange={(event) => setWhatsapp({ ...whatsapp, enabled: event.target.checked })} data-testid="whatsapp-enabled-switch" />}
                  label="Enable WhatsApp Reminders"
                />
              </Grid>
            </Grid>

            <Typography variant="h6" sx={{ mt: 4, mb: 2 }} data-testid="reminder-section-title">Reminder Rules</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Days before expiry</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {[1, 3, 7].map((day) => (
                    <Button
                      key={day}
                      variant={reminders.days_before_expiry.includes(day) ? 'contained' : 'outlined'}
                      onClick={() => toggleReminderDay(day)}
                      data-testid={`reminder-day-${day}`}
                    >
                      {day} Day
                    </Button>
                  ))}
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Custom days (comma separated)"
                  value={customDays}
                  onChange={(event) => setCustomDays(event.target.value)}
                  fullWidth
                  inputProps={{ 'data-testid': 'reminder-custom-days-input' }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  label="Reminder Type"
                  value={reminders.reminder_type}
                  onChange={(event) => setReminders({ ...reminders, reminder_type: event.target.value })}
                  fullWidth
                  inputProps={{ 'data-testid': 'reminder-type-select' }}
                >
                  <MenuItem value="email" data-testid="reminder-type-email-option">Email Only</MenuItem>
                  <MenuItem value="whatsapp" data-testid="reminder-type-whatsapp-option">WhatsApp Only</MenuItem>
                  <MenuItem value="both" data-testid="reminder-type-both-option">Email + WhatsApp</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={<Switch checked={reminders.payment_pending_enabled} onChange={(event) => setReminders({ ...reminders, payment_pending_enabled: event.target.checked })} data-testid="reminder-payment-toggle" />}
                  label="Send payment pending reminders"
                />
              </Grid>
            </Grid>

            <Button variant="contained" sx={{ mt: 3 }} onClick={handleSaveNotifications} data-testid="notifications-save-button">
              Save Notification Settings
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  )
}

export default Settings
