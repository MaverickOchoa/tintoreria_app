content = open('frontend/src/components/clinic/ClinicLayout.jsx', encoding='utf-8').read()

# 1. Add useState
content = content.replace(
    'const [pwErr, setPwErr] = useState(null);',
    'const [pwErr, setPwErr] = useState(null);\n  const [stuckAppointments, setStuckAppointments] = useState(0);\n  const [stuckModalOpen, setStuckModalOpen] = useState(false);'
)

# 2. Add fetchStuck to the existing useEffect
fetch_stuck = """
    const fetchStuck = async () => {
      try {
        const r = await fetch(`${CLINIC_API}/clinic/appointments/stuck`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` }
        });
        if (r.ok) {
          const d = await r.json();
          setStuckAppointments(d.appointments?.length || 0);
        }
      } catch (err) {}
    };
    fetchStuck();
    const interval = setInterval(fetchStuck, 5 * 60 * 1000);
"""

content = content.replace(
    'const apiUrl = import.meta.env.VITE_CLINIC_API_URL || import.meta.env.VITE_API_URL || "";',
    f'const apiUrl = import.meta.env.VITE_CLINIC_API_URL || import.meta.env.VITE_API_URL || "";\n{fetch_stuck}'
)

content = content.replace(
    '.finally(() => setThemeLoading(false));\n  }, [claims.business_id, token, setThemeConfig]);',
    '.finally(() => setThemeLoading(false));\n    return () => clearInterval(interval);\n  }, [claims.business_id, token, setThemeConfig]);'
)

open('frontend/src/components/clinic/ClinicLayout.jsx', 'w', encoding='utf-8').write(content)
