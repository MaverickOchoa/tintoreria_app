import re

with open('frontend/src/components/HomeschoolDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix unused choiceResult
content = content.replace('deferredPrompt.userChoice.then((choiceResult) => {', 'deferredPrompt.userChoice.then(() => {')

# Fix duplicate keys
# I'll just restore the <Box sx={{ ... }}> to a clean state.
content = re.sub(
    r'<Box sx=\{\{ bgcolor: "#fffdf5", minHeight: "100vh", pb: 10.*?\}\}>',
    '<Box sx={{ bgcolor: "#fffdf5", minHeight: "100vh", pb: 10 }}>',
    content
)

# And in case it was created via <Box sx={{ minHeight: "100vh", ... }}>
content = re.sub(
    r'<Box sx=\{\{ minHeight: "100vh", bgcolor: "#fffdf5", pb: 10, bgcolor: "#fffdf5", pb: 10 \}\}>',
    '<Box sx={{ minHeight: "100vh", bgcolor: "#fffdf5", pb: 10 }}>',
    content
)

with open('frontend/src/components/HomeschoolDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
