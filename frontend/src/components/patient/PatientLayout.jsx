import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Box, Typography, Avatar, IconButton, Tooltip, Divider,
} from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import FolderSharedIcon from "@mui/icons-material/FolderShared";
import LogoutIcon from "@mui/icons-material/Logout";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";

const NAV = [
  { icon: <CalendarMonthIcon />, label: "Mis Citas", path: "/patient/appointments" },
  { icon: <ReceiptLongIcon />, label: "Mis Adeudos", path: "/patient/payments" },
  { icon: <FolderSharedIcon />, label: "Mi Expediente", path: "/patient/records" },
];

export default function PatientLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const claims = JSON.parse(localStorage.getItem("patient_claims") || "{}");
  const token = localStorage.getItem("patient_token");
  const w = collapsed ? 64 : 220;

  const handleLogout = () => {
    localStorage.removeItem("patient_token");
    localStorage.removeItem("patient_claims");
    navigate("/patient/login");
  };

  if (!token) { navigate("/patient/login"); return null; }

  return (
    <Box sx={{ display: "flex", height: "100vh", bgcolor: "#f5f6f8", overflow: "hidden" }}>
      {/* Sidebar */}
      <Box sx={{
        width: w, minWidth: w, maxWidth: w,
        bgcolor: "#ffffff", display: "flex", flexDirection: "column",
        transition: "width 0.2s", overflow: "hidden",
        borderRight: "1px solid #e5e7eb", zIndex: 100,
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, minHeight: 64, borderBottom: "1px solid #e5e7eb" }}>
          <LocalHospitalIcon sx={{ color: "#4361ee", fontSize: 26, flexShrink: 0 }} />
          {!collapsed && (
            <Typography fontWeight={800} fontSize={14} color="#1a1a2e" noWrap>
              Zentro Clinic
            </Typography>
          )}
          <Box sx={{ ml: "auto" }}>
            <IconButton size="small" onClick={() => setCollapsed(v => !v)} sx={{ color: "#9ca3af" }}>
              <span style={{ fontSize: 18 }}>{collapsed ? "›" : "‹"}</span>
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ flex: 1, py: 1.5 }}>
          {NAV.map(({ icon, label, path }) => {
            const active = pathname.startsWith(path);
            return (
              <Tooltip key={path} title={collapsed ? label : ""} placement="right">
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
          })}
        </Box>

        <Divider sx={{ borderColor: "#e5e7eb" }} />
        <Box sx={{ p: collapsed ? 1 : 1.5, display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: "#4361ee", fontSize: 13, flexShrink: 0 }}>
            {(claims.full_name || "P")[0].toUpperCase()}
          </Avatar>
          {!collapsed && (
            <Box sx={{ flex: 1, overflow: "hidden" }}>
              <Typography fontSize={12} fontWeight={600} color="#111827" noWrap>{claims.full_name || "Paciente"}</Typography>
              <Typography fontSize={10} color="#9ca3af" noWrap>Portal Paciente</Typography>
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
      </Box>

      {/* Main content */}
      <Box sx={{ flex: 1, overflow: "auto" }}>
        <Outlet context={{ token, claims }} />
      </Box>
    </Box>
  );
}
