import re

with open('frontend/src/components/BusinessInfo.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add new fields to emptyForm
emptyForm_pattern = r'''const emptyForm = \{
  name: "", phone: "", email: "",
  rfc: "", curp: "", sime: "",
  street: "", ext_num: "", int_num: "",
  colonia: "", zip_code: "", alcaldia: "", city: "",
  regimen_fiscal: "",
  country: "MǸxico",
\};'''

emptyForm_replacement = '''const emptyForm = {
  name: "", phone: "", email: "",
  rfc: "", curp: "", sime: "",
  street: "", ext_num: "", int_num: "",
  colonia: "", zip_code: "", alcaldia: "", city: "",
  regimen_fiscal: "",
  country: "México",
  portal_primary_color: "#1976d2",
  portal_bg_color: "#f5f5f5",
  portal_slogan: "",
  portal_logo_url: "",
};'''

content = content.replace(emptyForm_pattern, emptyForm_replacement)
# Fallback if literal replace fails due to weird encodings:
content = re.sub(
    r'(const emptyForm = \{[\s\S]*?country: "[^"]*",\n)\};',
    r'\1  portal_primary_color: "#1976d2",\n  portal_bg_color: "#f5f5f5",\n  portal_slogan: "",\n  portal_logo_url: "",\n};',
    content
)

# Add CloudUploadIcon avatar and Avatar to imports
imports_pattern = r'''import BusinessIcon from "@mui/icons-material/Business";'''
imports_replacement = '''import BusinessIcon from "@mui/icons-material/Business";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import Avatar from "@mui/material/Avatar";'''
content = content.replace(imports_pattern, imports_replacement)


# Add file state and save logic
state_pattern = r'''const \[success, setSuccess\] = useState\(false\);'''
state_replacement = '''const [success, setSuccess] = useState(false);
  const [file, setFile] = useState(null);'''
content = content.replace(state_pattern, state_replacement)

# Update handleSave to upload logo if there is a file
handleSave_pattern = r'''const res = await fetch\(`\$\{API\}/businesses/\$\{businessId\}`,'''
handleSave_replacement = '''
      let finalLogoUrl = form.portal_logo_url;
      if (file) {
        const logoData = new FormData();
        logoData.append("file", file);
        const logoRes = await fetch(`${API}/businesses/${businessId}/logo`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: logoData
        });
        if (!logoRes.ok) {
          const errData = await logoRes.json().catch(() => ({}));
          throw new Error(`Error al subir logo: ${errData.detail || logoRes.statusText}`);
        }
        const logoJson = await logoRes.json();
        finalLogoUrl = logoJson.logo_url;
      }
      const payload = { ...form, address: `${form.street || ""} ${form.ext_num || ""}`.trim(), portal_logo_url: finalLogoUrl };

      const res = await fetch(`${API}/businesses/${businessId}`, {'''
content = content.replace(handleSave_pattern, handleSave_replacement)

body_stringify_pattern = r'''body: JSON.stringify\(\{ \.\.\.form, address: `\$\{form\.street\} \$\{form\.ext_num\}` \}\),'''
body_stringify_replacement = '''body: JSON.stringify(payload),'''
content = content.replace(body_stringify_pattern, body_stringify_replacement)

setSuccess_pattern = r'''if \(res\.ok\) \{
        setSuccess\(true\);
      \}'''
setSuccess_replacement = '''if (res.ok) {
        if (file) setForm(p => ({ ...p, portal_logo_url: finalLogoUrl }));
        setSuccess(true);
        setFile(null);
      }'''
content = content.replace(setSuccess_pattern, setSuccess_replacement)


# Insert Customization UI section
ui_pattern = r'''<Box display="flex" justifyContent="flex-end" gap={2} mt={4}>'''
ui_replacement = '''
          <Divider sx={{ my: 4 }} />

          <Typography variant="h5" fontWeight={700} mb={1}>Personalización y Portal de Clientes</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Agrega tu logotipo y los colores de tu marca. Esto se mostrará a los clientes cuando entren a su portal de notas.
          </Typography>

          <Grid container spacing={4} alignItems="center" mb={4}>
            <Grid item>
              <Avatar 
                src={file ? URL.createObjectURL(file) : form.portal_logo_url} 
                sx={{ width: 120, height: 120, border: "2px dashed #ccc", bgcolor: "transparent" }}
                variant="rounded"
              >
                {!file && !form.portal_logo_url && <Typography color="text.secondary">Sin Logo</Typography>}
              </Avatar>
            </Grid>
            <Grid item xs>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Sube tu logotipo. Recomendamos formato PNG con fondo transparente.
              </Typography>
              <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />}>
                Elegir Archivo
                <input type="file" hidden accept="image/*" onChange={e => setFile(e.target.files[0])} />
              </Button>
            </Grid>
          </Grid>

          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} sm={4}>
              <TextField 
                fullWidth 
                label="Color Primario (Ej. #1976D2)" 
                value={form.portal_primary_color || ""}
                onChange={handleChange("portal_primary_color")} 
                helperText="Color principal de botones y acentos"
                InputProps={{
                  startAdornment: (
                    <Box sx={{ width: 24, height: 24, borderRadius: 1, bgcolor: form.portal_primary_color, mr: 1, border: "1px solid #ccc" }} />
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField 
                fullWidth 
                label="Color de Fondo (Ej. #F5F5F5)" 
                value={form.portal_bg_color || ""}
                onChange={handleChange("portal_bg_color")} 
                helperText="Color de fondo de la pantalla"
                InputProps={{
                  startAdornment: (
                    <Box sx={{ width: 24, height: 24, borderRadius: 1, bgcolor: form.portal_bg_color, mr: 1, border: "1px solid #ccc" }} />
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField 
                fullWidth 
                label="Eslogan del Negocio" 
                value={form.portal_slogan || ""}
                onChange={handleChange("portal_slogan")} 
                helperText="Aparece debajo del nombre"
              />
            </Grid>
          </Grid>

          <Paper sx={{ p: 3, borderRadius: 2, bgcolor: "#f8f9fa", border: "1px solid #e0e0e0", mb: 3 }}>
            <Typography variant="subtitle1" mb={1} fontWeight={600}>Enlace a tu Portal de Clientes</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Comparte este enlace con tus clientes. Al entrar, verán tu logotipo y colores.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField 
                fullWidth
                size="small"
                value={`${window.location.origin}/#/client-portal?c=${businessId}`}
                InputProps={{ readOnly: true }}
              />
              <Button 
                variant="outlined" 
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/#/client-portal?c=${businessId}`);
                  alert("¡Enlace copiado!");
                }}
              >
                Copiar
              </Button>
            </Box>
          </Paper>

          <Box display="flex" justifyContent="flex-end" gap={2} mt={4}>'''
content = content.replace(ui_pattern, ui_replacement)

with open('frontend/src/components/BusinessInfo.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
