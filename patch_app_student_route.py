import re

with open('frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
import_statement = 'import HomeschoolDashboard from "./components/HomeschoolDashboard";\nimport HomeschoolStudentPortal from "./components/HomeschoolStudentPortal";'
content = content.replace('import HomeschoolDashboard from "./components/HomeschoolDashboard";', import_statement)

# Add route
route_statement = '<Route path="/homeschool" element={<HomeschoolDashboard />} />\n              <Route path="/homeschool/student/:studentId" element={<HomeschoolStudentPortal />} />'
content = content.replace('<Route path="/homeschool" element={<HomeschoolDashboard />} />', route_statement)

with open('frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
