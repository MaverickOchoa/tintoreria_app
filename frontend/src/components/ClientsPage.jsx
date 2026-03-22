import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container, Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, CircularProgress,
  Alert, TextField, InputAdornment, Button, Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";

const API = import.meta.env.VITE_API_URL || API;
const getClaims = () => { try { return JSON.parse(localStorage.getItem("user_claims") || "{}"); } catch { return {}; } };

export default function ClientsPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");
  const claims = getClaims();

  const [searchTerm, setSearchTerm] = useState("");
  const [clients, setClients] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = useCallback(async () => {
    const term = searchTerm.trim();
    if (!term) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ search: term });
      const res = await fetch(`${API}/api/v1/clients?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setClients(data.clients || data || []);
        setSearched(true);
      } else {
        setError(data.message || "Error al buscar.");
      }
    } catch {
      setError("Error de conexión.");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, token, claims.branch_id]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" fontWeight="bold" color="primary">Clientes</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/create-client")}>
          Nuevo Cliente
        </Button>
      </Box>

      {/* Search bar */}
      <Box display="flex" gap={1} mb={2}>
        <TextField
          fullWidth
          placeholder="Buscar cliente por nombre, teléfono o correo…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start"><SearchIcon /></InputAdornment>
            ),
          }}
        />
        <Button
          variant="contained"
          onClick={handleSearch}
          disabled={loading || !searchTerm.trim()}
          sx={{ minWidth: 100 }}
        >
          {loading ? <CircularProgress size={18} color="inherit" /> : "Buscar"}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!searched && !loading && (
        <Paper elevation={0} sx={{ p: 6, textAlign: "center", bgcolor: "#fafafa", borderRadius: 3 }}>
          <PersonSearchIcon sx={{ fontSize: 64, color: "text.disabled", mb: 1 }} />
          <Typography color="text.secondary">
            Ingresa un nombre, teléfono o correo para buscar clientes
          </Typography>
        </Paper>
      )}

      {searched && !loading && (
        <>
          {clients.length === 0 ? (
            <Alert severity="info">No se encontraron clientes con "{searchTerm}".</Alert>
          ) : (
<TableContainer sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: "#f5f5f5" }}>
                  <TableRow>
                    <TableCell><strong>Nombre</strong></TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}><strong>Teléfono</strong></TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}><strong>Email</strong></TableCell>
                    <TableCell><strong>Tipo</strong></TableCell>
                    <TableCell align="center"><strong>Acciones</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {clients.map(client => (
                    <TableRow key={client.id} hover>
                      <TableCell>
                        {client.full_name}{client.last_name ? ` ${client.last_name}` : ""}
                      </TableCell>
                      <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{client.phone || "—"}</TableCell>
                      <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{client.email || "—"}</TableCell>
                      <TableCell>{client.client_type || "Regular"}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="Ver perfil">
                          <IconButton size="small" color="primary" onClick={() => navigate(`/clients/${client.id}`)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Nueva orden">
                          <IconButton size="small" color="success" onClick={() => navigate(`/create-order/${client.id}`)}>
                            <ShoppingCartIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}
    </Container>
  );
}
