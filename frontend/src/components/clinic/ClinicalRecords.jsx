import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, CircularProgress } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import UploadFileIcon from '@mui/icons-material/UploadFile';

export default function ClinicalRecords() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  const token = localStorage.getItem('access_token');
  // Use VITE_API_URL, fallback to empty to use relative if on same domain
  const API_BASE = import.meta.env.VITE_API_URL || '';

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/clinical-records`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al cargar hojas clínicas');
      const data = await res.json();
      setRecords(data.records || []);
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setMessage({ text: '', type: '' });
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/api/v1/clinical-records/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Error al subir archivo');
      
      setMessage({ text: 'Archivo subido correctamente.', type: 'success' });
      fetchRecords(); // refresh list
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = null;
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 800, margin: '0 auto' }}>
      <Typography variant="h5" fontWeight={700} color="#111827" mb={3}>
        Gestión de Hojas Clínicas (PDF)
      </Typography>

      <Paper sx={{ p: 3, mb: 4, borderRadius: 2, border: '1px solid #e5e7eb', boxShadow: 'none' }}>
        <Typography variant="subtitle1" fontWeight={600} mb={2}>Subir nueva hoja clínica</Typography>
        
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            variant="contained"
            component="label"
            startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <UploadFileIcon />}
            disabled={uploading}
            sx={{ bgcolor: '#4361ee', '&:hover': { bgcolor: '#3a56d4' } }}
          >
            Seleccionar PDF
            <input type="file" hidden accept="application/pdf" onChange={handleFileChange} />
          </Button>
          
          {message.text && (
            <Typography variant="body2" color={message.type === 'error' ? 'error.main' : 'success.main'}>
              {message.text}
            </Typography>
          )}
        </Box>
      </Paper>

      <Typography variant="h6" fontWeight={600} color="#374151" mb={2}>
        Hojas Clínicas Disponibles
      </Typography>

      {loading ? (
        <CircularProgress />
      ) : records.length === 0 ? (
        <Typography color="text.secondary">No hay hojas clínicas subidas aún.</Typography>
      ) : (
        <List sx={{ bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #e5e7eb' }}>
          {records.map((r) => (
            <ListItem key={r.id} divider>
              <ListItemText 
                primary={r.name} 
                secondary={new Date(r.created_at).toLocaleString()}
              />
              <ListItemSecondaryAction>
                <IconButton 
                  edge="end" 
                  color="primary" 
                  component="a" 
                  href={`${API_BASE}/api/v1/clinical-records/${r.id}/download?token=${token}`} 
                  target="_blank"
                >
                  <DownloadIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}
