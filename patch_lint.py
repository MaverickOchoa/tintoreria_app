import re

with open('frontend/src/components/HomeschoolStudentPortal.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'import React, { useState, useEffect } from "react";',
    'import React, { useEffect } from "react";'
)
content = content.replace(
    'import { \n  Container, Typography, Box, AppBar, Toolbar, IconButton, \n  Card, CardContent, Button, Grid\n} from "@mui/material";',
    'import { \n  Container, Typography, Box, AppBar, Toolbar, IconButton, \n  Card, CardContent, Button, Grid\n} from "@mui/material";'
)
# actually, let's just ignore the unused var by fixing the import
content = re.sub(r'import React, \{.*?\} from "react";', 'import React, { useEffect } from "react";', content)

with open('frontend/src/components/HomeschoolStudentPortal.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
