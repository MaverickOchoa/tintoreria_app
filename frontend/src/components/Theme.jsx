import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    // 🚨 COLOR PRINCIPAL: Azul Marino/Oscuro (#121B2B)
    primary: {
      main: "#121B2B",
    },
    // 🚨 COLOR SECUNDARIO: Azul Pizarra/Gris (#576A7F)
    secondary: {
      main: "#576A7F",
    },
    // Color de éxito (para el botón "Crear Orden")
    success: {
      main: "#37474F", // Usamos un Gris Pizarra Oscuro para mantener la sofisticación
      contrastText: "#ffffff",
    },
    // Color de Fondo Base
    background: {
      default: "#ECECEC", // Gris muy claro y uniforme para el fondo
      paper: "#ffffff", // Fondo blanco limpio para tarjetas y contenedores
    },
  },
  typography: {
    // 🚨 TIPOGRAFÍA PRINCIPAL: Crimson Pro (Serif elegante) y Roboto/Arial (San-Serif de respaldo)
    fontFamily: [
      "Crimson Pro",
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
    ].join(","),
    h4: {
      fontWeight: 600, // Títulos más audaces
      // Usaremos el Gris Pizarra para títulos para un look suave
      color: "#37474F",
    },
    subtitle1: {
      // Usado para el nombre del cliente
      fontWeight: 500,
      // Usaremos el Azul Marino Oscuro para el nombre del cliente
      color: "#121B2B",
    },
    body1: {
      fontSize: "0.95rem",
      color: "#37474F",
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 8,
          boxShadow: "none",
          fontWeight: 500,
        },
        containedPrimary: {
          // Sombra sutil con el Azul Marino Oscuro
          boxShadow: "0 4px 6px rgba(18, 27, 43, 0.3)",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

export default theme;
