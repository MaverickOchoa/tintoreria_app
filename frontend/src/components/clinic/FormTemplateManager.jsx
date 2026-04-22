import React, { useState, useEffect, useRef } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import {
  Box, Button, Typography, Card, CardContent, CardActions,
  CircularProgress, Chip, IconButton, Tooltip, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField,
  LinearProgress, Alert,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ArticleIcon from "@mui/icons-material/Article";
import AddIcon from "@mui/icons-material/Add";
import { CLINIC_API } from "./clinicTheme";

export default function FormTemplateManager() {
  const { token } = useOutletContext();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState("");
  const [error, setError]         = useState(null);
  const [dialog, setDialog]       = useState(false);
  const [form, setForm]           = useState({ name: "", description: "" });
  const [file, setFile]           = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${CLINIC_API}/api/v2/clinic/form-templates`, { headers });
      const data = await r.json();
      setTemplates(Array.isArray(data) ? data : []);
    } catch {
      setError("Error cargando formularios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async () => {
    if (!form.name.trim() || !file) return;
    setUploading(true);
    setProgress("Subiendo PDF...");
    setError(null);
    try {
      const fd = new FormData();
      fd.append("name", form.name.trim());
      fd.append("description", form.description.trim());
      fd.append("pdf_file", file);

      setProgress("Detectando campos automáticamente...");
      const r = await fetch(`${CLINIC_API}/api/v2/clinic/form-templates`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!r.ok) throw new Error(await r.text());
      const created = await r.json();
      setDialog(false);
      setForm({ name: "", description: "" });
      setFile(null);
      await load();
      // Go directly to the editor
      navigate(`/clinic/form-templates/${created.id}/edit`);
    } catch (e) {
      setError("Error al subir: " + e.message);
    } finally {
      setUploading(false);
      setProgress("");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este formulario?")) return;
    await fetch(`${CLINIC_API}/api/v2/clinic/form-templates/${id}`, {
      method: "DELETE", headers,
    });
    await load();
  };

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} color="#c0005a">Formularios PDF</Typography>
          <Typography variant="body2" color="text.secondary">
            Sube el PDF de tu clínica y configura los campos digitales. Funciona con cualquier formato.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialog(true)}
          sx={{ bgcolor: "#c0005a", "&:hover": { bgcolor: "#a0004a" } }}
        >
          Nuevo formulario
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
          <CircularProgress sx={{ color: "#c0005a" }} />
        </Box>
      ) : templates.length === 0 ? (
        <Box sx={{ textAlign: "center", mt: 8, color: "text.secondary" }}>
          <ArticleIcon sx={{ fontSize: 64, color: "#f48fb1", mb: 2 }} />
          <Typography variant="h6">Sin formularios todavía</Typography>
          <Typography variant="body2" sx={{ mb: 3 }}>
            Sube el PDF de tu hoja clínica para empezar.
          </Typography>
          <Button
            variant="contained"
            startIcon={<UploadFileIcon />}
            onClick={() => setDialog(true)}
            sx={{ bgcolor: "#c0005a", "&:hover": { bgcolor: "#a0004a" } }}
          >
            Subir PDF
          </Button>
        </Box>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 2 }}>
          {templates.map(t => (
            <Card key={t.id} sx={{ border: "1.5px solid #f8bbd0", borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                  <ArticleIcon sx={{ color: "#c0005a", mt: 0.3, fontSize: 32 }} />
                  <Box>
                    <Typography fontWeight={700} fontSize={15}>{t.name}</Typography>
                    {t.description && (
                      <Typography variant="body2" color="text.secondary" fontSize={12}>
                        {t.description}
                      </Typography>
                    )}
                    <Chip
                      label={`${t.pages_urls?.length || 0} páginas · ${t.field_map?.length || 0} campos`}
                      size="small"
                      sx={{ mt: 1, bgcolor: "#fce4ec", color: "#c0005a", fontSize: 10 }}
                    />
                  </Box>
                </Box>
              </CardContent>
              <CardActions sx={{ justifyContent: "flex-end", pt: 0 }}>
                <Tooltip title="Editar campos">
                  <IconButton
                    size="small"
                    onClick={() => navigate(`/clinic/form-templates/${t.id}/edit`)}
                    sx={{ color: "#c0005a" }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Eliminar">
                  <IconButton size="small" color="error" onClick={() => handleDelete(t.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </CardActions>
            </Card>
          ))}
        </Box>
      )}

      {/* Upload dialog */}
      <Dialog open={dialog} onClose={() => !uploading && setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: "#c0005a", fontWeight: 800 }}>
          Subir nuevo formulario PDF
        </DialogTitle>
        <DialogContent>
          {uploading && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress sx={{ mb: 1, "& .MuiLinearProgress-bar": { bgcolor: "#c0005a" } }} />
              <Typography variant="body2" color="text.secondary">{progress}</Typography>
            </Box>
          )}
          <TextField
            label="Nombre del formulario"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            fullWidth sx={{ mb: 2, mt: 1 }}
            placeholder="Ej: Hoja Clínica Neurológica"
            disabled={uploading}
          />
          <TextField
            label="Descripción (opcional)"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            fullWidth sx={{ mb: 2 }}
            disabled={uploading}
          />
          <Box
            sx={{
              border: "2px dashed #f48fb1", borderRadius: 2, p: 3, textAlign: "center",
              cursor: "pointer", "&:hover": { bgcolor: "#fce4ec" }, transition: "background 0.2s",
            }}
            onClick={() => fileRef.current?.click()}
          >
            <UploadFileIcon sx={{ fontSize: 40, color: "#f48fb1", mb: 1 }} />
            <Typography fontWeight={600} color="#c0005a">
              {file ? file.name : "Clic para seleccionar PDF"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Soporta cualquier PDF — máx 20 MB
            </Typography>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              hidden
              onChange={e => setFile(e.target.files[0] || null)}
            />
          </Box>
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)} disabled={uploading}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={uploading || !form.name.trim() || !file}
            sx={{ bgcolor: "#c0005a", "&:hover": { bgcolor: "#a0004a" } }}
          >
            {uploading ? "Procesando…" : "Subir y configurar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
