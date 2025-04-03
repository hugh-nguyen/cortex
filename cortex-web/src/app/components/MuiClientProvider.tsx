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
      fontSize: '0.8rem',
    },
    body2: {
      fontSize: '0.8rem',
    },
    button: {
      fontSize: '0.8rem',
    },
    caption: {
      fontSize: '0.7rem', // Slightly smaller for captions
    },
    h6: {
      fontSize: '1rem', // Adjust headings as needed
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