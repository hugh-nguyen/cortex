'use client';

import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const theme = createTheme({
  palette: {
    primary: {
      main: '#6A1B9A', // Purple
    },
    secondary: {
      main: '#D1C4E9', // Light purple
    },
  },
  typography: {
    fontFamily: '"Geist", "Arial", sans-serif',
    fontSize: 12.8,
    body1: {
      fontSize: '0.95rem',
    },
    body2: {
      fontSize: '0.95rem',
    },
    button: {
      fontSize: '0.95rem',
    },
    caption: {
      fontSize: '0.7rem', // Slightly smaller for captions
    },
    h6: {
      fontSize: '1.1rem', // Adjust headings as needed
      fontWeight: 800,
      margin: '-6px'
    },
  },
});

export default function MuiClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}