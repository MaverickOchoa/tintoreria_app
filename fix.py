import re

content = open('frontend/src/components/clinic/ClinicLayout.jsx', encoding='utf-8').read()

# Add stuckAppointments state
content = content.replace(
    'const [brandInfo, setBrandInfo] = useState({ name: "Zentro Clinic", logo: null });',
    'const [brandInfo, setBrandInfo] = useState({ name: "Zentro Clinic", logo: null });\n  const [stuckAppointments, setStuckAppointments] = useState(0);\n  const [stuckModalOpen, setStuckModalOpen] = useState(false);'
)

# Add fetchStuck inside useEffect
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

content = content.replace('fetchBrand();\n  }, []);', f'fetchBrand();{fetch_stuck}\n    return () => clearInterval(interval);\n  }}, []);')

# Add Alert and Modal
alert_code = """
          {stuckAppointments > 0 && (
            <Alert 
              severity="warning" 
              sx={{ m: 2, cursor: "pointer", borderRadius: 2 }}
              onClick={() => setStuckModalOpen(true)}
            >
              Tienes {stuckAppointments} cita{stuckAppointments > 1 ? "s" : ""} de días anteriores sin finalizar (en espera, consulta, etc). Por favor revísalas y márcalas como Completadas o Canceladas para liberar tu tablero.
            </Alert>
          )}
          <Outlet"""

content = content.replace('<Outlet', alert_code)

modal_code = """
      <ClinicStuckAppointmentsModal 
        open={stuckModalOpen} 
        onClose={() => setStuckModalOpen(false)} 
        token={token} 
        onResolved={() => {
          setStuckAppointments(prev => Math.max(0, prev - 1));
        }} 
      />
"""

content = content.replace('</Box>\n    </Box>\n  );\n}', f'</Box>\n{modal_code}\n    </Box>\n  );\n}}')

content = 'import ClinicStuckAppointmentsModal from "./ClinicStuckAppointmentsModal";\n' + content

open('frontend/src/components/clinic/ClinicLayout.jsx', 'w', encoding='utf-8').write(content)
