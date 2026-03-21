import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Box, Typography, IconButton, Tooltip, Avatar, Divider,
  Menu, MenuItem,
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
import { BRAND } from "../../brand";

const SIDEBAR_W = 220;
const SIDEBAR_COLLAPSED = 64;

const NAV = [
  { icon: <DashboardIcon />, label: "Tablero",   path: "/clinic/kanban" },
  { icon: <PeopleIcon />,    label: "Pacientes",  path: "/clinic/patients" },
  { icon: <CalendarMonthIcon />, label: "Agenda", path: "/clinic/calendar" },
  { icon: <MedicalServicesIcon />, label: "Servicios", path: "/clinic/services" },
  { icon: <ReceiptIcon />,   label: "Caja",       path: "/clinic/payments" },
];

export default function ClinicLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const token = localStorage.getItem("access_token");
  const claims = JSON.parse(localStorage.getItem("user_claims") || "{}");
  const w = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_W;

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <Box sx={{ display: "flex", height: "100vh", bgcolor: "#f0f2f5", overflow: "hidden" }}>
      {/* ── SIDEBAR ── */}
      <Box sx={{
        width: w, minWidth: w, maxWidth: w,
        bgcolor: "#1a1d2e", color: "#fff",
        display: "flex", flexDirection: "column",
        transition: "width 0.2s",
        overflow: "hidden",
        boxShadow: "2px 0 12px rgba(0,0,0,0.15)",
        zIndex: 100,
      }}>
        {/* Logo */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 2, minHeight: 64 }}>
          <LocalHospitalIcon sx={{ color: "#4361ee", fontSize: 28, flexShrink: 0 }} />
          {!collapsed && (
            <Typography fontWeight={800} fontSize={16} letterSpacing={0.5} noWrap>
              {BRAND.verticals.clinic.name}
            </Typography>
          )}
          <Box sx={{ ml: "auto" }}>
            <IconButton size="small" onClick={() => setCollapsed(v => !v)} sx={{ color: "#aaa" }}>
              {collapsed ? <MenuIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
            </IconButton>
          </Box>
        </Box>

        <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

        {/* Nav Items */}
        <Box sx={{ flex: 1, py: 1 }}>
          {NAV.map(({ icon, label, path }) => {
            const active = pathname.startsWith(path);
            return (
              <Tooltip key={path} title={collapsed ? label : ""} placement="right">
                <Box
                  onClick={() => navigate(path)}
                  sx={{
                    display: "flex", alignItems: "center", gap: 1.5,
                    px: collapsed ? 1.5 : 2.5, py: 1.2,
                    mx: 1, mb: 0.5, borderRadius: 2,
                    cursor: "pointer",
                    bgcolor: active ? "rgba(67,97,238,0.2)" : "transparent",
                    color: active ? "#4361ee" : "#9ea3b0",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.06)", color: "#fff" },
                    transition: "all 0.15s",
                    justifyContent: collapsed ? "center" : "flex-start",
                  }}
                >
                  <Box sx={{ flexShrink: 0, "& svg": { fontSize: 22 } }}>{icon}</Box>
                  {!collapsed && (
                    <Typography fontSize={14} fontWeight={active ? 700 : 400}>{label}</Typography>
                  )}
                </Box>
              </Tooltip>
            );
          })}
        </Box>

        <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

        {/* User footer */}
        <Box sx={{ p: collapsed ? 1 : 2, display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar
            sx={{ width: 34, height: 34, bgcolor: "#4361ee", fontSize: 14, cursor: "pointer", flexShrink: 0 }}
            onClick={e => setAnchorEl(e.currentTarget)}
          >
            {(claims.sub || "U")[0].toUpperCase()}
          </Avatar>
          {!collapsed && (
            <Box sx={{ flex: 1, overflow: "hidden" }}>
              <Typography fontSize={12} fontWeight={600} noWrap>{claims.sub || "Usuario"}</Typography>
              <Typography fontSize={10} color="#9ea3b0" noWrap>{claims.role || ""}</Typography>
            </Box>
          )}
          {!collapsed && (
            <Tooltip title="Cerrar sesión">
              <IconButton size="small" sx={{ color: "#9ea3b0" }} onClick={handleLogout}>
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
        <Box sx={{ flex: 1, overflow: "auto", p: 0 }}>
          <Outlet context={{ token, claims }} />
        </Box>
        <Box sx={{ borderTop: "1px solid #e0e0e0", px: 3, py: 1, display: "flex", justifyContent: "space-between", bgcolor: "#fff" }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>{BRAND.verticals.clinic.name}</Typography>
          <Typography variant="caption" color="text.disabled">{BRAND.footer} · © {BRAND.year}</Typography>
        </Box>
      </Box>
    </Box>
  );
}
