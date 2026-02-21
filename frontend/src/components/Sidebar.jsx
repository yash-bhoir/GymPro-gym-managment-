import React from 'react'
import { Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Box, Typography, Chip } from '@mui/material'
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import { NavLink } from 'react-router-dom'

const drawerWidth = 260

const adminNav = [
  { label: 'Dashboard', icon: <DashboardOutlinedIcon />, path: '/dashboard', testId: 'nav-dashboard-link' },
  { label: 'Members', icon: <PeopleAltOutlinedIcon />, path: '/members', testId: 'nav-members-link' },
  { label: 'Packages', icon: <Inventory2OutlinedIcon />, path: '/packages', testId: 'nav-packages-link' },
  { label: 'Payments', icon: <PaymentsOutlinedIcon />, path: '/payments', testId: 'nav-payments-link' },
  { label: 'Settings', icon: <SettingsOutlinedIcon />, path: '/settings', testId: 'nav-settings-link' }
]

const superNav = [
  { label: 'Super Dashboard', icon: <DashboardOutlinedIcon />, path: '/super-dashboard', testId: 'nav-super-dashboard-link' },
  { label: 'All Admins', icon: <AdminPanelSettingsOutlinedIcon />, path: '/super-admins', testId: 'nav-super-admins-link' },
  { label: 'All Members', icon: <GroupsOutlinedIcon />, path: '/super-members', testId: 'nav-super-members-link' }
]

const Sidebar = ({ mobileOpen, onClose, admin }) => {
  const isSuperAdmin = admin?.role === 'super_admin'
  const navItems = isSuperAdmin ? superNav : adminNav

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', px: 2 }}>
      <Toolbar sx={{ px: 0 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }} data-testid="sidebar-brand-title">GymPulse</Typography>
          <Typography variant="body2" color="text.secondary" data-testid="sidebar-brand-subtitle">Membership Suite</Typography>
          {isSuperAdmin && (
            <Chip label="Super Admin" color="secondary" size="small" sx={{ mt: 1 }} data-testid="sidebar-super-admin-chip" />
          )}
        </Box>
      </Toolbar>
      <List sx={{ mt: 2 }}>
        {navItems.map((item) => (
          <ListItemButton
            key={item.path}
            component={NavLink}
            to={item.path}
            data-testid={item.testId}
            sx={{
              mb: 1,
              borderRadius: 2,
              '&.active': {
                background: 'linear-gradient(90deg, rgba(43,91,255,0.15), rgba(255,122,69,0.15))'
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
      <Box sx={{ mt: 'auto', mb: 3, p: 2, borderRadius: 3, bgcolor: 'background.paper' }}>
        <Typography variant="subtitle2" data-testid="sidebar-tip-title">Quick Tip</Typography>
        <Typography variant="caption" color="text.secondary" data-testid="sidebar-tip-text">
          Set reminder rules in Settings to automate renewals.
        </Typography>
      </Box>
    </Box>
  )

  return (
    <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: drawerWidth }
        }}
      >
        {drawerContent}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { width: drawerWidth, borderRight: 'none' }
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  )
}

export default Sidebar
