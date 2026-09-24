import re

with open('frontend/src/components/CreateOrder.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'''      // Cargar servicios
      fetch\(`\$\{API\}/services`, \{ headers: \{ Authorization: `Bearer \$\{token\}` \} \}\)
        \.then\(r => r\.json\(\)\)
        \.then\(d => setServices\(Array\.isArray\(d\) \? d : \(\(Array\.isArray\(d\) \? d : \(d\.services \|\| \[\]\)\)\)\)\)
        \.catch\(console\.error\);'''

replacement = '''      // Cargar servicios
      fetch(`${API}/services`, { headers: { Authorization: `Bearer ${token}` } })
        .then(async r => {
           const d = await r.json();
           console.log("SERVICES RESPONSE:", r.status, d);
           const svcs = Array.isArray(d) ? d : (d.services || []);
           console.log("PARSED SERVICES:", svcs);
           setServices(svcs);
        })
        .catch(e => console.error("SERVICES FETCH ERROR:", e));'''

content = re.sub(pattern, replacement, content)

with open('frontend/src/components/CreateOrder.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
