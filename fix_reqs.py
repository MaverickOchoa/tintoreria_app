with open('platform/requirements.txt', 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

clean_lines = []
for line in lines:
    line = line.strip().replace('\x00', '')
    if line and not line.startswith('p y t h o n'):
        clean_lines.append(line)

if 'python-dateutil' not in clean_lines:
    clean_lines.append('python-dateutil')

with open('platform/requirements.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(clean_lines) + '\n')
