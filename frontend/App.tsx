import React from "react";
import { ThemeProvider, createTheme, CssBaseline, GlobalStyles } from "@mui/material";
import Overview from "./views/Overview";
import { ACCENT } from "./theme";

const theme = createTheme({
  palette: {
    primary: { main: ACCENT, contrastText: "#FFFFFF" },
    error: { main: "#9F1239" },
    background: { default: "#F5F5F5", paper: "#FFFFFF" },
    text: { primary: "#0A0A0A", secondary: "#525252" },
    divider: "#E0E0E0",
  },
  shape: { borderRadius: 2 },
  typography: {
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
  components: {
    MuiAppBar: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundColor: "#FFFFFF",
          color: "#0A0A0A",
          borderBottom: "4px solid #0A0A0A",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          textTransform: "none",
          fontWeight: 600,
          boxShadow: "none",
          "&:hover": { boxShadow: "none" },
          "&:active": { boxShadow: "none" },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 0,
          border: "3px solid #0A0A0A",
          boxShadow: "5px 5px 0px #0A0A0A",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 2, fontWeight: 600 },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          borderRadius: "0 !important",
          boxShadow: "none",
          "&:before": { display: "none" },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: { root: { borderRadius: 0 } },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { borderRadius: 2, fontSize: "12px" },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 0,
          border: "1px solid #0A0A0A",
          boxShadow: "3px 3px 0px #0A0A0A",
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles styles={{ "@keyframes pulse": { "0%": { opacity: 1, transform: "scale(1)" }, "50%": { opacity: 0.5, transform: "scale(1.3)" }, "100%": { opacity: 1, transform: "scale(1)" } } }} />
      <Overview />
    </ThemeProvider>
  );
}

export default App;
