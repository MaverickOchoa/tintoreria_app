import React, { createContext, useState, useEffect } from "react";
import { createTheme, ThemeProvider as MuiThemeProvider } from "@mui/material/styles";

export const createCustomTheme = (primaryColor = "#121B2B", bgColor = "#ECECEC") => {
  return createTheme({
    palette: {
      primary: { main: primaryColor },
      secondary: { main: "#576A7F" },
      success: { main: "#37474F", contrastText: "#ffffff" },
      background: { default: bgColor, paper: "#ffffff" },
    },
    typography: {
      fontFamily: ["Crimson Pro", "Roboto", '"Helvetica Neue"', "Arial", "sans-serif"].join(","),
      h4: { fontWeight: 600, color: "#37474F" },
      subtitle1: { fontWeight: 500, color: "#121B2B" },
      body1: { fontSize: "0.95rem", color: "#37474F" },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { textTransform: "none", borderRadius: 8, boxShadow: "none", fontWeight: 500 },
          containedPrimary: { boxShadow: "0 4px 6px rgba(18, 27, 43, 0.3)" },
        },
      },
      MuiPaper: { styleOverrides: { root: { borderRadius: 12 } } },
      MuiTextField: { styleOverrides: { root: { borderRadius: 8 } } },
    },
  });
};

export const CustomThemeContext = createContext();

export function CustomThemeProvider({ children }) {
  const [themeConfig, setThemeConfig] = useState({ primary: "#121B2B", bg: "#ECECEC" });

  const theme = createCustomTheme(themeConfig.primary, themeConfig.bg);

  return (
    <CustomThemeContext.Provider value={{ themeConfig, setThemeConfig }}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </CustomThemeContext.Provider>
  );
}

export default createCustomTheme();
