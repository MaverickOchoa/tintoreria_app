import re

with open('frontend/src/main.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

import_pattern = r"import '\./App\.css'"
import_replacement = "import './App.css'\nimport { registerSW } from 'virtual:pwa-register'\n\nregisterSW({ immediate: true })"
content = content.replace(import_pattern, import_replacement)

# Remove the old manual registration
old_sw_logic = '''if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(error => {
      console.log('SW Registration failed: ', error);
    });
  });
}'''
content = content.replace(old_sw_logic, '')

with open('frontend/src/main.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
