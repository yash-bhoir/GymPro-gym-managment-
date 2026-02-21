import { createTheme } from '@mui/material/styles'

const getTheme = (mode) => createTheme({
  palette: {
    mode,
    primary: { main: '#2b5bff' },
    secondary: { main: '#ff7a45' },
    background: {
      default: mode === 'dark' ? '#0f1424' : '#f5f6fb',
      paper: mode === 'dark' ? '#151b2e' : '#ffffff'
    },
    text: {
      primary: mode === 'dark' ? '#f6f7fb' : '#1f2233',
      secondary: mode === 'dark' ? '#a5b0d6' : '#4a4f63'
    }
  },
  shape: {
    borderRadius: 16
  },
  typography: {
    fontFamily: 'Space Grotesk, sans-serif',
    h1: { fontFamily: 'Sora, sans-serif', fontWeight: 700 },
    h2: { fontFamily: 'Sora, sans-serif', fontWeight: 700 },
    h3: { fontFamily: 'Sora, sans-serif', fontWeight: 600 },
    h4: { fontFamily: 'Sora, sans-serif', fontWeight: 600 },
    h5: { fontFamily: 'Sora, sans-serif', fontWeight: 600 },
    h6: { fontFamily: 'Sora, sans-serif', fontWeight: 600 }
  }
})

export default getTheme
