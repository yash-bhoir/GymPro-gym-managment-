import React, { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  TextField,
  Typography,
  Stack,
  Alert
} from '@mui/material'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import api from '../api'

const defaultForm = {
  name: '',
  duration_days: '',
  price: '',
  description: ''
}

const Packages = () => {
  const [packages, setPackages] = useState([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [alert, setAlert] = useState({ type: '', message: '' })

  const fetchPackages = async () => {
    try {
      const response = await api.get('/packages')
      setPackages(response.data.packages || [])
    } catch (error) {
      setPackages([])
    }
  }

  useEffect(() => {
    fetchPackages()
  }, [])

  const openDialog = (pkg = null) => {
    if (pkg) {
      setSelectedPackage(pkg)
      setForm({
        name: pkg.name,
        duration_days: pkg.duration_days,
        price: pkg.price,
        description: pkg.description || ''
      })
    } else {
      setSelectedPackage(null)
      setForm(defaultForm)
    }
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
  }

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  const handleSave = async () => {
    try {
      const payload = {
        name: form.name,
        duration_days: Number(form.duration_days),
        price: Number(form.price),
        description: form.description
      }
      if (selectedPackage) {
        await api.put(`/packages/${selectedPackage.id}`, payload)
        setAlert({ type: 'success', message: 'Package updated' })
      } else {
        await api.post('/packages', payload)
        setAlert({ type: 'success', message: 'Package created' })
      }
      closeDialog()
      fetchPackages()
    } catch (error) {
      setAlert({ type: 'error', message: error.response?.data?.detail || 'Failed to save package' })
    }
  }

  const handleDelete = async (packageId) => {
    try {
      await api.delete(`/packages/${packageId}`)
      setAlert({ type: 'success', message: 'Package deleted' })
      fetchPackages()
    } catch (error) {
      setAlert({ type: 'error', message: error.response?.data?.detail || 'Failed to delete package' })
    }
  }

  return (
    <Box data-testid="packages-page">
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} sx={{ mb: 3 }} spacing={2}>
        <Box>
          <Typography variant="h6" data-testid="packages-title">Subscription Packages</Typography>
          <Typography variant="body2" color="text.secondary" data-testid="packages-subtitle">Create plans and pricing tiers.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={() => openDialog()} data-testid="add-package-button">
          Add Package
        </Button>
      </Stack>

      {alert.message && (
        <Alert severity={alert.type} sx={{ mb: 3 }} data-testid="packages-alert">
          {alert.message}
        </Alert>
      )}

      <Grid container spacing={2}>
        {packages.map((pkg) => (
          <Grid item xs={12} md={6} key={pkg.id}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }} data-testid={`package-card-${pkg.id}`}>
              <Typography variant="h6" data-testid={`package-name-${pkg.id}`}>{pkg.name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }} data-testid={`package-duration-${pkg.id}`}>
                Duration: {pkg.duration_days} days
              </Typography>
              <Typography variant="body2" color="text.secondary" data-testid={`package-price-${pkg.id}`}>
                Price: ₹{pkg.price}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }} data-testid={`package-description-${pkg.id}`}>
                {pkg.description || 'No description provided'}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Button size="small" variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => openDialog(pkg)} data-testid={`edit-package-${pkg.id}`}>
                  Edit
                </Button>
                <Button size="small" color="error" variant="text" startIcon={<DeleteOutlineOutlinedIcon />} onClick={() => handleDelete(pkg.id)} data-testid={`delete-package-${pkg.id}`}>
                  Delete
                </Button>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>
      {packages.length === 0 && (
        <Typography color="text.secondary" sx={{ mt: 2 }} data-testid="packages-empty">No packages yet. Create your first package.</Typography>
      )}

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle data-testid="package-dialog-title">{selectedPackage ? 'Edit Package' : 'Create Package'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'grid', gap: 2 }}>
            <TextField label="Package Name" name="name" value={form.name} onChange={handleChange} fullWidth required inputProps={{ 'data-testid': 'package-name-input' }} />
            <TextField label="Duration (days)" name="duration_days" type="number" value={form.duration_days} onChange={handleChange} fullWidth required inputProps={{ 'data-testid': 'package-duration-input' }} />
            <TextField label="Price" name="price" type="number" value={form.price} onChange={handleChange} fullWidth required inputProps={{ 'data-testid': 'package-price-input' }} />
            <TextField label="Description" name="description" value={form.description} onChange={handleChange} fullWidth multiline rows={3} inputProps={{ 'data-testid': 'package-description-input' }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={closeDialog} data-testid="package-cancel-button">Cancel</Button>
          <Button variant="contained" onClick={handleSave} data-testid="package-save-button">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Packages
