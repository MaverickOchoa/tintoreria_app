// src/components/BranchSelector.jsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  List,
  ListItemText,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import LogoutIcon from "@mui/icons-material/Logout";

const API_BASE_URL = import.meta.env.VITE_API_URL || API;

const getAuthClaims = () => {
  const claimsString = localStorage.getItem("user_claims");
  if (!claimsString) return null;
  try {
    return JSON.parse(claimsString);
  } catch {
    return null;
  }
};

function BranchSelector() {
  const navigate = useNavigate();
  const claims = getAuthClaims();

  const [businessName, setBusinessName] = useState("");
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!claims || claims.role !== "business_admin") {
      navigate("/login");
    }
  }, [claims, navigate]);

  if (!claims || claims.role !== "business_admin") {
    return null;
  }

  const { business_id } = claims;

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("access_token");
      if (!token || !business_id) { setLoading(false); return; }

      try {
        const [bizRes, branchRes] = await Promise.all([
          fetch(`${API_BASE_URL}/businesses/${business_id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE_URL}/businesses/${business_id}/branches`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        const bizData = await bizRes.json();
        const branchData = await branchRes.json();
        if (bizRes.ok) setBusinessName(bizData.name);
        if (branchRes.ok) setBranches(branchData.branches || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [business_id]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const handleSelectBranch = async (branchId) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API}/auth/select-branch`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ branch_id: branchId }),
      });
      if (!res.ok) throw new Error("Error al seleccionar sucursal");
      const data = await res.json();
      // Replace token and update all claims with new branch_id
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("branch_id", String(data.branch_id));
      const updatedClaims = { ...claims, branch_id: data.branch_id, active_branch_id: data.branch_id };
      localStorage.setItem("user_claims", JSON.stringify(updatedClaims));
    } catch {
      // Fallback: update localStorage only
      const nextClaims = { ...claims, branch_id: branchId, active_branch_id: branchId };
      localStorage.setItem("user_claims", JSON.stringify(nextClaims));
      localStorage.setItem("branch_id", String(branchId));
    }
    navigate("/business-admin-dashboard");
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        p: 2,
      }}
    >
      <Paper elevation={4} sx={{ p: 4, borderRadius: 3, width: 450 }}>
        <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>
          Selecciona Sucursal
        </Typography>

        <Typography variant="subtitle2" sx={{ mb: 3 }}>
          {loading ? <CircularProgress size={16} /> : businessName}
        </Typography>

        <List>
          {loading ? (
            <Box sx={{ textAlign: "center", py: 2 }}><CircularProgress /></Box>
          ) : branches.length === 0 ? (
            <Typography color="text.secondary" align="center">No hay sucursales disponibles.</Typography>
          ) : (
            branches.map((branch) => (
            <Paper
              key={branch.id}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                p: 1.5,
                mb: 1,
              }}
            >
              <ListItemText primary={branch.name} />
              <Button
                variant="contained"
                endIcon={<ArrowForwardIcon />}
                onClick={() => handleSelectBranch(branch.id)}
              >
                Entrar
              </Button>
            </Paper>
          ))
          )}
        </List>

        <Button
          variant="outlined"
          color="secondary"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          sx={{ mt: 3, width: "100%" }}
        >
          Cerrar Sesión
        </Button>
      </Paper>
    </Box>
  );
}

export default BranchSelector;
