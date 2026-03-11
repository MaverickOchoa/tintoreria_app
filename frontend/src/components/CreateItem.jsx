import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
// 🚨 Importar componentes de MUI necesarios
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Paper,
  Stack,
  useTheme,
} from "@mui/material";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DashboardIcon from "@mui/icons-material/Dashboard";

// Utility function to capitalize the first letter of each word (Manteniendo tu función original)
const toTitleCase = (str) => {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => {
      if (word.length === 0) return "";
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
};

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

const CreateItem = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    units: 1,
    // 🔑 VALOR RESTAURADO a hardcodeado como el original
    business_id: 1,
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState(null);
  const [categoryName, setCategoryName] = useState("Cargando...");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // Estado para el botón

  useEffect(() => {
    const fetchCategoryName = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem("access_token");
        if (!token)
          throw new Error("No se encontró el token de autenticación.");

        const response = await fetch(
          `${API}/categories/${categoryId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!response.ok)
          throw new Error("No se pudo obtener el nombre de la categoría.");

        const data = await response.json();
        setCategoryName(data.name);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategoryName();
  }, [categoryId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const formattedValue = name === "name" ? toTitleCase(value) : value;

    setFormData((prevState) => ({
      ...prevState,
      [name]: formattedValue,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError(null);
    setIsSubmitting(true);

    // Validación
    const price = parseFloat(formData.price);
    const units = parseInt(formData.units, 10);

    if (isNaN(price) || isNaN(units)) {
      setError("El precio y las unidades deben ser números válidos.");
      setIsSubmitting(false);
      return;
    }

    const itemData = {
      name: formData.name,
      price: price,
      units: units,
      business_id: formData.business_id,
    };

    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("No se encontró el token de autenticación.");

      const response = await fetch(
        `${API}/categories/${categoryId}/items`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(itemData),
        }
      );

      const data = await response.json();

      if (!response.ok)
        throw new Error(data.message || "Error al crear el artículo.");

      setMessage("Artículo creado exitosamente. Redirigiendo...");

      // Lógica de redirección original
      setTimeout(() => {
        navigate(`/manage-items/${categoryId}`);
      }, 800);
    } catch (err) {
      setError(err.message);
      setMessage("");
    } finally {
      // isSubmitting solo se limpia al navegar, si no hay error
    }
  };

  return (
    // 🚨 CORRECCIÓN: Usamos Container y Paper como envoltorios correctos
    <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={4} sx={{ p: 4, borderRadius: 2 }}>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          align="center"
          sx={{ mb: 1, color: "primary.main", fontWeight: 700 }}
        >
          Crear Artículo
        </Typography>

        <Typography
          variant="subtitle1"
          align="center"
          color="text.secondary"
          sx={{ mb: 4 }}
        >
          en la Categoría:
          <Typography
            component="span"
            sx={{ fontWeight: 600, color: "secondary.main", ml: 0.5 }}
          >
            {isLoading ? (
              <CircularProgress size={14} sx={{ verticalAlign: "middle" }} />
            ) : (
              categoryName
            )}
          </Typography>
        </Typography>

        {message && !isSubmitting && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {message}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="Nombre del Artículo"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              size="medium"
              variant="outlined"
              disabled={isSubmitting}
            />

            <Stack direction="row" spacing={2}>
              <TextField
                fullWidth
                label="Precio"
                type="number"
                name="price"
                step="0.01"
                value={formData.price}
                onChange={handleChange}
                required
                size="medium"
                variant="outlined"
                disabled={isSubmitting}
              />
              <TextField
                fullWidth
                label="Unidades"
                type="number"
                name="units"
                value={formData.units}
                onChange={handleChange}
                required
                size="medium"
                variant="outlined"
                disabled={isSubmitting}
              />
            </Stack>
          </Box>

          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isSubmitting}
            startIcon={
              isSubmitting ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <AddShoppingCartIcon />
              )
            }
            sx={{ width: "100%", mt: 4 }}
          >
            {isSubmitting ? "Creando Artículo..." : "Crear Artículo"}
          </Button>
        </form>
      </Paper>

      {/* --- GRUPO DE BOTONES DE NAVEGACIÓN INFERIOR --- */}
      <Box
        className="button-group-bottom"
        sx={{ mt: 3, display: "flex", justifyContent: "space-between", gap: 2 }}
      >
        {/* Botón 1: Regresar */}
        <Button
          onClick={() => navigate(-1)}
          variant="text"
          color="secondary"
          startIcon={<ArrowBackIcon />}
          disabled={isSubmitting}
        >
          Regresar
        </Button>

        {/* Botón 2: Volver al Dashboard (Ruta Super Admin RESTAURADA) */}
        <Button
          onClick={() => navigate("/super-admin-dashboard")}
          variant="text"
          color="secondary"
          startIcon={<DashboardIcon />}
          disabled={isSubmitting}
        >
          Volver al Dashboard
        </Button>
      </Box>
    </Container>
  );
};

export default CreateItem;
