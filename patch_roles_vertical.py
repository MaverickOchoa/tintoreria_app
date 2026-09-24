import re

with open('frontend/src/components/EmployeeForm.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'const fetchedRoles = Array\.isArray\(roleData\) \? roleData : \(roleData\.roles \|\| \[\]\);\s+setRoles\(fetchedRoles\.filter\(r => !excluded\.includes\(r\.name\)\)\);'

replacement = '''const fetchedRoles = Array.isArray(roleData) ? roleData : (roleData.roles || []);
          
          // Get business vertical to filter vertical-specific roles
          let verticalType = "laundry";
          try {
            const bizRes = await fetch(`${API_BASE_URL}/businesses/${businessId}`, { headers: { Authorization: `Bearer ${token}` } });
            if (bizRes.ok) {
              const bizData = await bizRes.json();
              verticalType = bizData.vertical_type || "laundry";
            }
          } catch(e) {}
          
          let finalRoles = fetchedRoles.filter(r => !excluded.includes(r.name));
          if (verticalType === "laundry") {
            const clinicRoles = ["Doctor", "doctor", "nurse", "receptionist", "admin"];
            finalRoles = finalRoles.filter(r => !clinicRoles.includes(r.name));
          } else if (verticalType === "clinic") {
            const laundryRoles = ["Colaborador", "Lavador", "Planchador", "Repartidor"];
            finalRoles = finalRoles.filter(r => !laundryRoles.includes(r.name));
          }
          
          setRoles(finalRoles);'''

content = re.sub(pattern, replacement, content)

with open('frontend/src/components/EmployeeForm.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
