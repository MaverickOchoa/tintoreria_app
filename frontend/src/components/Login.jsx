// src/components/Login.jsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";

// MUI
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Paper,
  InputAdornment,
} from "@mui/material";

// Icons
import LoginIcon from "@mui/icons-material/Login";
import PersonIcon from "@mui/icons-material/Person";
import LockIcon from "@mui/icons-material/Lock";

const API_BASE_URL = import.meta.env.VITE_API_URL || API;

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const clearAuthStorage = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("role");
    localStorage.removeItem("business_id");
    localStorage.removeItem("branch_id");
    localStorage.removeItem("user_claims");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Credenciales inválidas.");
      }

      // 1) token
      if (!data.access_token) {
        throw new Error("Login OK, pero no llegó access_token.");
      }

      // Limpia estado previo para evitar inconsistencias
      clearAuthStorage();

      localStorage.setItem("access_token", data.access_token);

      // 2) business_id y branch_id sueltos (compatibilidad con pantallas)
      if (data.business_id !== undefined && data.business_id !== null) {
        localStorage.setItem("business_id", String(data.business_id));
      }

      if (data.branch_id !== undefined && data.branch_id !== null) {
        localStorage.setItem("branch_id", String(data.branch_id));
      }

      // 3) claims consolidados
      const claimsPayload = {
        role: data.role || null,
        business_id: data.business_id ?? null,
        branch_id: data.branch_id ?? null,
        branches: data.branches || [],
        is_superadmin: data.is_superadmin ?? null,
        user_id: data.user_id ?? null,
        username: data.username ?? username,
      };

      localStorage.setItem("user_claims", JSON.stringify(claimsPayload));
      localStorage.setItem("role", data.role || "");

      // 4) redirect por rol
      switch (data.role) {
        case "super_admin":
          navigate("/super-admin-dashboard");
          break;

        case "agency_admin":
          navigate("/agency-admin-dashboard");
          break;

        case "business_admin":
          navigate("/select-branch");
          break;

        case "branch_manager":
          navigate("/business-admin-dashboard");
          break;

        case "employee":
          navigate("/panel-operativo");
          break;

        default:
          throw new Error(`Rol de usuario no reconocido: ${data.role}`);
      }
    } catch (err) {
      setError(err.message || "Error inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "background.default",
        p: 2,
      }}
    >
      <Paper
        elevation={6}
        sx={{
          p: { xs: 3, md: 5 },
          borderRadius: 2,
          width: "100%",
          maxWidth: 400,
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          align="center"
          sx={{ mb: 4, color: "primary.main", fontWeight: 700 }}
        >
          Iniciar Sesión
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <TextField
              fullWidth
              label="Nombre de Usuario"
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              variant="outlined"
              disabled={isSubmitting}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              label="Contraseña"
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              variant="outlined"
              disabled={isSubmitting}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isSubmitting || !username.trim() || !password.trim()}
              startIcon={
                isSubmitting ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <LoginIcon />
                )
              }
              sx={{ width: "100%", mt: 2, py: 1.5 }}
            >
              {isSubmitting ? "Autenticando..." : "Entrar"}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default Login;
