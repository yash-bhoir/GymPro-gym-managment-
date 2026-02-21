import React from 'react'
import { AppBar, Toolbar, Typography, IconButton, Box, Avatar, Menu, MenuItem } from '@mui/material'
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'

const Topbar = ({ title, onMenuClick, mode, onToggleMode, admin, onLogout }) => {
  const [anchorEl, setAnchorEl] = React.useState(null)

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = () => {
    handleMenuClose()
    onLogout()
  }

  return (
    <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'transparent', backdropFilter: 'blur(12px)' }}>
      <Toolbar sx={{ gap: 2 }}>
        <IconButton onClick={onMenuClick} sx={{ display: { md: 'none' } }} data-testid="mobile-menu-button">
          <MenuOutlinedIcon />
        </IconButton>
        <Typography variant="h5" sx={{ flexGrow: 1 }} data-testid="page-title">
          {title}
        </Typography>
        <IconButton onClick={onToggleMode} data-testid="theme-toggle-button">
          {mode === 'dark' ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
        </IconButton>
        <IconButton onClick={handleMenuOpen} data-testid="profile-menu-button">
          <Avatar sx={{ bgcolor: 'secondary.main' }}>
            {admin?.full_name ? admin.full_name.charAt(0).toUpperCase() : 'A'}
          </Avatar>
        </IconButton>
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          <MenuItem onClick={handleLogout} data-testid="logout-menu-item">
            <LogoutOutlinedIcon fontSize="small" style={{ marginRight: 8 }} />
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  )
}

export default Topbar
