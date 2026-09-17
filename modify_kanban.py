import re
content = open('frontend/src/components/clinic/ClinicKanban.jsx', encoding='utf-8').read()

import_code = '''import { Dialog, DialogTitle, DialogContent, DialogActions, TextField } from "@mui/material";
'''

import_idx = content.find('import {')
if import_idx != -1:
    content = content[:import_idx] + import_code + content[import_idx:]

modal_state = '''  const [recallApt, setRecallApt] = useState(null);
  const [recallDate, setRecallDate] = useState("");
  const [recallReason, setRecallReason] = useState("");
  
  const handleStatusChange = async (aptId, newStatus) => {
    if (newStatus === "Completada") {
      const apt = appointments.find(a => a.id === aptId);
      setRecallDate("");
      setRecallReason("");
      setRecallApt(apt);
      return;
    }
    await executeStatusChange(aptId, newStatus);
  };
  
  const executeStatusChange = async (aptId, newStatus, recallPayload = null) => {
    try {
      const payload = { status: newStatus };
      if (recallPayload) {
        payload.recall_date = recallPayload.date;
        payload.recall_reason = recallPayload.reason;
      }
      await fetch(`${CLINIC_API}/clinic/appointments/${aptId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      setAppointments(prev => prev.map(a => a.id === aptId ? { ...a, status: newStatus } : a));
    } catch (e) { console.error(e); }
  };
'''

old_fn = '''  const handleStatusChange = async (aptId, newStatus) => {
    try {
      await fetch(`${CLINIC_API}/clinic/appointments/${aptId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      setAppointments(prev => prev.map(a => a.id === aptId ? { ...a, status: newStatus } : a));
    } catch {}
  };'''

content = content.replace(old_fn, modal_state)

modal_ui = '''
      {recallApt && (
        <Dialog open={Boolean(recallApt)} onClose={() => { executeStatusChange(recallApt.id, "Completada"); setRecallApt(null); }} maxWidth="xs" fullWidth>
          <DialogTitle>Completar Cita</DialogTitle>
          <DialogContent dividers>
            <Typography variant="body2" mb={2}>La cita se marcará como Completada. ¿Deseas programar un seguimiento (Recall) para este paciente en el futuro?</Typography>
            <TextField
              type="date"
              label="Fecha recomendada (opcional)"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={recallDate}
              onChange={e => setRecallDate(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Motivo del seguimiento (opcional)"
              fullWidth
              placeholder="Ej. Limpieza a los 6 meses"
              value={recallReason}
              onChange={e => setRecallReason(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { executeStatusChange(recallApt.id, "Completada"); setRecallApt(null); }}>Omitir Recall</Button>
            <Button onClick={() => {
              executeStatusChange(recallApt.id, "Completada", recallDate ? { date: recallDate, reason: recallReason } : null);
              setRecallApt(null);
            }} variant="contained" sx={{ bgcolor: "primary.main" }}>
              Guardar y Completar
            </Button>
          </DialogActions>
        </Dialog>
      )}
'''

content = content.replace('</Box>\n    </Box>\n  );\n}', modal_ui + '</Box>\n    </Box>\n  );\n}')
content = content.replace('</Box>\n  );\n}', modal_ui + '</Box>\n  );\n}')

open('frontend/src/components/clinic/ClinicKanban.jsx', 'w', encoding='utf-8').write(content)
