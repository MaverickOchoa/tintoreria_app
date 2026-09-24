import re

content = open('frontend/src/components/clinic/ClinicKanban.jsx', encoding='utf-8').read()

# The bad chunk was injected at the end of KanbanColumn.
# KanbanColumn ends around line 150.
# The bad chunk is:
bad_str = """      {recallApt && (
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
</Box>"""

# Replace all occurrences of bad_str
content = content.replace(bad_str, '')

# Now re-add exactly ONE </Box> to the end of KanbanColumn where it was removed/replaced
# KanbanColumn currently looks like:
#         ))}
#     
# 

content = content.replace('        ))}\n      \n    \n', '        ))}\n      </Box>\n    </Box>\n  );\n}\n\n')
# Wait, let's just be exact. 
# We'll re-checkout the file from main and patch it carefully.

