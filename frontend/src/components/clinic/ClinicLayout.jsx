import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Box, Typography, IconButton, Tooltip, Avatar, Divider,
  Menu, MenuItem, Select,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ReceiptIcon from "@mui/icons-material/Receipt";
import LogoutIcon from "@mui/icons-material/Logout";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import GroupIcon from "@mui/icons-material/Group";
import StoreIcon from "@mui/icons-material/Store";
import SettingsIcon from "@mui/icons-material/Settings";
import { BRAND } from "../../brand";

const API = import.meta.env.VITE_API_URL || "";
const SIDEBAR_W = 220;
const SIDEBAR_COLLAPSED = 64;

const NAV = [
  { icon: <DashboardIcon />, label: "Tablero", path: "/clinic/kanban" },
  { icon: <PeopleIcon />, label: "Pacientes", path: "/clinic/patients" },
  { icon: <CalendarMonthIcon />, label: "Agenda", path: "/clinic/calendar" },
  { icon: <MedicalServicesIcon />, label: "Servicios", path: "/clinic/services" },
  { icon: <ReceiptIcon />, label: "Caja", path: "/clinic/payments" },
  { icon: <GroupIcon />, label: "Equipo", path: "/clinic/users" },
];

const ADMIN_NAV = [
  { icon: <SettingsIcon />, label: "Configuración", path: "/clinic/admin" },
];

export default function ClinicLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const token = localStorage.getItem("access_token");
  const claims = JSON.parse(localStorage.getItem("user_claims") || "{}");
  const isAdmin = claims.role === "business_admin";

  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const w = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_W;

  useEffect(() => {
    if (!claims.business_id) return;
    fetch(`${API}/businesses/${claims.business_id}/branches`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        const list = d.branches || [];
        setBranches(list);
        const savedId = localStorage.getItem("clinic_branch_id");
        const found = list.find(b => String(b.id) === savedId) || list[0];
        if (found) {
          setSelectedBranch(found);
          localStorage.setItem("clinic_branch_id", String(found.id));
        }
      })
      .catch(() => {});
  }, []);

  const handleBranchChange = (e) => {
    const branch = branches.find(b => String(b.id) === String(e.target.value));
    if (branch) {
      setSelectedBranch(branch);
      localStorage.setItem("clinic_branch_id", String(branch.id));
    }
  };

  const handleLogout = () => { localStorage.clear(); navigate("/login"); };

  const NavItem = ({ icon, label, path }) => {
    const active = pathname.startsWith(path);
    return (
      <Tooltip title={collapsed ? label : ""} placement="right">
        <Box onClick={() => navigate(path)} sx={{
          display: "flex", alignItems: "center", gap: 1.5,
          px: collapsed ? 1.5 : 2, py: 1, mx: 1, mb: 0.3, borderRadius: 1.5,
          cursor: "pointer",
          bgcolor: active ? "#eff2ff" : "transparent",
          color: active ? "#4361ee" : "#4b5563",
          "&:hover": { bgcolor: active ? "#eff2ff" : "#f3f4f6", color: active ? "#4361ee" : "#111827" },
          transition: "all 0.12s",
          justifyContent: collapsed ? "center" : "flex-start",
        }}>
          <Box sx={{ flexShrink: 0, "& svg": { fontSize: 20 } }}>{icon}</Box>
          {!collapsed && <Typography fontSize={13.5} fontWeight={active ? 600 : 400}>{label}</Typography>}
        </Box>
      </Tooltip>
    );
  };

  return (
    <Box sx={{ display: "flex", height: "100vh", bgcolor: "#f5f6f8", overflow: "hidden" }}>
      {/* ── SIDEBAR ── */}
      <Box sx={{
        width: w, minWidth: w, maxWidth: w, bgcolor: "#ffffff",
        display: "flex", flexDirection: "column",
        transition: "width 0.2s", overflow: "hidden",
        borderRight: "1px solid #e5e7eb", zIndex: 100,
      }}>
        {/* Logo */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, minHeight: 64, borderBottom: "1px solid #e5e7eb" }}>
          <LocalHospitalIcon sx={{ color: "#4361ee", fontSize: 26, flexShrink: 0 }} />
          {!collapsed && (
            <Typography fontWeight={800} fontSize={15} color="#1a1a2e" letterSpacing={0.3} noWrap>
              {BRAND.verticals.clinic.name}
            </Typography>
          )}
          <Box sx={{ ml: "auto" }}>
            <IconButton size="small" onClick={() => setCollapsed(v => !v)} sx={{ color: "#9ca3af" }}>
              {collapsed ? <MenuIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
            </IconButton>
          </Box>
        </Box>

        {/* Main Nav */}
        <Box sx={{ flex: 1, py: 1.5 }}>
          {NAV.map(n => <NavItem key={n.path} {...n} />)}

          {/* Admin section */}
          {isAdmin && (
            <>
              <Divider sx={{ borderColor: "#e5e7eb", my: 1, mx: 1 }} />
              {!collapsed && (
                <Typography fontSize={10} fontWeight={700} color="#9ca3af" textTransform="uppercase"
                  letterSpacing={1} px={2} pb={0.5}>Admin</Typography>
              )}
              {ADMIN_NAV.map(n => <NavItem key={n.path} {...n} />)}
            </>
          )}
        </Box>

        <Divider sx={{ borderColor: "#e5e7eb" }} />

        {/* User footer */}
        <Box sx={{ p: collapsed ? 1 : 1.5, display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: "#4361ee", fontSize: 13, cursor: "pointer", flexShrink: 0 }}
            onClick={e => setAnchorEl(e.currentTarget)}>
            {(claims.username || claims.full_name || "U")[0].toUpperCase()}
          </Avatar>
          {!collapsed && (
            <Box sx={{ flex: 1, overflow: "hidden" }}>
              <Typography fontSize={12} fontWeight={600} color="#111827" noWrap>{claims.username || claims.full_name || "Usuario"}</Typography>
              <Typography fontSize={10} color="#9ca3af" noWrap>
                {claims.role === "business_admin" ? "Administrador" : claims.role === "branch_manager" ? "Gerente" : claims.role || ""}
              </Typography>
            </Box>
          )}
          {!collapsed && (
            <Tooltip title="Cerrar sesión">
              <IconButton size="small" sx={{ color: "#9ca3af" }} onClick={handleLogout}>
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          <MenuItem onClick={handleLogout}><LogoutIcon fontSize="small" sx={{ mr: 1 }} /> Cerrar sesión</MenuItem>
        </Menu>
      </Box>

      {/* ── MAIN CONTENT ── */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Topbar */}
        <Box sx={{ height: 52, bgcolor: "#fff", borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", px: 2.5, gap: 2, flexShrink: 0 }}>
          <StoreIcon sx={{ color: "#4361ee", fontSize: 20 }} />
          {branches.length > 1 ? (
            <Select value={selectedBranch ? String(selectedBranch.id) : ""} onChange={handleBranchChange}
              size="small" variant="outlined"
              sx={{ minWidth: 200, fontSize: 13, "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e0e0e0" } }}>
              {branches.map(b => <MenuItem key={b.id} value={String(b.id)}>{b.name}</MenuItem>)}
            </Select>
          ) : (
            <Typography fontSize={13} fontWeight={600} color="text.secondary">{branches[0]?.name || "Sucursal"}</Typography>
          )}
          <Box sx={{ flex: 1 }} />
          <Typography variant="caption" color="text.disabled">{claims.username || ""}</Typography>
        </Box>

        <Box sx={{ flex: 1, overflow: "auto" }}>
          <Outlet context={{ token, claims, branches, selectedBranch, setSelectedBranch }} />
        </Box>

        <Box sx={{ borderTop: "1px solid #e0e0e0", px: 3, py: 1, display: "flex", justifyContent: "space-between", bgcolor: "#fff" }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>{BRAND.verticals.clinic.name}</Typography>
          <Typography variant="caption" color="text.disabled">{BRAND.footer} · © {BRAND.year}</Typography>
        </Box>
      </Box>
    </Box>
  );
}
