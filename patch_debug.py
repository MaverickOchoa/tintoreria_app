import re

with open('frontend/src/components/HomeschoolDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

debug_fetch = '''
  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("access_token");
      
      // Auto-seed curriculum if empty
      try {
        const seedRes = await fetch(`${API}/homeschool/seed-curriculum`, {
          method: "POST"
        });
        if (!seedRes.ok) {
          const seedErr = await seedRes.text();
          console.error("Seed error:", seedErr);
          setError("Seed Error: " + seedErr);
        }
      } catch (err) {
        console.error("Seed Exception:", err);
        setError("Seed Exception: " + err.message);
      }

      // Fetch Curriculum (Grades)
      const curRes = await fetch(`${API}/homeschool/curriculum`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!curRes.ok) {
        const curErr = await curRes.text();
        setError("Curriculum Error: " + curErr);
        return;
      }
      const curData = await curRes.json();
      setGrades(curData.grades || []);

      // Fetch Students
      const stuRes = await fetch(`${API}/homeschool/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!stuRes.ok) {
        const stuErr = await stuRes.text();
        setError("Students Error: " + stuErr);
        return;
      }
      const stuData = await stuRes.json();
      setStudents(Array.isArray(stuData) ? stuData : []);
    } catch (err) {
      console.error(err);
      setError("Fetch Exception: " + err.message);
    } finally {
      setLoading(false);
    }
  };
'''

# Use regex to replace the fetchData function
content = re.sub(
    r'const fetchData = async \(\) => \{.*?(?=  const handleLogout =)',
    debug_fetch,
    content,
    flags=re.DOTALL
)

with open('frontend/src/components/HomeschoolDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
