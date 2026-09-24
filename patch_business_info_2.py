import re

with open('frontend/src/components/BusinessInfo.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix handleSave
handleSave_pattern = 'const res = await fetch(`${API}/businesses/${businessId}`, {'
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

body_stringify_pattern = 'body: JSON.stringify({ ...form, address: `${form.street} ${form.ext_num}` }),'
body_stringify_replacement = 'body: JSON.stringify(payload),'
content = content.replace(body_stringify_pattern, body_stringify_replacement)

setSuccess_pattern = '''if (res.ok) {
        setSuccess(true);
      }'''
setSuccess_replacement = '''if (res.ok) {
        if (file) setForm(p => ({ ...p, portal_logo_url: finalLogoUrl }));
        setSuccess(true);
        setFile(null);
      }'''
content = content.replace(setSuccess_pattern, setSuccess_replacement)

with open('frontend/src/components/BusinessInfo.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
