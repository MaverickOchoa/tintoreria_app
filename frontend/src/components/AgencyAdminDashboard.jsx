import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Grid, Paper, Chip, Avatar, Button, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Divider, Tooltip, CircularProgress,
} from "@mui/material";
import BusinessIcon from "@mui/icons-material/Business";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import StorefrontIcon from "@mui/icons-material/Storefront";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import LogoutIcon from "@mui/icons-material/Logout";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PeopleIcon from "@mui/icons-material/People";

const API = import.meta.env.VITE_API_URL || "";

const VERTICAL_ICON = {
  laundry: <StorefrontIcon sx={{ color: "#4361ee" }} />,
  clinic: <LocalHospitalIcon sx={{ color: "#2ec4b6" }} />,
};

const VERTICAL_COLOR = { laundry: "#4361ee", clinic: "#2ec4b6" };

function StatCard({ icon, label, value, color }) {
  return (
    <Paper elevation={0} sx={{ border: "1px solid #e8eaed", borderRadius: 3, p: 2.5, display: "flex", alignItems: "center", gap: 2 }}>
      <Box sx={{ bgcolor: color + "18", borderRadius: 2, p: 1.2, "& svg": { fontSize: 28, color } }}>{icon}</Box>
      <Box>
        <Typography fontSize={22} fontWeight={800} color={color}>{value}</Typography>
        <Typography fontSize={12} color="text.secondary">{label}</Typography>
      </Box>
    </Paper>
  );
}

export default function AgencyAdminDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");
  const claims = JSON.parse(localStorage.getItem("user_claims") || "{}");
  const agencyId = claims.agency_id;

  const [agency, setAgency] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agencyId) return;
    Promise.all([
      fetch(`${API}/api/v1/agencies/${agencyId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/api/v1/agencies/${agencyId}/businesses`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([ag, biz]) => {
      setAgency(ag);
      setBusinesses(Array.isArray(biz) ? biz : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [agencyId]);

  const handleLogout = () => { localStorage.clear(); navigate("/login"); };

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
      <CircularProgress />
    </Box>
  );

  const laundryCount = businesses.filter(b => (b.vertical_type || "laundry") === "laundry").length;
  const clinicCount  = businesses.filter(b => b.vertical_type === "clinic").length;
  const totalBranches = businesses.reduce((acc, b) => acc + (b.branches?.length || 0), 0);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f0f2f5" }}>
      {/* Top bar */}
      <Box sx={{ bgcolor: "#1a1d2e", color: "#fff", px: 4, py: 2, display: "flex", alignItems: "center", gap: 2 }}>
        <BusinessIcon sx={{ color: "#4361ee" }} />
        <Box>
          <Typography fontWeight={800} fontSize={18}>{agency?.name || "Mi Agencia"}</Typography>
          <Typography fontSize={12} color="#9ea3b0">Panel de Agencia · {claims.username}</Typography>
        </Box>
        <Box sx={{ ml: "auto" }}>
          <Tooltip title="Cerrar sesión">
            <IconButton onClick={handleLogout} sx={{ color: "#9ea3b0" }}>
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1100, mx: "auto" }}>
        {/* Stats */}
        <Grid container spacing={2} mb={4}>
          <Grid item xs={6} sm={3}>
            <StatCard icon={<BusinessIcon />} label="Total negocios" value={businesses.length} color="#4361ee" />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard icon={<StorefrontIcon />} label="Tintorerías" value={laundryCount} color="#4361ee" />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard icon={<LocalHospitalIcon />} label="Clínicas" value={clinicCount} color="#2ec4b6" />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard icon={<PeopleIcon />} label="Sucursales" value={totalBranches} color="#f77f00" />
          </Grid>
        </Grid>

        {/* Businesses table — CRM */}
        <Paper elevation={0} sx={{ border: "1px solid #e8eaed", borderRadius: 3, overflow: "hidden" }}>
          <Box sx={{ px: 3, py: 2, display: "flex", alignItems: "center" }}>
            <Typography fontWeight={800} fontSize={16}>Mis Negocios</Typography>
            <Chip label="CRM" size="small" sx={{ ml: 1.5, bgcolor: "#eef0fd", color: "#4361ee", fontWeight: 700 }} />
          </Box>
          <Divider />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#f8f9fa" }}>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Negocio</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Vertical</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Sucursales</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Contacto</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>Estado</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {businesses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 5, color: "text.secondary" }}>
                      No hay negocios asignados a esta agencia
                    </TableCell>
                  </TableRow>
                ) : (
                  businesses.map(b => {
                    const vertical = b.vertical_type || "laundry";
                    const color = VERTICAL_COLOR[vertical] || "#4361ee";
                    return (
                      <TableRow key={b.id} hover>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1.5}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: color + "18" }}>
                              {VERTICAL_ICON[vertical]}
                            </Avatar>
                            <Box>
                              <Typography fontSize={13} fontWeight={600}>{b.name}</Typography>
                              <Typography fontSize={11} color="text.secondary">{b.address || "—"}</Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={vertical === "laundry" ? "Tintorería" : "Clínica"} size="small"
                            sx={{ bgcolor: color + "18", color, fontWeight: 600, fontSize: 11 }} />
                        </TableCell>
                        <TableCell sx={{ fontSize: 13 }}>{b.branches?.length || 0}</TableCell>
                        <TableCell>
                          <Typography fontSize={12}>{b.phone || "—"}</Typography>
                          <Typography fontSize={11} color="text.secondary">{b.email || ""}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={b.is_active ? "Activo" : "Inactivo"} size="small"
                            color={b.is_active ? "success" : "default"} variant="outlined" />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small">
                            <ArrowForwardIosIcon sx={{ fontSize: 13 }} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Agency info */}
        {agency && (
          <Paper elevation={0} sx={{ border: "1px solid #e8eaed", borderRadius: 3, p: 3, mt: 3 }}>
            <Typography fontWeight={700} fontSize={15} mb={2}>Información de la Agencia</Typography>
            <Grid container spacing={2}>
              {[
                ["Contacto", agency.contact_name],
                ["Email", agency.email],
                ["Teléfono", agency.phone],
                ["Notas", agency.notes],
              ].map(([l, v]) => v ? (
                <Grid item xs={12} sm={6} key={l}>
                  <Typography fontSize={11} color="text.secondary" fontWeight={600}>{l}</Typography>
                  <Typography fontSize={14}>{v}</Typography>
                </Grid>
              ) : null)}
            </Grid>
          </Paper>
        )}
      </Box>
    </Box>
  );
}
