import React, { useState, useEffect } from "react";
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, TextField, Typography, Box, CircularProgress, Alert
} from "@mui/material";

export default function OpenShiftModal({ API, token, branchId, onShiftOpened }) {
  const [registers, setRegisters] = useState([]);
  const [selectedRegister, setSelectedRegister] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API}/cash-registers?branch_id=${branchId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(data => {
      setRegisters(data);
      if (data.length > 0) {
        setSelectedRegister(data[0].id);
      }
      setLoading(false);
    })
    .catch(err => {
      setError("Error al cargar las cajas.");
      setLoading(false);
    });
  }, [API, branchId, token]);

  const handleOpenShift = async () => {
    if (!openingBalance || isNaN(openingBalance) || Number(openingBalance) < 0) {
      setError("Ingresa un fondo de caja válido.");
      return;
    }
    if (!selectedRegister) {
      setError("Selecciona una caja.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API}/cash-shifts/open`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          branch_id: branchId,
          register_id: selectedRegister,
          opening_balance: Number(openingBalance)
        })
      });
      const data = await res.json();
      
      if (res.ok) {
        onShiftOpened();
      } else {
        setError(data.detail || "Error al abrir turno.");
      }
    } catch (e) {
      setError("Error de conexión.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={true} maxWidth="sm" fullWidth disableEscapeKeyDown>
      <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold' }}>
        Apertura de Caja Obligatoria
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Box display="flex" flexDirection="column" gap={3} mt={1}>
            <Typography variant="body1" textAlign="center" color="text.secondary">
              No hay ningún turno abierto en esta sucursal. Para poder crear órdenes o cobrar, debes abrir la caja.
            </Typography>
            
            {error && <Alert severity="error">{error}</Alert>}

            {registers.length > 0 ? (
              <TextField 
                select
                label="Caja a Operar"
                value={selectedRegister}
                onChange={e => setSelectedRegister(e.target.value)}
                SelectProps={{ native: true }}
                fullWidth
              >
                {registers.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </TextField>
            ) : (
              <Alert severity="warning">No hay cajas configuradas en esta sucursal.</Alert>
            )}

            <TextField 
              label="Fondo de Caja (Efectivo Inicial)"
              type="number"
              value={openingBalance}
              onChange={e => setOpeningBalance(e.target.value)}
              placeholder="Ej. 500"
              fullWidth
              InputProps={{ startAdornment: <Typography sx={{ mr: 1 }}>$</Typography> }}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 3, justifyContent: 'center' }}>
        <Button 
          variant="contained" 
          color="primary" 
          size="large"
          onClick={handleOpenShift}
          disabled={loading || submitting || registers.length === 0}
          sx={{ width: '100%', py: 1.5, fontWeight: 'bold' }}
        >
          {submitting ? "Abriendo Turno..." : "Abrir Caja y Comenzar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
