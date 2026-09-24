import re

with open('frontend/src/components/ManageClientConfig.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix logo upload route and key
old_upload = r'''const form = new FormData\(\);
          form\.append\("logo", brandingLogoFile\);
          const logoRes = await fetch\(`\$\{API\}/businesses/\$\{claims\.business_id\}/upload-logo`, \{'''
new_upload = '''const form = new FormData();
          form.append("file", brandingLogoFile);
          const logoRes = await fetch(`${API}/businesses/${claims.business_id}/logo`, {'''
content = re.sub(old_upload, new_upload, content)

# Add custom URL Box above the brandingMsg and Save button
custom_url_section = '''
          <Paper sx={{ p: 2, borderRadius: 2, bgcolor: "#f8f9fa", border: "1px solid #e0e0e0", mt: 3, mb: 2 }}>
            <Typography variant="subtitle2" mb={1} fontWeight={600}>Enlace a tu Portal de Clientes</Typography>
            <Typography variant="body2" color="text.secondary" mb={1.5}>
              Comparte este enlace con tus clientes. Al entrar, verán tu logotipo y colores.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField 
                fullWidth
                size="small"
                value={`${window.location.origin}/#/client-portal?c=${claims.business_id}`}
                InputProps={{ readOnly: true }}
              />
              <Button 
                variant="outlined" 
                size="small"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/#/client-portal?c=${claims.business_id}`);
                  alert("¡Enlace copiado!");
                }}
              >
                Copiar
              </Button>
            </Box>
          </Paper>

          {brandingMsg && <Alert severity={brandingMsg.type} sx={{ mt: 2 }}>{brandingMsg.text}</Alert>}'''

content = content.replace('{brandingMsg && <Alert severity={brandingMsg.type} sx={{ mt: 2 }}>{brandingMsg.text}</Alert>}', custom_url_section)

with open('frontend/src/components/ManageClientConfig.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
