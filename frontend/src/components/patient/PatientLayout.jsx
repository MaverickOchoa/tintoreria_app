import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Box, Typography, Avatar, IconButton, Tooltip, Divider,
  BottomNavigation, BottomNavigationAction, useMediaQuery, useTheme
} from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import FolderSharedIcon from "@mui/icons-material/FolderShared";
import LogoutIcon from "@mui/icons-material/Logout";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import PersonIcon from "@mui/icons-material/Person";
import { CustomThemeContext } from "../Theme";

const NAV = [
  { icon: <CalendarMonthIcon />, label: "Citas", path: "/patient/appointments" },
  { icon: <ReceiptLongIcon />, label: "Adeudos", path: "/patient/payments" },
  { icon: <FolderSharedIcon />, label: "Expediente", path: "/patient/records" },
  { icon: <PersonIcon />, label: "Perfil", path: "/patient/profile" },
];

export default function PatientLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { pathname } = location;
  const [collapsed, setCollapsed] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const claims = JSON.parse(localStorage.getItem("patient_claims") || "{}");
  const token = localStorage.getItem("patient_token");
  const w = collapsed ? 64 : 220;

  const [business, setBusiness] = useState(null);
  const { setThemeConfig } = React.useContext(CustomThemeContext);

  useEffect(() => {
    const link = document.getElementById("manifest-link");
    if (link) link.href = "/manifest-patient.json";

    if (claims.business_id) {
      const apiUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";
      fetch(`${apiUrl}/api/v2/businesses/${claims.business_id}/public`)
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d) {
            setBusiness(d);
            setThemeConfig({
              primary: d.portal_primary_color || "#121B2B",
              bg: d.portal_bg_color || "#ECECEC",
            });
          }
        })
        .catch(() => {});
    }
  }, [claims.business_id]);

  const handleLogout = () => {
    localStorage.removeItem("patient_token");
    localStorage.removeItem("patient_claims");
    navigate("/patient/login");
  };

  if (!token) { navigate("/patient/login"); return null; }

  const activeTab = NAV.find(n => pathname.startsWith(n.path))?.path || NAV[0].path;

  if (isMobile) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, right: 0, bottom: 0, bgcolor: "#f5f6f8", overflow: "hidden" }}>
        {/* Top App Bar */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, minHeight: 56, bgcolor: "#ffffff", borderBottom: "1px solid #e5e7eb", zIndex: 1100 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {business?.portal_logo_url ? (
              <img src={business.portal_logo_url} alt="Logo" style={{ height: 28, objectFit: "contain" }} />
            ) : (
              <LocalHospitalIcon sx={{ color: "primary.main", fontSize: 24 }} />
            )}
            <Typography fontWeight={800} fontSize={16} color="primary.main">
              {business?.name || "Zentro Clinic"}
            </Typography>
          </Box>
          <IconButton onClick={handleLogout} sx={{ color: "#9ca3af" }}>
            <LogoutIcon />
          </IconButton>
        </Box>
        
        {/* Main content */}
        <Box sx={{ flex: 1, overflow: "auto" }}>
          <Outlet context={{ token, claims }} />
        </Box>

        {/* Bottom Navigation */}
        <Box sx={{ borderTop: "1px solid #e5e7eb", bgcolor: "#ffffff", pb: "env(safe-area-inset-bottom)" }}>
          <BottomNavigation
            showLabels
            value={activeTab}
            onChange={(event, newValue) => navigate(newValue)}
            sx={{
              height: 64,
              "& .MuiBottomNavigationAction-root": { minWidth: 0, color: "#9ca3af" },
              "& .Mui-selected": { color: "#4361ee" }
            }}
          >
            {NAV.map(({ icon, label, path }) => (
              <BottomNavigationAction key={path} label={label} icon={icon} value={path} />
            ))}
          </BottomNavigation>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", height: "100dvh", bgcolor: "#f5f6f8", overflow: "hidden" }}>
      {/* Sidebar */}
      <Box sx={{
        width: w, minWidth: w, maxWidth: w,
        bgcolor: "#ffffff", display: "flex", flexDirection: "column",
        transition: "width 0.2s", overflow: "hidden",
        borderRight: "1px solid #e5e7eb", zIndex: 100,
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, minHeight: 64, borderBottom: "1px solid #e5e7eb" }}>
          {business?.portal_logo_url ? (
            <img src={business.portal_logo_url} alt="Logo" style={{ height: 32, width: collapsed ? 32 : "auto", objectFit: "contain", flexShrink: 0 }} />
          ) : (
            <LocalHospitalIcon sx={{ color: "primary.main", fontSize: 26, flexShrink: 0 }} />
          )}
          {!collapsed && (
            <Typography fontWeight={800} fontSize={14} color="primary.main" noWrap>
              {business?.name || "Zentro Clinic"}
            </Typography>
          )}
          <Box sx={{ ml: "auto" }}>
            <IconButton size="small" onClick={() => setCollapsed(v => !v)} sx={{ color: "#9ca3af" }}>
              <span style={{ fontSize: 18 }}>{collapsed ? "◀" : "▶"}</span>
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
