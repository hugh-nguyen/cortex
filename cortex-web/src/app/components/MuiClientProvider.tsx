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