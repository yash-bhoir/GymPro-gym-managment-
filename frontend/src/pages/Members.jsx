import React, { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Stack,
  TextField,
  Typography,
  Alert,
  Paper
} from '@mui/material'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import SendOutlinedIcon from '@mui/icons-material/SendOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import dayjs from 'dayjs'
import api from '../api'

const defaultForm = {
  full_name: '',
  phone_number: '',
  email: '',
  address: '',
  date_of_birth: '',
  gender: '',
  emergency_contact: '',
  joining_date: dayjs().format('YYYY-MM-DD'),
  package_id: '',
  paid_amount: 0,
  payment_method: ''
}

const Members = () => {
  const [members, setMembers] = useState([])
  const [packages, setPackages] = useState([])
  const [filters, setFilters] = useState({ search: '', status: '', payment: '' })
  const [sortDir, setSortDir] = useState(1)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [memberDialogOpen, setMemberDialogOpen] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'Cash', transaction_id: '', payment_date: dayjs().format('YYYY-MM-DD') })
  const [alert, setAlert] = useState({ type: '', message: '' })

  const fetchPackages = async () => {
    try {
      const response = await api.get('/packages')
      setPackages(response.data.packages || [])
    } catch (error) {
      setPackages([])
    }
  }

  const fetchMembers = async () => {
    setLoading(true)
    try {
      const response = await api.get('/members', {
        params: {
          search: filters.search || undefined,
          status_filter: filters.status || undefined,
          payment_status: filters.payment || undefined,
          sort_by: 'end_date',
          sort_dir: sortDir,
          page,
          page_size: pageSize
        }
      })
      setMembers(response.data.members || [])
      setTotal(response.data.total || 0)
    } catch (error) {
      setMembers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPackages()
  }, [])

  useEffect(() => {
    fetchMembers()
  }, [filters, sortDir, page])

  const totalPages = useMemo(() => Math.ceil(total / pageSize), [total, pageSize])

  const openMemberDialog = (member = null) => {
    if (member) {
      setSelectedMember(member)
      setForm({
        full_name: member.full_name || '',
        phone_number: member.phone_number || '',
        email: member.email || '',
        address: member.address || '',
        date_of_birth: member.date_of_birth ? dayjs(member.date_of_birth).format('YYYY-MM-DD') : '',
        gender: member.gender || '',
        emergency_contact: member.emergency_contact || '',
        joining_date: member.joining_date ? dayjs(member.joining_date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        package_id: member.package_id || '',
        paid_amount: member.payment?.paid_amount || 0,
        payment_method: member.payment?.method || ''
      })
    } else {
      setSelectedMember(null)
      setForm(defaultForm)
    }
    setMemberDialogOpen(true)
  }

  const closeMemberDialog = () => {
    setMemberDialogOpen(false)
  }

  const openPaymentDialog = (member) => {
    setSelectedMember(member)
    setPaymentForm({ amount: '', method: 'Cash', transaction_id: '', payment_date: dayjs().format('YYYY-MM-DD') })
    setPaymentDialogOpen(true)
  }

  const handleMemberChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  const handlePaymentChange = (event) => {
    setPaymentForm({ ...paymentForm, [event.target.name]: event.target.value })
  }

  const handleSaveMember = async () => {
    try {
      const payload = {
        ...form,
        joining_date: new Date(form.joining_date).toISOString(),
        date_of_birth: form.date_of_birth ? new Date(form.date_of_birth).toISOString() : null,
        paid_amount: Number(form.paid_amount || 0)
      }

      if (selectedMember) {
        await api.put(`/members/${selectedMember.id}`, payload)
        setAlert({ type: 'success', message: 'Member updated successfully' })
      } else {
        await api.post('/members', payload)
        setAlert({ type: 'success', message: 'Member added successfully' })
      }
      closeMemberDialog()
      fetchMembers()
    } catch (error) {
      setAlert({ type: 'error', message: error.response?.data?.detail || 'Unable to save member' })
    }
  }

  const handleDeleteMember = async (memberId) => {
    try {
      await api.delete(`/members/${memberId}`)
      setAlert({ type: 'success', message: 'Member removed' })
      fetchMembers()
    } catch (error) {
      setAlert({ type: 'error', message: error.response?.data?.detail || 'Failed to delete member' })
    }
  }

  const handleSendReminder = async (memberId) => {
    try {
      await api.post('/reminders/send', { member_id: memberId })
      setAlert({ type: 'success', message: 'Reminder sent' })
    } catch (error) {
      setAlert({ type: 'error', message: error.response?.data?.detail || 'Reminder failed' })
    }
  }

  const handleAddPayment = async () => {
    try {
      await api.post(`/members/${selectedMember.id}/payments`, {
        amount: Number(paymentForm.amount),
        method: paymentForm.method,
        transaction_id: paymentForm.transaction_id,
        payment_date: paymentForm.payment_date ? new Date(paymentForm.payment_date).toISOString() : null
      })
      setAlert({ type: 'success', message: 'Payment updated' })
      setPaymentDialogOpen(false)
      fetchMembers()
    } catch (error) {
      setAlert({ type: 'error', message: error.response?.data?.detail || 'Payment update failed' })
    }
  }

  return (
    <Box data-testid="members-page">
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} sx={{ mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ flexGrow: 1 }}>
          <TextField
            label="Search by name, phone, or email"
            value={filters.search}
            onChange={(event) => setFilters({ ...filters, search: event.target.value })}
            fullWidth
            inputProps={{ 'data-testid': 'members-search-input' }}
          />
          <FormControl sx={{ minWidth: 160 }}>
            <InputLabel id="status-filter-label">Status</InputLabel>
            <Select
              labelId="status-filter-label"
              value={filters.status}
              label="Status"
              onChange={(event) => setFilters({ ...filters, status: event.target.value })}
              inputProps={{ 'data-testid': 'members-status-filter' }}
            >
              <MenuItem value="" data-testid="members-status-all-option">All</MenuItem>
              <MenuItem value="Active" data-testid="members-status-active-option">Active</MenuItem>
              <MenuItem value="Expired" data-testid="members-status-expired-option">Expired</MenuItem>
              <MenuItem value="Cancelled" data-testid="members-status-cancelled-option">Cancelled</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel id="payment-filter-label">Payment</InputLabel>
            <Select
              labelId="payment-filter-label"
              value={filters.payment}
              label="Payment"
              onChange={(event) => setFilters({ ...filters, payment: event.target.value })}
              inputProps={{ 'data-testid': 'members-payment-filter' }}
            >
              <MenuItem value="" data-testid="members-payment-all-option">All</MenuItem>
              <MenuItem value="Fully Paid" data-testid="members-payment-fully-paid-option">Fully Paid</MenuItem>
              <MenuItem value="Partially Paid" data-testid="members-payment-partially-paid-option">Partially Paid</MenuItem>
              <MenuItem value="Pending" data-testid="members-payment-pending-option">Pending</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            onClick={() => setSortDir(sortDir === 1 ? -1 : 1)}
            data-testid="members-sort-button"
          >
            Sort by Expiry {sortDir === 1 ? '▲' : '▼'}
          </Button>
        </Stack>
        <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={() => openMemberDialog()} data-testid="add-member-button">
          Add Member
        </Button>
      </Stack>

      {alert.message && (
        <Alert severity={alert.type} sx={{ mb: 3 }} data-testid="members-alert">
          {alert.message}
        </Alert>
      )}

      <Paper elevation={0} sx={{ p: 3, borderRadius: 3 }}>
        {loading ? (
          <Typography color="text.secondary" data-testid="members-loading">Loading members...</Typography>
        ) : (
          <Grid container spacing={2}>
            {members.map((member) => (
              <Grid item xs={12} key={member.id}>
                <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }} data-testid={`member-card-${member.id}`}>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
                    <Box>
                      <Typography variant="h6" data-testid={`member-name-${member.id}`}>{member.full_name}</Typography>
                      <Typography variant="body2" color="text.secondary" data-testid={`member-contact-${member.id}`}>
                        {member.phone_number} {member.email ? `• ${member.email}` : ''}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <Chip label={member.status} color={member.status === 'Active' ? 'success' : 'warning'} size="small" />
                        <Chip label={member.payment?.status || 'Pending'} color="info" size="small" />
                        <Chip label={`Ends ${new Date(member.end_date).toLocaleDateString()}`} size="small" variant="outlined" />
                      </Stack>
                    </Box>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                      <Button variant="outlined" size="small" startIcon={<EditOutlinedIcon />} onClick={() => openMemberDialog(member)} data-testid={`edit-member-${member.id}`}>
                        Edit
                      </Button>
                      <Button variant="outlined" size="small" startIcon={<PaymentsOutlinedIcon />} onClick={() => openPaymentDialog(member)} data-testid={`payment-member-${member.id}`}>
                        Update Payment
                      </Button>
                      <Button variant="outlined" size="small" startIcon={<SendOutlinedIcon />} onClick={() => handleSendReminder(member.id)} data-testid={`reminder-member-${member.id}`}>
                        Send Reminder
                      </Button>
                      <Button variant="text" size="small" color="error" startIcon={<DeleteOutlineOutlinedIcon />} onClick={() => handleDeleteMember(member.id)} data-testid={`delete-member-${member.id}`}>
                        Delete
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
        {members.length === 0 && !loading && (
          <Typography color="text.secondary" sx={{ mt: 2 }} data-testid="members-empty">
            No members found. Add your first member to get started.
          </Typography>
        )}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination count={totalPages} page={page} onChange={(_, value) => setPage(value)} data-testid="members-pagination" />
          </Box>
        )}
      </Paper>

      <Dialog open={memberDialogOpen} onClose={closeMemberDialog} maxWidth="md" fullWidth>
        <DialogTitle data-testid="member-dialog-title">{selectedMember ? 'Edit Member' : 'Add Member'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField label="Full Name" name="full_name" value={form.full_name} onChange={handleMemberChange} fullWidth required inputProps={{ 'data-testid': 'member-name-input' }} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="Phone Number" name="phone_number" value={form.phone_number} onChange={handleMemberChange} fullWidth required inputProps={{ 'data-testid': 'member-phone-input' }} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="Email" name="email" value={form.email} onChange={handleMemberChange} fullWidth inputProps={{ 'data-testid': 'member-email-input' }} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="Address" name="address" value={form.address} onChange={handleMemberChange} fullWidth inputProps={{ 'data-testid': 'member-address-input' }} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField label="Date of Birth" type="date" name="date_of_birth" value={form.date_of_birth} onChange={handleMemberChange} fullWidth InputLabelProps={{ shrink: true }} inputProps={{ 'data-testid': 'member-dob-input' }} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField label="Gender" name="gender" value={form.gender} onChange={handleMemberChange} fullWidth inputProps={{ 'data-testid': 'member-gender-input' }} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField label="Emergency Contact" name="emergency_contact" value={form.emergency_contact} onChange={handleMemberChange} fullWidth inputProps={{ 'data-testid': 'member-emergency-input' }} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField label="Joining Date" type="date" name="joining_date" value={form.joining_date} onChange={handleMemberChange} fullWidth InputLabelProps={{ shrink: true }} inputProps={{ 'data-testid': 'member-joining-input' }} />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel id="package-select-label">Package</InputLabel>
                  <Select
                    labelId="package-select-label"
                    name="package_id"
                    value={form.package_id}
                    label="Package"
                    onChange={handleMemberChange}
                    inputProps={{ 'data-testid': 'member-package-select' }}
                  >
                    {packages.map((pkg) => (
                      <MenuItem key={pkg.id} value={pkg.id}>{pkg.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField label="Paid Amount" type="number" name="paid_amount" value={form.paid_amount} onChange={handleMemberChange} fullWidth inputProps={{ 'data-testid': 'member-paid-amount-input' }} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="Payment Method" name="payment_method" value={form.payment_method} onChange={handleMemberChange} fullWidth inputProps={{ 'data-testid': 'member-payment-method-input' }} />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={closeMemberDialog} data-testid="member-cancel-button">Cancel</Button>
          <Button variant="contained" onClick={handleSaveMember} data-testid="member-save-button">Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle data-testid="payment-dialog-title">Add Payment</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField label="Amount" name="amount" type="number" value={paymentForm.amount} onChange={handlePaymentChange} fullWidth sx={{ mb: 2 }} inputProps={{ 'data-testid': 'payment-amount-input' }} />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="payment-method-label">Method</InputLabel>
              <Select
                labelId="payment-method-label"
                name="method"
                value={paymentForm.method}
                label="Method"
                onChange={handlePaymentChange}
                inputProps={{ 'data-testid': 'payment-method-select' }}
              >
                <MenuItem value="Cash">Cash</MenuItem>
                <MenuItem value="Online">Online</MenuItem>
                <MenuItem value="UPI">UPI</MenuItem>
                <MenuItem value="Card">Card</MenuItem>
                <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Transaction ID" name="transaction_id" value={paymentForm.transaction_id} onChange={handlePaymentChange} fullWidth sx={{ mb: 2 }} inputProps={{ 'data-testid': 'payment-transaction-input' }} />
            <TextField label="Payment Date" name="payment_date" type="date" value={paymentForm.payment_date} onChange={handlePaymentChange} fullWidth InputLabelProps={{ shrink: true }} inputProps={{ 'data-testid': 'payment-date-input' }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setPaymentDialogOpen(false)} data-testid="payment-cancel-button">Cancel</Button>
          <Button variant="contained" onClick={handleAddPayment} data-testid="payment-save-button">Save Payment</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Members
