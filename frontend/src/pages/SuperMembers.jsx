import React, { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import { useLocation } from 'react-router-dom'
import api from '../api'

const SuperMembers = () => {
  const { search } = useLocation()
  const adminParam = new URLSearchParams(search).get('admin') || ''
  const [members, setMembers] = useState([])
  const [admins, setAdmins] = useState([])
  const [filters, setFilters] = useState({ search: '', status: '', payment: '', admin: adminParam })
  const [sortDir, setSortDir] = useState(1)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [total, setTotal] = useState(0)

  const fetchAdmins = async () => {
    try {
      const response = await api.get('/super/admins', { params: { page_size: 100, page: 1 } })
      setAdmins(response.data.admins || [])
    } catch (error) {
      setAdmins([])
    }
  }

  const fetchMembers = async () => {
    try {
      const response = await api.get('/super/members', {
        params: {
          search: filters.search || undefined,
          status_filter: filters.status || undefined,
          payment_status: filters.payment || undefined,
          admin_id: filters.admin || undefined,
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
    }
  }

  useEffect(() => {
    fetchAdmins()
  }, [])

  useEffect(() => {
    fetchMembers()
  }, [filters, sortDir, page])

  const totalPages = useMemo(() => Math.ceil(total / pageSize), [total, pageSize])

  return (
    <Box data-testid="super-members-page">
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} sx={{ mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ flexGrow: 1 }}>
          <TextField
            label="Search member"
            value={filters.search}
            onChange={(event) => setFilters({ ...filters, search: event.target.value })}
            fullWidth
            inputProps={{ 'data-testid': 'super-members-search-input' }}
          />
          <FormControl sx={{ minWidth: 160 }}>
            <InputLabel id="super-status-filter-label">Status</InputLabel>
            <Select
              labelId="super-status-filter-label"
              value={filters.status}
              label="Status"
              onChange={(event) => setFilters({ ...filters, status: event.target.value })}
              inputProps={{ 'data-testid': 'super-members-status-filter' }}
            >
              <MenuItem value="" data-testid="super-members-status-all">All</MenuItem>
              <MenuItem value="Active" data-testid="super-members-status-active">Active</MenuItem>
              <MenuItem value="Expired" data-testid="super-members-status-expired">Expired</MenuItem>
              <MenuItem value="Cancelled" data-testid="super-members-status-cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel id="super-payment-filter-label">Payment</InputLabel>
            <Select
              labelId="super-payment-filter-label"
              value={filters.payment}
              label="Payment"
              onChange={(event) => setFilters({ ...filters, payment: event.target.value })}
              inputProps={{ 'data-testid': 'super-members-payment-filter' }}
            >
              <MenuItem value="" data-testid="super-members-payment-all">All</MenuItem>
              <MenuItem value="Fully Paid" data-testid="super-members-payment-fully">Fully Paid</MenuItem>
              <MenuItem value="Partially Paid" data-testid="super-members-payment-partial">Partially Paid</MenuItem>
              <MenuItem value="Pending" data-testid="super-members-payment-pending">Pending</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="super-admin-filter-label">Admin</InputLabel>
            <Select
              labelId="super-admin-filter-label"
              value={filters.admin}
              label="Admin"
              onChange={(event) => setFilters({ ...filters, admin: event.target.value })}
              inputProps={{ 'data-testid': 'super-members-admin-filter' }}
            >
              <MenuItem value="" data-testid="super-members-admin-all">All Admins</MenuItem>
              {admins.map((admin) => (
                <MenuItem key={admin.id} value={admin.id} data-testid={`super-members-admin-option-${admin.id}`}>
                  {admin.full_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={() => setSortDir(sortDir === 1 ? -1 : 1)} data-testid="super-members-sort-button">
            Sort by Expiry {sortDir === 1 ? '▲' : '▼'}
          </Button>
        </Stack>
      </Stack>

      <Paper elevation={0} sx={{ p: 3, borderRadius: 3 }}>
        <Grid container spacing={2}>
          {members.map((member) => (
            <Grid item xs={12} key={member.id}>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }} data-testid={`super-member-card-${member.id}`}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
                  <Box>
                    <Typography variant="h6" data-testid={`super-member-name-${member.id}`}>{member.full_name}</Typography>
                    <Typography variant="body2" color="text.secondary" data-testid={`super-member-contact-${member.id}`}>
                      {member.phone_number} {member.email ? `• ${member.email}` : ''}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" data-testid={`super-member-admin-${member.id}`}>
                      Admin: {member.admin?.full_name || 'Unknown'} ({member.admin?.email || 'N/A'})
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                      <Chip label={member.status} color={member.status === 'Active' ? 'success' : 'warning'} size="small" />
                      <Chip label={member.payment?.status || 'Pending'} color="info" size="small" />
                      <Chip label={`Ends ${new Date(member.end_date).toLocaleDateString()}`} size="small" variant="outlined" />
                    </Stack>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
        {members.length === 0 && (
          <Typography color="text.secondary" sx={{ mt: 2 }} data-testid="super-members-empty">
            No members found for the selected filters.
          </Typography>
        )}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination count={totalPages} page={page} onChange={(_, value) => setPage(value)} data-testid="super-members-pagination" />
          </Box>
        )}
      </Paper>
    </Box>
  )
}

export default SuperMembers
