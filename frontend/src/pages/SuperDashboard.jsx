import React, { useEffect, useState } from 'react'
import { Box, Grid, Paper, Typography, CircularProgress } from '@mui/material'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../api'
import StatCard from '../components/StatCard'

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const SuperDashboard = () => {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await api.get('/super/summary')
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
        <CircularProgress data-testid="super-dashboard-loading" />
      </Box>
    )
  }

  const revenueData = (summary?.monthly_revenue || []).map((item) => ({
    month: monthLabels[item.month - 1],
    value: item.value
  }))

  return (
    <Box data-testid="super-dashboard-page">
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard title="Total Admins" value={summary?.total_admins || 0} subtitle="All gyms" testId="super-stat-total-admins" />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard title="Total Members" value={summary?.total_members || 0} subtitle="Across all gyms" testId="super-stat-total-members" />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard title="Pending Payments" value={summary?.pending_payments || 0} subtitle="Needs follow-up" testId="super-stat-pending-payments" />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard title="Total Revenue" value={`₹${summary?.total_revenue?.toFixed(2) || '0.00'}`} subtitle="Collected" testId="super-stat-total-revenue" />
        </Grid>
        <Grid item xs={12}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3 }} data-testid="super-revenue-chart-card">
            <Typography variant="h6" sx={{ mb: 2 }}>
              Monthly Revenue Across All Gyms
            </Typography>
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
      </Grid>
    </Box>
  )
}

export default SuperDashboard
