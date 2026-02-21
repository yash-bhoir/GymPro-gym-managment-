import React from 'react'
import { Card, CardContent, Typography, Box } from '@mui/material'

const StatCard = ({ title, value, subtitle, testId }) => (
  <Card elevation={0} sx={{ borderRadius: 3, bgcolor: 'background.paper', height: '100%' }} data-testid={testId}>
    <CardContent>
      <Typography variant="overline" color="text.secondary">{title}</Typography>
      <Typography variant="h4" sx={{ mt: 1 }}>{value}</Typography>
      {subtitle && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
        </Box>
      )}
    </CardContent>
  </Card>
)

export default StatCard
