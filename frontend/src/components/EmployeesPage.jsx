import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container, Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button, Chip, CircularProgress,
  Alert, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  TextField,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import LockResetIcon from "@mui/icons-material/LockReset";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

const getClaims = () => {
  const raw = localStorage.getItem("user_claims");
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
};

const EmployeesPage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");
  const claims = getClaims();
  const businessId = claims.business_id;

  const [employees, setEmployees] = useState([]);
  const [branchMap, setBranchMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [changePwd, setChangePwd] = useState(null);
  const [newPassword, setNewPassword] = useState("");

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/employees?include_inactive=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setEmployees(data.employees || []);
      else setError(data.message || "Error al cargar empleados.");
    } catch {
      setError("Error de conexión.");
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const branchRes = await fetch(`${API_BASE_URL}/businesses/${businessId}/branches`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const branchData = await branchRes.json();
        if (branchRes.ok) {
          const map = {};
          (branchData.branches || []).forEach((b) => { map[b.id] = b.name; });
          setBranchMap(map);
        }
      } catch { }
      await fetchEmployees();
      setLoading(false);
    };
    load();
  }, [token, businessId]);

  const handleToggleActive = async (employeeId, currentStatus) => {
    try {
      const res = await fetch(`${API_BASE_URL}/employees/${employeeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_active: !currentStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Error al actualizar estado");
      }
      await fetchEmployees();
    } catch (err) {
      setError(err.message || "Error al cambiar estado");
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword.trim()) { setError("La contraseña no puede estar vacía."); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/employees/${changePwd.id}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: newPassword }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Error al cambiar contraseña");
      }
      setChangePwd(null);
      setNewPassword("");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      const res = await fetch(`${API_BASE_URL}/employees/${confirmDelete.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Error al eliminar");
      }
      setConfirmDelete(null);
      await fetchEmployees();
    } catch (err) {
      setError(err.message || "Error al eliminar empleado");
      setConfirmDelete(null);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold" color="primary">
          Empleados
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/create-employee")}>
          Nuevo Empleado
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {loading ? (
        <Box textAlign="center" py={4}><CircularProgress /></Box>
      ) : (
<TableContainer sx={{ overflowX: "auto" }}>
          <Table>
            <TableHead sx={{ bgcolor: "#f5f5f5" }}>
              <TableRow>
                <TableCell><strong>Nombre</strong></TableCell>
                <TableCell><strong>Usuario</strong></TableCell>
                <TableCell><strong>Sucursal</strong></TableCell>
                <TableCell><strong>Roles</strong></TableCell>
                <TableCell><strong>Estado</strong></TableCell>
                <TableCell><strong>Acciones</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employees.length > 0 ? (
                employees.map((emp) => (
                  <TableRow key={emp.id} hover sx={{ opacity: emp.is_active ? 1 : 0.5 }}>
                    <TableCell>{emp.full_name}</TableCell>
                    <TableCell>{emp.username}</TableCell>
                    <TableCell>{branchMap[emp.branch_id] || emp.branch_id}</TableCell>
                    <TableCell>
                      {emp.roles.map((role, idx) => (
                        <Chip key={idx} label={role} size="small" sx={{ mr: 0.5 }} />
                      ))}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={emp.is_active ? "Activo" : "Inactivo"}
                        color={emp.is_active ? "success" : "default"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleToggleActive(emp.id, emp.is_active)}
                        >
                          {emp.is_active ? "Desactivar" : "Activar"}
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<LockResetIcon />}
                          onClick={() => { setChangePwd(emp); setNewPassword(""); }}
                        >
                          Contraseña
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => setConfirmDelete(emp)}
                        >
                          Eliminar
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                    No hay empleados registrados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={!!changePwd} onClose={() => { setChangePwd(null); setNewPassword(""); }}>
        <DialogTitle>Cambiar contraseña</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Nueva contraseña para <strong>{changePwd?.full_name}</strong> ({changePwd?.username})
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            type="password"
            label="Nueva contraseña"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setChangePwd(null); setNewPassword(""); }}>Cancelar</Button>
          <Button onClick={handleChangePassword} variant="contained">Guardar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>¿Eliminar empleado?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro que deseas eliminar a <strong>{confirmDelete?.full_name}</strong> ({confirmDelete?.username})?
            Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>Cancelar</Button>
          <Button onClick={handleDelete} color="error" variant="contained">Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EmployeesPage;
