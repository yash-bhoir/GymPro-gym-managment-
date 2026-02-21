import React, { useEffect, useState } from 'react'
import {
  Box,
  Grid,
  Paper,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  Divider
} from '@mui/material'
import api from '../api'

const Payments = () => {
  const [members, setMembers] = useState([])
  const [selectedMember, setSelectedMember] = useState(null)
  const [paymentHistory, setPaymentHistory] = useState([])

  const fetchMembers = async () => {
    try {
      const response = await api.get('/members', { params: { page_size: 50, page: 1 } })
      setMembers(response.data.members || [])
      if (response.data.members?.length) {
        setSelectedMember(response.data.members[0])
      }
    } catch (error) {
      setMembers([])
    }
  }

  const fetchPayments = async (memberId) => {
    try {
      const response = await api.get(`/members/${memberId}/payments`)
      setPaymentHistory(response.data.payment_history || [])
    } catch (error) {
      setPaymentHistory([])
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [])

  useEffect(() => {
    if (selectedMember) {
      fetchPayments(selectedMember.id)
    }
  }, [selectedMember])

  return (
    <Box data-testid="payments-page">
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, height: '100%' }} data-testid="payments-member-list">
            <Typography variant="h6" sx={{ mb: 2 }} data-testid="payments-members-title">Member Payments</Typography>
            <List>
              {members.map((member) => (
                <ListItemButton
                  key={member.id}
                  selected={selectedMember?.id === member.id}
                  onClick={() => setSelectedMember(member)}
                  data-testid={`payments-member-${member.id}`}
                >
                  <ListItemText
                    primary={member.full_name}
                    secondary={`Paid ₹${member.payment?.paid_amount || 0} / ₹${member.payment?.total_amount || 0}`}
                  />
                  <Chip label={member.payment?.status || 'Pending'} size="small" />
                </ListItemButton>
              ))}
              {members.length === 0 && (
                <Typography color="text.secondary" data-testid="payments-empty">No members available.</Typography>
              )}
            </List>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, height: '100%' }} data-testid="payments-history">
            <Typography variant="h6" sx={{ mb: 1 }} data-testid="payments-history-title">
              Payment History {selectedMember ? `for ${selectedMember.full_name}` : ''}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }} data-testid="payments-history-subtitle">
              Track all transactions and partial payments.
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {paymentHistory.length === 0 && (
              <Typography color="text.secondary" data-testid="payments-history-empty">
                No payment history available.
              </Typography>
            )}
            {paymentHistory.map((entry, index) => (
              <Box key={`${entry.transaction_id}-${index}`} sx={{ mb: 2, p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }} data-testid={`payment-history-${index}`}>
                <Typography variant="subtitle1">₹{entry.amount} • {entry.method}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Date: {new Date(entry.payment_date).toLocaleDateString()} {entry.transaction_id ? `• Txn ${entry.transaction_id}` : ''}
                </Typography>
                {entry.note && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Note: {entry.note}
                  </Typography>
                )}
              </Box>
            ))}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default Payments
