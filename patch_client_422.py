import re

with open('frontend/src/components/CreateClient.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'''      } else \{
        setResponse\(\{ success: false, message: data\.message \|\| "Error al registrar el cliente\." \}\);
      \}'''

replacement = '''      } else {
        const detailStr = data.detail ? (Array.isArray(data.detail) ? JSON.stringify(data.detail) : data.detail) : "";
        setResponse({ success: false, message: data.message || detailStr || "Error al registrar el cliente." });
      }'''

content = re.sub(pattern, replacement, content)

with open('frontend/src/components/CreateClient.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
