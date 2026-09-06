import os, re

src = r'C:\Users\huttm\Desktop\tontoreria2.0\frontend\src'
pattern = re.compile(r'"http://127\.0\.0\.1:5000"|"http://localhost:5000"')
api_const = 'const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";'

fixed = 0
for root, dirs, files in os.walk(src):
    for f in files:
        if not f.endswith('.jsx') and not f.endswith('.js'):
            continue
        path = os.path.join(root, f)
        with open(path, 'r', encoding='utf-8') as fh:
            content = fh.read()
        if '127.0.0.1:5000' not in content and 'localhost:5000' not in content:
            continue
        new = pattern.sub('API', content)
        if new != content:
            # Add const API if not already present
            if 'const API' not in new and 'VITE_API_URL' not in new:
                # Insert after last import line
                lines = new.split('\n')
                last_import = 0
                for i, line in enumerate(lines):
                    if line.startswith('import '):
                        last_import = i
                lines.insert(last_import + 1, '\n' + api_const)
                new = '\n'.join(lines)
            with open(path, 'w', encoding='utf-8') as fh:
                fh.write(new)
            fixed += 1
            print('fixed:', f)

print('total fixed:', fixed)
