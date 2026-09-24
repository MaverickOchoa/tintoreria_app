import os

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if '/api/v1' in content:
        # Replace occurrences of /api/v1 with nothing (if there's a trailing slash, it will become /)
        # e.g., `${API}/api/v1/colors` -> `${API}/colors`
        # We replace `/api/v1` with empty string because the preceding `${API}` usually doesn't have a trailing slash
        # Actually, if they write `${API}/api/v1/colors`, replacing `/api/v1` gives `${API}/colors`. That's perfect.
        new_content = content.replace('/api/v1', '')
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

frontend_dir = 'frontend/src/components'
changed_files = []

for root, dirs, files in os.walk(frontend_dir):
    for file in files:
        if file.endswith('.jsx') or file.endswith('.js'):
            filepath = os.path.join(root, file)
            if process_file(filepath):
                changed_files.append(filepath)

print(f"Modified {len(changed_files)} files.")
