with open('frontend/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '<meta name="apple-mobile-web-app-capable" content="yes">',
    '<meta name="mobile-web-app-capable" content="yes">\n    <meta name="apple-mobile-web-app-capable" content="yes">'
)

with open('frontend/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
