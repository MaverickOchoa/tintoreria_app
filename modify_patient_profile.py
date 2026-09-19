import re
content = open('frontend/src/components/clinic/ClinicPatientProfile.jsx', encoding='utf-8').read()

import_code = 'import ClinicalFormFiller from "./ClinicalFormFiller";\n'
content = import_code + content

content = content.replace(
    'const [records, setRecords] = useState([]);',
    'const [records, setRecords] = useState([]);\n  const [formEntries, setFormEntries] = useState([]);\n  const [formFillerOpen, setFormFillerOpen] = useState(false);\n  const [selectedEntryId, setSelectedEntryId] = useState(null);'
)

fetch_original = '''      Promise.all([
        safe(fetch(`${CLINIC_API}/clinic/patients/${patientId}`, { headers })),
        safe(fetch(`${CLINIC_API}/clinic/patients/${patientId}/records`, { headers })),
        safe(fetch(`${CLINIC_API}/clinic/appointments?patient_id=${patientId}`, { headers })),
      ]).then(([p, rec, apt]) => {
        setPatient(p?.id ? p : null);
        setRecords(rec.records || []);
        setAppointments(apt.appointments || []);
      }).finally(() => setLoading(false));'''

fetch_new = '''      const loadData = () => {
        Promise.all([
          safe(fetch(`${CLINIC_API}/clinic/patients/${patientId}`, { headers })),
          safe(fetch(`${CLINIC_API}/clinic/clinical-form-entries?patient_id=${patientId}`, { headers })),
          safe(fetch(`${CLINIC_API}/clinic/appointments?patient_id=${patientId}`, { headers })),
        ]).then(([p, forms, apt]) => {
          setPatient(p?.id ? p : null);
          setFormEntries(forms || []);
          setAppointments(apt.appointments || []);
        }).finally(() => setLoading(false));
      };
      loadData();'''

content = content.replace(fetch_original, fetch_new)

# Remove the old UI section
start_str = '{/* Clinical records */}'
end_str = '{/* Appointments list */}'

start_idx = content.find(start_str)
end_idx = content.find(end_str)

ui_new = '''{/* Clinical records */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
              <Typography fontWeight={700} fontSize={15}>
                Hojas Clínicas ({formEntries.length})
              </Typography>
              <Button size="small" variant="contained" onClick={() => { setSelectedEntryId(null); setFormFillerOpen(true); }} sx={{ bgcolor: "primary.main", textTransform: "none" }}>+ Nueva Hoja</Button>
            </Box>
            
            {formEntries.length === 0 ? (
              <Paper elevation={0} sx={{ border: "1px dashed #e0e0e0", borderRadius: 3, p: 3, textAlign: "center" }}>
                <Typography color="text.secondary" fontSize={13}>Sin hojas clínicas registradas</Typography>
              </Paper>
            ) : (
              formEntries.map(entry => {
                const fmData = typeof entry.form_data === 'string' ? JSON.parse(entry.form_data || '{}') : (entry.form_data || {});
                return (
                <Accordion key={entry.id} disableGutters elevation={0} sx={{
                  border: "1px solid #e8eaed", borderRadius: "8px !important",
                  mb: 1, "&:before": { display: "none" }
                }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
                      <Typography fontSize={13} fontWeight={700}>
                        {new Date(entry.created_at).toLocaleDateString("es-MX", { dateStyle: "long" })}
                      </Typography>
                      <Chip label={entry.status === 'final' ? 'Completada' : 'Borrador'} size="small" sx={{ fontSize: 11, bgcolor: entry.status === 'final' ? "#e6f4ea" : "#fff3e0", color: entry.status === 'final' ? "#1e8e3e" : "#e67c73" }} />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0, pb: 2, px: 2 }}>
                    <Box sx={{ p: 2, bgcolor: "#f8f9fa", borderRadius: 2 }}>
                      {Object.keys(fmData).map(k => (
                        <Box key={k} mb={1}>
                          <Typography variant="caption" color="text.secondary">{k}</Typography>
                          <Typography variant="body2" fontWeight={500}>{String(fmData[k])}</Typography>
                        </Box>
                      ))}
                      <Box mt={2}>
                        <Button size="small" variant="outlined" onClick={() => { setSelectedEntryId(entry.id); setFormFillerOpen(true); }}>Ver / Editar</Button>
                      </Box>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              )})
            )}

            {/* Modals */}
            {formFillerOpen && (
              <ClinicalFormFiller 
                open={formFillerOpen} 
                onClose={() => setFormFillerOpen(false)} 
                token={token} 
                patientId={patientId} 
                entryId={selectedEntryId}
                onSaved={() => {
                  window.location.reload();
                }} 
              />
            )}
            <br />
            '''

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + ui_new + content[end_idx:]

open('frontend/src/components/clinic/ClinicPatientProfile.jsx', 'w', encoding='utf-8').write(content)
