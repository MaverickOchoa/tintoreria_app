import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Typography, Paper, Grid, Button, TextField, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Chip, CircularProgress, Alert,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

const CATEGORIES = {
  quimicos: {
    label: "Químicos / Solventes",
    color: "#ef5350",
    items: ["Percloroetileno", "Solvente verde", "Removedor de manchas", "Pretratamiento", "Otro"],
  },
  detergentes: {
    label: "Detergentes",
    color: "#ab47bc",
    items: ["Detergente industrial", "Suavizante", "Almidón", "Abrillantador", "Otro"],
  },
  consumibles: {
    label: "Consumibles",
    color: "#42a5f5",
    items: ["Bolsas plásticas", "Ganchos / perchas", "Etiquetas", "Papel para recibos", "Otro"],
  },
  utilities: {
    label: "Servicios / Utilities",
    color: "#26a69a",
    items: ["Gas", "Energía eléctrica", "Agua", "Otro"],
  },
  otros: {
    label: "Otros",
    color: "#78909c",
    items: ["Otro"],
  },
};

const UNITS = ["kg", "L", "g", "ml", "pzas", "rollos", "paquetes", "kWh", "m³", "galones"];

const today = () => new Date().toISOString().split("T")[0];

const fmtCurrency = (v) =>
  Number(v).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

export default function Expenses() {
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");
  const role = localStorage.getItem("role");
  const branchIdStored = localStorage.getItem("branch_id");

  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState({
    branch_id: branchIdStored || "",
    expense_date: today(),
    category: "quimicos",
    item_name: "",
    custom_item: "",
    quantity: "",
    unit: "pzas",
    unit_cost: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState(false);

  const [expenses, setExpenses] = useState([]);
  const [expTotal, setExpTotal] = useState(0);
  const [expSum, setExpSum] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;

  const [filterCat, setFilterCat] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const [editDialog, setEditDialog] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [categorySums, setCategorySums] = useState({});

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const loadBranches = useCallback(async () => {
    try {
      const claims = JSON.parse(atob(token.split(".")[1]));
      const bizId = claims.business_id;
      const r = await fetch(`${API}/businesses/${bizId}/branches`, { headers });
      if (r.ok) setBranches(await r.json());
    } catch {}
  }, [token]);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        ...(filterCat && { category: filterCat }),
        ...(filterFrom && { date_from: filterFrom }),
        ...(filterTo && { date_to: filterTo }),
        ...(role === "branch_manager" && branchIdStored && { branch_id: branchIdStored }),
      });
      const r = await fetch(`${API}/api/v1/expenses?${params}`, { headers });
      if (r.ok) {
        const d = await r.json();
        setExpenses(d.items);
        setExpTotal(d.total);
        setExpSum(d.sum_total_cost);
      }
    } catch {}
    setLoading(false);
  }, [page, filterCat, filterFrom, filterTo, token, role, branchIdStored]);

  const loadCategorySums = useCallback(async () => {
    try {
      const now = new Date();
      const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const to = today();
      const params = new URLSearchParams({ date_from: from, date_to: to });
      if (role === "branch_manager" && branchIdStored) params.set("branch_id", branchIdStored);
      const r = await fetch(`${API}/api/v1/reports/expenses-summary?${params}`, { headers });
      if (r.ok) {
        const d = await r.json();
        const map = {};
        d.data.forEach((row) => { map[row.category] = row.total; });
        setCategorySums(map);
      }
    } catch {}
  }, [token, role, branchIdStored]);

  useEffect(() => { loadBranches(); loadCategorySums(); }, []);
  useEffect(() => { loadExpenses(); }, [page, filterCat, filterFrom, filterTo]);

  const handleFormChange = (field, value) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "category") {
        updated.item_name = "";
        updated.custom_item = "";
      }
      return updated;
    });
  };

  const handleSubmit = async () => {
    setSaveError("");
    const itemName = form.item_name === "Otro" ? form.custom_item : form.item_name;
    if (!form.branch_id || !form.expense_date || !form.category || !itemName || !form.quantity || !form.unit_cost) {
      setSaveError("Completa todos los campos obligatorios.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        branch_id: Number(form.branch_id),
        expense_date: form.expense_date,
        category: form.category,
        item_name: itemName,
        quantity: Number(form.quantity),
        unit: form.unit,
        unit_cost: Number(form.unit_cost),
        notes: form.notes,
      };
      const r = await fetch(`${API}/api/v1/expenses`, { method: "POST", headers, body: JSON.stringify(body) });
      if (r.ok) {
        setSaveOk(true);
        setForm((prev) => ({ ...prev, quantity: "", unit_cost: "", notes: "", item_name: "", custom_item: "" }));
        setTimeout(() => setSaveOk(false), 3000);
        loadExpenses();
        loadCategorySums();
      } else {
        const d = await r.json();
        setSaveError(d.message || "Error al guardar");
      }
    } catch (e) {
      setSaveError("Error de conexión");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    try {
      const r = await fetch(`${API}/api/v1/expenses/${deleteDialog.id}`, { method: "DELETE", headers });
      if (r.ok) { setDeleteDialog(null); loadExpenses(); loadCategorySums(); }
    } catch {}
  };

  const handleEdit = async () => {
    if (!editDialog) return;
    try {
      const itemName = editDialog.item_name === "Otro" ? editDialog.custom_item : editDialog.item_name;
      const body = { ...editDialog, item_name: itemName };
      const r = await fetch(`${API}/api/v1/expenses/${editDialog.id}`, {
        method: "PUT", headers, body: JSON.stringify(body),
      });
      if (r.ok) { setEditDialog(null); loadExpenses(); loadCategorySums(); }
    } catch {}
  };

  const computedTotal = Number(form.quantity || 0) * Number(form.unit_cost || 0);
  const catItems = CATEGORIES[form.category]?.items || [];

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: "auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
        <IconButton onClick={() => navigate(-1)} size="small"><ArrowBackIcon /></IconButton>
        <Typography variant="h5" fontWeight={700}>Gastos e Insumos</Typography>
      </Box>

      {/* Category summary cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Object.entries(CATEGORIES).map(([key, cat]) => (
          <Grid key={key} size={{ xs: 6, sm: 4, md: 2.4 }}>
            <Paper sx={{ p: 2, borderLeft: `4px solid ${cat.color}`, borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary">{cat.label}</Typography>
              <Typography variant="h6" fontWeight={700} color={cat.color}>
                {fmtCurrency(categorySums[key] || 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">Este mes</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Form */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Registrar Gasto</Typography>
        <Grid container spacing={2}>
          {role !== "branch_manager" && (
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField select fullWidth label="Sucursal *" size="small"
                value={form.branch_id} onChange={(e) => handleFormChange("branch_id", e.target.value)}>
                {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
              </TextField>
            </Grid>
          )}
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <TextField fullWidth label="Fecha *" type="date" size="small" InputLabelProps={{ shrink: true }}
              value={form.expense_date} onChange={(e) => handleFormChange("expense_date", e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2 }}>
            <TextField select fullWidth label="Categoría *" size="small"
              value={form.category} onChange={(e) => handleFormChange("category", e.target.value)}>
              {Object.entries(CATEGORIES).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField select fullWidth label="Insumo *" size="small"
              value={form.item_name} onChange={(e) => handleFormChange("item_name", e.target.value)}>
              {catItems.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
            </TextField>
          </Grid>
          {form.item_name === "Otro" && (
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField fullWidth label="Nombre del insumo *" size="small"
                value={form.custom_item} onChange={(e) => handleFormChange("custom_item", e.target.value)} />
            </Grid>
          )}
          <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
            <TextField fullWidth label="Cantidad *" type="number" size="small" inputProps={{ min: 0, step: "0.001" }}
              value={form.quantity} onChange={(e) => handleFormChange("quantity", e.target.value)} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3, md: 1.5 }}>
            <TextField select fullWidth label="Unidad" size="small"
              value={form.unit} onChange={(e) => handleFormChange("unit", e.target.value)}>
              {UNITS.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <TextField fullWidth label="Costo/unidad *" type="number" size="small" inputProps={{ min: 0, step: "0.01" }}
              value={form.unit_cost} onChange={(e) => handleFormChange("unit_cost", e.target.value)} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <Paper variant="outlined" sx={{ p: 1, textAlign: "center", borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">Total calculado</Typography>
              <Typography variant="subtitle2" fontWeight={700} color="primary">
                {fmtCurrency(computedTotal)}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField fullWidth label="Notas (opcional)" size="small" multiline rows={1}
              value={form.notes} onChange={(e) => handleFormChange("notes", e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, md: 2 }} sx={{ display: "flex", alignItems: "center" }}>
            <Button fullWidth variant="contained" startIcon={<AddIcon />} onClick={handleSubmit} disabled={saving}>
              {saving ? <CircularProgress size={20} /> : "Registrar"}
            </Button>
          </Grid>
        </Grid>
        {saveError && <Alert severity="error" sx={{ mt: 2 }}>{saveError}</Alert>}
        {saveOk && <Alert severity="success" sx={{ mt: 2 }}>Gasto registrado correctamente.</Alert>}
      </Paper>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, sm: 4, md: 3 }}>
            <TextField select fullWidth label="Categoría" size="small" value={filterCat}
              onChange={(e) => { setFilterCat(e.target.value); setPage(0); }}>
              <MenuItem value="">Todas</MenuItem>
              {Object.entries(CATEGORIES).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <TextField fullWidth label="Desde" type="date" size="small" InputLabelProps={{ shrink: true }}
              value={filterFrom} onChange={(e) => { setFilterFrom(e.target.value); setPage(0); }} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <TextField fullWidth label="Hasta" type="date" size="small" InputLabelProps={{ shrink: true }}
              value={filterTo} onChange={(e) => { setFilterTo(e.target.value); setPage(0); }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4, md: 3 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Total filtrado: <strong>{fmtCurrency(expSum)}</strong> ({expTotal} registros)
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: "center" }}><CircularProgress /></Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                <TableCell>Fecha</TableCell>
                <TableCell>Categoría</TableCell>
                <TableCell>Insumo</TableCell>
                <TableCell align="right">Cant.</TableCell>
                <TableCell>Unidad</TableCell>
                <TableCell align="right">Costo/u</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell>Notas</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    Sin registros
                  </TableCell>
                </TableRow>
              ) : expenses.map((e) => (
                <TableRow key={e.id} hover>
                  <TableCell>{e.expense_date}</TableCell>
                  <TableCell>
                    <Chip label={CATEGORIES[e.category]?.label || e.category} size="small"
                      sx={{ bgcolor: CATEGORIES[e.category]?.color + "22", color: CATEGORIES[e.category]?.color, fontWeight: 600 }} />
                  </TableCell>
                  <TableCell>{e.item_name}</TableCell>
                  <TableCell align="right">{Number(e.quantity).toLocaleString()}</TableCell>
                  <TableCell>{e.unit}</TableCell>
                  <TableCell align="right">{fmtCurrency(e.unit_cost)}</TableCell>
                  <TableCell align="right"><strong>{fmtCurrency(e.total_cost)}</strong></TableCell>
                  <TableCell sx={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.notes || "—"}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" color="primary"
                      onClick={() => setEditDialog({ ...e, custom_item: "" })}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => setDeleteDialog(e)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* Pagination */}
      {expTotal > PAGE_SIZE && (
        <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mt: 2 }}>
          <Button disabled={page === 0} onClick={() => setPage((p) => p - 1)} variant="outlined" size="small">Anterior</Button>
          <Typography variant="body2" sx={{ alignSelf: "center" }}>
            Página {page + 1} de {Math.ceil(expTotal / PAGE_SIZE)}
          </Typography>
          <Button disabled={(page + 1) * PAGE_SIZE >= expTotal} onClick={() => setPage((p) => p + 1)} variant="outlined" size="small">Siguiente</Button>
        </Box>
      )}

      {/* Edit Dialog */}
      {editDialog && (
        <Dialog open onClose={() => setEditDialog(null)} maxWidth="sm" fullWidth>
          <DialogTitle>Editar Gasto</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Fecha" type="date" size="small" InputLabelProps={{ shrink: true }}
                  value={editDialog.expense_date}
                  onChange={(e) => setEditDialog((d) => ({ ...d, expense_date: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select fullWidth label="Categoría" size="small" value={editDialog.category}
                  onChange={(e) => setEditDialog((d) => ({ ...d, category: e.target.value }))}>
                  {Object.entries(CATEGORIES).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth label="Insumo" size="small" value={editDialog.item_name}
                  onChange={(e) => setEditDialog((d) => ({ ...d, item_name: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField fullWidth label="Cantidad" type="number" size="small" value={editDialog.quantity}
                  onChange={(e) => setEditDialog((d) => ({ ...d, quantity: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField select fullWidth label="Unidad" size="small" value={editDialog.unit}
                  onChange={(e) => setEditDialog((d) => ({ ...d, unit: e.target.value }))}>
                  {UNITS.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField fullWidth label="Costo/unidad" type="number" size="small" value={editDialog.unit_cost}
                  onChange={(e) => setEditDialog((d) => ({ ...d, unit_cost: e.target.value }))} />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="body2" sx={{ pt: 1 }}>
                  Total: <strong>{fmtCurrency(Number(editDialog.quantity) * Number(editDialog.unit_cost))}</strong>
                </Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth label="Notas" size="small" multiline rows={2} value={editDialog.notes || ""}
                  onChange={(e) => setEditDialog((d) => ({ ...d, notes: e.target.value }))} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialog(null)}>Cancelar</Button>
            <Button variant="contained" onClick={handleEdit}>Guardar</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Delete Confirm */}
      {deleteDialog && (
        <Dialog open onClose={() => setDeleteDialog(null)}>
          <DialogTitle>Confirmar eliminación</DialogTitle>
          <DialogContent>
            <Typography>¿Eliminar el gasto de <strong>{deleteDialog.item_name}</strong> por {fmtCurrency(deleteDialog.total_cost)}?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog(null)}>Cancelar</Button>
            <Button variant="contained" color="error" onClick={handleDelete}>Eliminar</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
