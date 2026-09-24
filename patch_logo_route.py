with open('frontend/src/components/ManageClientConfig.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('form.append("logo", brandingLogoFile);', 'form.append("file", brandingLogoFile);')
content = content.replace('/upload-logo`, {', '/logo`, {')

with open('frontend/src/components/ManageClientConfig.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
