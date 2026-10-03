import re

with open('frontend/src/components/HomeschoolStudentPortal.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'import { \n  Container, Typography, Box, AppBar, Toolbar, IconButton, \n  Card, CardContent, Button, Grid\n} from "@mui/material";',
    'import { Container, Typography, Box, AppBar, Toolbar, IconButton } from "@mui/material";'
)
content = content.replace(
    'import ExtensionIcon from "@mui/icons-material/Extension";',
    ''
)

with open('frontend/src/components/HomeschoolStudentPortal.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
