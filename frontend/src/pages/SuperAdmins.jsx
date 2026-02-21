import React, { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Pagination,
  Paper,
  Stack,
  TextField,
  Typography,
  Alert,
  Chip,
  MenuItem
} from '@mui/material'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import PasswordOutlinedIcon from '@mui/icons-material/PasswordOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import api from '../api'
import { useNavigate } from 'react-router-dom'

const SuperAdmins = () => {
  const navigate = useNavigate()
  const [admins, setAdmins] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [selectedAdmin, setSelectedAdmin] = useState(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState({ full_name: '', email: '', verified: false, disabled: false })
  const [resetPassword, setResetPassword] = useState('')
  const [alert, setAlert] = useState({ type: '', message: '' })

  const fetchAdmins = async () => {
    try {
      const response = await api.get('/super/admins', {
        params: {
          search: search || undefined,
          page,
          page_size: pageSize
        }
      })
      setAdmins(response.data.admins || [])
      setTotal(response.data.total || 0)
    } catch (error) {
      setAdmins([])
    }
  }

  useEffect(() => {
    fetchAdmins()
  }, [search, page])

  const totalPages = useMemo(() => Math.ceil(total / pageSize), [total, pageSize])

  const openEditDialog = (admin) => {
    setSelectedAdmin(admin)
    setEditForm({
      full_name: admin.full_name || '',
      email: admin.email || '',
      verified: admin.verified || false,
      disabled: admin.disabled || false
    })
    setEditDialogOpen(true)
  }

  const handleEditSave = async () => {
    try {
      const response = await api.put(`/super/admins/${selectedAdmin.id}`, editForm)
      setAlert({ type: 'success', message: 'Admin updated successfully' })
      setEditDialogOpen(false)
      fetchAdmins()
    } catch (error) {
      setAlert({ type: 'error', message: error.response?.data?.detail || 'Failed to update admin' })
    }
  }

  const openResetDialog = (admin) => {
    setSelectedAdmin(admin)
    setResetPassword('')
    setResetDialogOpen(true)
  }

  const handleResetPassword = async () => {
    try {
      await api.post(`/super/admins/${selectedAdmin.id}/reset-password`, { new_password: resetPassword })
      setAlert({ type: 'success', message: 'Password reset successfully' })
      setResetDialogOpen(false)
    } catch (error) {
      setAlert({ type: 'error', message: error.response?.data?.detail || 'Password reset failed' })
    }
  }

  const handleDeleteAdmin = async (admin) => {
    const confirmed = window.confirm(`Delete ${admin.full_name}? This removes all members and packages.`)
    if (!confirmed) return
    try {
      await api.delete(`/super/admins/${admin.id}`)
      setAlert({ type: 'success', message: 'Admin deleted' })
      fetchAdmins()
    } catch (error) {
      setAlert({ type: 'error', message: error.response?.data?.detail || 'Failed to delete admin' })
    }
  }

  return (
    <Box data-testid="super-admins-page">
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h6" data-testid="super-admins-title">All Gym Admins</Typography>
          <Typography variant="body2" color="text.secondary" data-testid="super-admins-subtitle">
            Manage every admin account and monitor member counts.
          </Typography>
        </Box>
        <TextField
          label="Search admins"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ minWidth: { xs: '100%', md: 260 } }}
          inputProps={{ 'data-testid': 'super-admins-search-input' }}
        />
      </Stack>

      {alert.message && (
        <Alert severity={alert.type} sx={{ mb: 3 }} data-testid="super-admins-alert">
          {alert.message}
        </Alert>
      )}

      <Grid container spacing={2}>
        {admins.map((admin) => (
          <Grid item xs={12} md={6} key={admin.id}>
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }} data-testid={`super-admin-card-${admin.id}`}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }}>
                <Box>
                  <Typography variant="h6" data-testid={`super-admin-name-${admin.id}`}>{admin.full_name}</Typography>
                  <Typography variant="body2" color="text.secondary" data-testid={`super-admin-email-${admin.id}`}>{admin.email}</Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                    <Chip label={`Members: ${admin.members_count || 0}`} size="small" />
                    <Chip label={admin.verified ? 'Verified' : 'Pending'} color={admin.verified ? 'success' : 'warning'} size="small" />
                    <Chip label={admin.disabled ? 'Disabled' : 'Active'} color={admin.disabled ? 'error' : 'info'} size="small" />
                  </Stack>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button variant="outlined" size="small" startIcon={<VisibilityOutlinedIcon />} onClick={() => navigate(`/super-members?admin=${admin.id}`)} data-testid={`super-admin-view-${admin.id}`}>
                    View Members
                  </Button>
                  <Button variant="outlined" size="small" startIcon={<EditOutlinedIcon />} onClick={() => openEditDialog(admin)} data-testid={`super-admin-edit-${admin.id}`}>
                    Edit
                  </Button>
                  <Button variant="outlined" size="small" startIcon={<PasswordOutlinedIcon />} onClick={() => openResetDialog(admin)} data-testid={`super-admin-reset-${admin.id}`}>
                    Reset Password
                  </Button>
                  <Button variant="text" size="small" color="error" startIcon={<DeleteOutlineOutlinedIcon />} onClick={() => handleDeleteAdmin(admin)} data-testid={`super-admin-delete-${admin.id}`}>
                    Delete
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {admins.length === 0 && (
        <Typography color="text.secondary" sx={{ mt: 2 }} data-testid="super-admins-empty">
          No admin accounts found.
        </Typography>
      )}

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination count={totalPages} page={page} onChange={(_, value) => setPage(value)} data-testid="super-admins-pagination" />
        </Box>
      )}

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle data-testid="super-admin-edit-title">Edit Admin</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'grid', gap: 2 }}>
            <TextField
              label="Full Name"
              value={editForm.full_name}
              onChange={(event) => setEditForm({ ...editForm, full_name: event.target.value })}
              fullWidth
              inputProps={{ 'data-testid': 'super-admin-edit-name-input' }}
            />
            <TextField
              label="Email"
              value={editForm.email}
              onChange={(event) => setEditForm({ ...editForm, email: event.target.value })}
              fullWidth
              inputProps={{ 'data-testid': 'super-admin-edit-email-input' }}
            />
            <TextField
              select
              label="Verified"
              value={editForm.verified ? 'yes' : 'no'}
              onChange={(event) => setEditForm({ ...editForm, verified: event.target.value === 'yes' })}
              fullWidth
              inputProps={{ 'data-testid': 'super-admin-edit-verified-select' }}
            >
              <MenuItem value="yes">Verified</MenuItem>
              <MenuItem value="no">Not Verified</MenuItem>
            </TextField>
            <TextField
              select
              label="Status"
              value={editForm.disabled ? 'disabled' : 'active'}
              onChange={(event) => setEditForm({ ...editForm, disabled: event.target.value === 'disabled' })}
              fullWidth
              inputProps={{ 'data-testid': 'super-admin-edit-status-select' }}
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="disabled">Disabled</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setEditDialogOpen(false)} data-testid="super-admin-edit-cancel">Cancel</Button>
          <Button variant="contained" onClick={handleEditSave} data-testid="super-admin-edit-save">Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle data-testid="super-admin-reset-title">Reset Password</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField
              label="New Password"
              type="password"
              value={resetPassword}
              onChange={(event) => setResetPassword(event.target.value)}
              fullWidth
              inputProps={{ 'data-testid': 'super-admin-reset-input' }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setResetDialogOpen(false)} data-testid="super-admin-reset-cancel">Cancel</Button>
          <Button variant="contained" onClick={handleResetPassword} data-testid="super-admin-reset-save">Update</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default SuperAdmins
