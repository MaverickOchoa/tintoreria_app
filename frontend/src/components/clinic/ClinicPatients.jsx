import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import {
  Box, Typography, Button, TextField, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Avatar, IconButton, Tooltip, Skeleton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import { CLINIC_API } from "./clinicTheme";

function getInitials(name = "", last = "") {
  return ((name[0] || "") + (last[0] || "")).toUpperCase() || "?";
}

export default function ClinicPatients() {
  const { token, claims } = useOutletContext();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (s = "") => {
    setLoading(true);
    try {
      const url = `${CLINIC_API}/clinic/patients?limit=60${s ? `&search=${encodeURIComponent(s)}` : ""}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      setPatients(Array.isArray(d.patients) ? d.patients : []);
      setTotal(d.total || 0);
    } catch {
      setPatients([]);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setTimeout(() => load(search), 450);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <Box sx={{
        px: 3, py: 2, bgcolor: "#fff", borderBottom: "1px solid #e8eaed",
        display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap",
      }}>
        <Box>
          <Typography variant="h6" fontWeight={800}>Pacientes</Typography>
          <Typography variant="caption" color="text.secondary">{total} registrados</Typography>
        </Box>
        <TextField
          placeholder="Buscar por nombre o teléfono…"
          size="small"
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ ml: "auto", width: 280, bgcolor: "#f8f9fa", borderRadius: 2,
            "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          size="small"
          onClick={() => navigate("/create-client")}
          sx={{ bgcolor: "#4361ee", "&:hover": { bgcolor: "#3251d3" }, borderRadius: 2, fontWeight: 700 }}
        >
          Nuevo Paciente
        </Button>
      </Box>

      {/* Table */}
      <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: "1px solid #e8eaed" }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#f8f9fa" }}>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Paciente</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Teléfono</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Tipo sangre</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Alergias</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Contacto emergencia</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: 12 }} align="right"></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton variant="text" width={j === 0 ? 160 : 80} /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : patients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: "text.secondary" }}>
                    {search ? "Sin resultados para esa búsqueda" : "No hay pacientes registrados"}
                  </TableCell>
                </TableRow>
              ) : (
                patients.map(p => (
                  <TableRow
                    key={p.patient_id}
                    hover
                    sx={{ cursor: "pointer" }}
                    onClick={() => navigate(`/clinic/patients/${p.patient_id}`)}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: "#4361ee", fontSize: 12 }}>
                          {getInitials(p.full_name, p.last_name)}
                        </Avatar>
                        <Box>
                          <Typography fontSize={13} fontWeight={600}>{p.full_name} {p.last_name || ""}</Typography>
                          <Typography fontSize={11} color="text.secondary">{p.email || ""}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: 13 }}>{p.phone || "—"}</TableCell>
                    <TableCell>
                      {p.blood_type
                        ? <Chip label={p.blood_type} size="small" sx={{ bgcolor: "#fdecea", color: "#e63946", fontWeight: 700 }} />
                        : <Typography fontSize={12} color="text.disabled">—</Typography>}
                    </TableCell>
                    <TableCell>
                      {p.allergies
                        ? <Chip label={p.allergies.slice(0, 25) + (p.allergies.length > 25 ? "…" : "")} size="small" color="warning" variant="outlined" />
                        : <Typography fontSize={12} color="text.disabled">Sin registro</Typography>}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>
                      {p.emergency_contact_name
                        ? `${p.emergency_contact_name} ${p.emergency_contact_phone ? `· ${p.emergency_contact_phone}` : ""}`
                        : <Typography fontSize={12} color="text.disabled">—</Typography>}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small">
                        <ArrowForwardIosIcon sx={{ fontSize: 13 }} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
}
