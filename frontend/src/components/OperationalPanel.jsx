import React, { useState, useEffect } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import OrderStatsCards from "./OrderStatsCards";
import OpenShiftModal from "./OpenShiftModal";
import { Outlet } from "react-router-dom";

export default function OperationalPanel() {
  const token = localStorage.getItem("access_token");
  const API = import.meta.env.VITE_API_URL;
  
  const [branchId, setBranchId] = useState(null);
  const [activeShift, setActiveShift] = useState(true); 
  const [checkingShift, setCheckingShift] = useState(true);

  const checkActiveShift = async (bId) => {
    try {
      const res = await fetch(`${API}/cash-shifts/active?branch_id=${bId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setActiveShift(data.active);
      }
    } catch(e) {
      console.error("Error checking shift", e);
    } finally {
      setCheckingShift(false);
    }
  };

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const bId = payload.active_branch_id || payload.branch_id;
        setBranchId(bId);
        checkActiveShift(bId);
      } catch (e) {
        setCheckingShift(false);
      }
    } else {
      setCheckingShift(false);
    }
  }, [token]);

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", p: { xs: 2, md: 3 }, position: 'relative' }}>
      
      {checkingShift ? (
        <Box display="flex" minHeight="50vh" alignItems="center" justifyContent="center">
          <CircularProgress />
        </Box>
      ) : (
        <>
          {!activeShift && (
            <OpenShiftModal 
              API={API} 
              token={token} 
              branchId={branchId} 
              onShiftOpened={() => setActiveShift(true)} 
            />
          )}

          <Typography variant="h4" fontWeight={700} color="primary" mb={0.5}>
            Panel Operativo
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Resumen del estado de las rdenes del da.
          </Typography>
          <OrderStatsCards />
          
          <Box mt={3}>
            <Outlet />
          </Box>
        </>
      )}
    </Box>
  );
}
