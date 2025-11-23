import { createTheme } from '@mui/material/styles';

const primaryGreen = '#3B8F65';
const deepInk = '#2F403C';
const sand = '#F7F1E6';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: primaryGreen,
    },
    secondary: {
      main: deepInk,
    },
    background: {
      default: sand,
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1F2D2A',
      secondary: '#496157',
    },
  },
  shape: {
    borderRadius: 14,
  },
  typography: {
    fontFamily: 'Inter, "Segoe UI", system-ui, -apple-system, sans-serif',
    h5: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 12,
          paddingLeft: 16,
          paddingRight: 16,
          fontWeight: 600,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'linear-gradient(145deg, rgba(59,143,101,0.06), rgba(255,255,255,0.92))',
          border: '1px solid #DBE4D6',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'linear-gradient(145deg, rgba(59,143,101,0.08), rgba(255,255,255,0.95))',
          border: '1px solid #DBE4D6',
        },
      },
    },
    MuiListSubheader: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          letterSpacing: '-0.01em',
          color: '#496157',
        },
      },
    },
  },
});
