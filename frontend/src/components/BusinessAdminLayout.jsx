import React, { useState, useEffect } from "react";
import { Link, useNavigate, Outlet } from "react-router-dom";
import {
  Box, Typography, AppBar, Toolbar, Button, CssBaseline,
  useTheme, Divider, IconButton, Drawer, List, ListItem,
  ListItemButton, ListItemText, useMediaQuery,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LogoutIcon from "@mui/icons-material/Logout";
import StoreIcon from "@mui/icons-material/Store";

const API = import.meta.env.VITE_API_URL || API;

function BusinessAdminLayout() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const userRole = localStorage.getItem("role");
  const isBusinessAdmin = userRole === "business_admin" || userRole === "branch_manager";
  const isEmployee = userRole === "employee";

  const token = localStorage.getItem("access_token");
  const claims = JSON.parse(localStorage.getItem("user_claims") || "{}");
  const activeBranchId = claims.active_branch_id || claims.branch_id;

  const [businessName, setBusinessName] = useState("");
  const [branchName, setBranchName] = useState("");

  useEffect(() => {
    if (claims.business_id && token) {
      fetch(`${API}/businesses/${claims.business_id}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => { if (d.name) setBusinessName(d.name); }).catch(() => {});
    }
    if (activeBranchId && token) {
      fetch(`${API}/branches/${activeBranchId}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => { if (d.name) setBranchName(d.name); }).catch(() => {});
    }
  }, []);

  const handleLogout = () => {
    ["access_token", "role", "business_id", "branch_id", "user_claims"].forEach(k => localStorage.removeItem(k));
    navigate("/login");
  };

  const navLinks = [
    { label: "Panel Operativo", to: "/panel-operativo" },
    { label: "Clientes", to: "/clients" },
    { label: "Órdenes", to: "/orders" },
    { label: "Producción", to: "/produccion" },
    ...(!isEmployee ? [{ label: "Empleados", to: "/employees" }] : []),
  ];

  const drawer = (
    <Box sx={{ width: 240 }} role="presentation" onClick={() => setDrawerOpen(false)}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Typography variant="subtitle1" fontWeight={700} color="primary">{businessName || "Negocio"}</Typography>
        {branchName && (
          <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
            <StoreIcon sx={{ fontSize: 14, color: "text.secondary" }} />
            <Typography variant="body2" color="text.secondary">{branchName}</Typography>
          </Box>
        )}
      </Box>
      <List>
        {navLinks.map(n => (
          <ListItem key={n.to} disablePadding>
            <ListItemButton component={Link} to={n.to}>
              <ListItemText primary={n.label} />
            </ListItemButton>
          </ListItem>
        ))}
        {isBusinessAdmin && (
          <ListItem disablePadding>
            <ListItemButton component={Link} to="/business-admin-dashboard">
              <ListItemText primary="Panel Admin" />
            </ListItemButton>
          </ListItem>
        )}
        <Divider sx={{ my: 1 }} />
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout} sx={{ color: "error.main" }}>
            <ListItemText primary="Cerrar Sesión" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <CssBaseline />
      <AppBar position="sticky" sx={{ bgcolor: "background.paper", boxShadow: theme.shadows[1], zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar sx={{ justifyContent: "space-between", minHeight: "64px !important", px: { xs: 1, sm: 3 } }}>
          {/* Mobile: hamburger + name */}
          {isMobile ? (
            <>
              <Box display="flex" alignItems="center" gap={1}>
                <IconButton edge="start" onClick={() => setDrawerOpen(true)} color="default">
                  <MenuIcon />
                </IconButton>
                <Typography variant="subtitle1" fontWeight={700} color="primary" noWrap>
                  {businessName || "Negocio"}
                </Typography>
                {branchName && (
                  <Typography variant="body2" color="text.secondary" noWrap sx={{ display: { xs: "none", sm: "block" } }}>
                    — {branchName}
                  </Typography>
                )}
              </Box>
              <Button onClick={handleLogout} variant="text" color="error" size="small">
                <LogoutIcon fontSize="small" />
              </Button>
            </>
          ) : (
            /* Desktop: full nav */
            <>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Box display="flex" alignItems="center" gap={1} mr={1}>
                  <Typography variant="subtitle1" sx={{ color: "primary.main", fontWeight: 700, lineHeight: 1.1 }}>
                    {businessName || "Negocio"}
                  </Typography>
                  {branchName && (
                    <>
                      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <StoreIcon sx={{ fontSize: 15, color: "text.secondary" }} />
                        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
                          {branchName}
                        </Typography>
                      </Box>
                    </>
                  )}
                </Box>
                <Divider orientation="vertical" flexItem />
                {navLinks.map(n => (
                  <Button key={n.to} component={Link} to={n.to} sx={{ color: "text.primary", fontWeight: n.to === "/panel-operativo" ? 600 : 400 }}>
                    {n.label}
                  </Button>
                ))}
              </Box>
              <Box display="flex" gap={1.5} alignItems="center">
                {isBusinessAdmin && (
                  <Button component={Link} to="/business-admin-dashboard" variant="contained" color="secondary" startIcon={<ArrowBackIcon />} size="medium">
                    Volver a Admin
                  </Button>
                )}
                <Button onClick={handleLogout} variant="text" color="error" startIcon={<LogoutIcon />} sx={{ fontWeight: 500 }}>
                  Cerrar Sesión
                </Button>
              </Box>
            </>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile drawer */}
      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        {drawer}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: { xs: 1.5, sm: 3 } }}>
        <Outlet />
      </Box>
    </Box>
  );
}

export default BusinessAdminLayout;
