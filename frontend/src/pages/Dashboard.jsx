import React, { useEffect, useState } from 'react'
import { Box, Grid, Paper, Typography, CircularProgress, List, ListItem, ListItemText } from '@mui/material'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import api from '../api'
import StatCard from '../components/StatCard'

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const Dashboard = () => {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await api.get('/dashboard/summary')
        setSummary(response.data)
      } catch (error) {
        setSummary(null)
      } finally {
        setLoading(false)
      }
    }
    fetchSummary()
  }, [])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress data-testid="dashboard-loading" />
      </Box>
    )
  }

  const revenueData = (summary?.monthly_revenue || []).map((item) => ({
    month: monthLabels[item.month - 1],
    value: item.value
  }))

  const pieData = [
    { name: 'Active', value: summary?.active_members || 0 },
    { name: 'Expired', value: summary?.expired_members || 0 }
  ]

  return (
    <Box data-testid="dashboard-page">
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <StatCard title="Total Members" value={summary?.total_members || 0} subtitle="All time" testId="stat-total-members" />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard title="Active Members" value={summary?.active_members || 0} subtitle="Currently active" testId="stat-active-members" />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard title="Pending Payments" value={summary?.pending_payments || 0} subtitle="Needs follow-up" testId="stat-pending-payments" />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard title="Total Revenue" value={`₹${summary?.total_revenue?.toFixed(2) || '0.00'}`} subtitle="Collected" testId="stat-total-revenue" />
        </Grid>
        <Grid item xs={12} lg={8}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3 }} data-testid="revenue-chart-card">
            <Typography variant="h6" sx={{ mb: 2 }}>Monthly Revenue</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={revenueData}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#2b5bff" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, height: '100%' }} data-testid="status-pie-card">
            <Typography variant="h6" sx={{ mb: 2 }}>Membership Status</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90}>
                  {pieData.map((entry, index) => (
                    <Cell key={entry.name} fill={index === 0 ? '#2b5bff' : '#ff7a45'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3 }} data-testid="upcoming-expirations-card">
            <Typography variant="h6" sx={{ mb: 2 }}>Upcoming Expirations (Next 7 Days)</Typography>
            <List>
              {(summary?.upcoming_expirations || []).length === 0 && (
                <Typography variant="body2" color="text.secondary" data-testid="no-upcoming-expirations">
                  No upcoming expirations.
                </Typography>
              )}
              {(summary?.upcoming_expirations || []).map((member) => (
                <ListItem key={member.id} divider>
                  <ListItemText
                    primary={`${member.full_name} • ${member.phone_number}`}
                    secondary={`Expires on ${new Date(member.end_date).toLocaleDateString()}`}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default Dashboard
