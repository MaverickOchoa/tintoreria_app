import re

with open('frontend/src/components/minigames/CountingGame.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix Banner
alert_target = r'\{message && \(\s*<Alert.*?>\s*\{message\}\s*</Alert>\s*\)\}'
alert_replacement = """{message && (
        <Box 
          sx={{ 
            mb: 3, p: 2, borderRadius: 6, 
            bgcolor: success ? '#fff9c4' : '#ffe0b2', 
            color: success ? '#f57f17' : '#e65100',
            border: `3px dashed ${success ? '#fbc02d' : '#ffb74d'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2,
            boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
          }}
        >
          {success && <StarIcon sx={{ fontSize: 40, color: '#fbc02d' }} />}
          <Typography variant="h5" fontWeight="bold">
            {message}
          </Typography>
          {success && <StarIcon sx={{ fontSize: 40, color: '#fbc02d' }} />}
        </Box>
      )}"""
content = re.sub(alert_target, alert_replacement, content, flags=re.DOTALL)

# 2. Fix Tree Box Size
tree_target = r"minHeight:\s*200,\s*bgcolor:\s*snapshot\.isDraggingOver \? '#c8e6c9' : '#e8f5e9',"
tree_replacement = """height: 380, // Tamaño fijo
                    bgcolor: snapshot.isDraggingOver ? '#c8e6c9' : '#e8f5e9',"""
content = re.sub(tree_target, tree_replacement, content)

# 3. Fix Basket Box Size
basket_target = r"minHeight:\s*200,\s*bgcolor:\s*snapshot\.isDraggingOver \? '#ffe0b2' : '#fff3e0',"
basket_replacement = """height: 380, // Tamaño fijo
                    bgcolor: snapshot.isDraggingOver ? '#ffe0b2' : '#fff3e0',"""
content = re.sub(basket_target, basket_replacement, content)

# 4. Fix Revisar Button (Make it bright green)
btn_target = r'sx=\{\{\s*borderRadius: 8,\s*fontSize: \'1\.5rem\',\s*px: 6,\s*py: 2,\s*fontWeight: \'bold\'\s*\}\}'
btn_replacement = "sx={{ borderRadius: 8, fontSize: '1.5rem', px: 6, py: 2, fontWeight: 'bold', bgcolor: '#66bb6a', color: 'white', '&:hover': { bgcolor: '#4caf50' } }}"
content = re.sub(btn_target, btn_replacement, content)

with open('frontend/src/components/minigames/CountingGame.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
