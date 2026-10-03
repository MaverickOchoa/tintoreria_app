import re

with open('frontend/src/components/HomeschoolDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. State for formData (add gender)
content = content.replace(
    'bilingual_preference: "es"',
    'bilingual_preference: "es",\n    gender: ""'
)

# 2. Add Install App state and logic
install_logic = """  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        setDeferredPrompt(null);
      });
    }
  };

  useEffect(() => {"""
content = content.replace('  useEffect(() => {\n    fetchData();', install_logic + '\n    fetchData();')

# 3. Add Install App button and fix Header
header_target = r'<Button \s*variant="contained" \s*startIcon=\{<AddIcon />\} \s*onClick=\{\(\) => setOpen\(true\)\}\s*size="large"\s*sx=\{\{ borderRadius: 6, bgcolor: "#29b6f6", fontWeight: "bold", \'&:hover\': \{ bgcolor: \'#039be5\' \} \}\}\s*>\s*Nuevo Alumno\s*</Button>'

header_replacement = """<Box display="flex" gap={2}>
          {deferredPrompt && (
            <Button 
              variant="outlined" 
              onClick={handleInstallClick}
              size="large"
              sx={{ borderRadius: 6, fontWeight: "bold", color: "#ff7043", borderColor: "#ff7043", '&:hover': { bgcolor: '#fff3e0' } }}
            >
              Instalar App 📱
            </Button>
          )}
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={() => setOpen(true)}
            size="large"
            sx={{ borderRadius: 6, bgcolor: "#29b6f6", fontWeight: "bold", '&:hover': { bgcolor: '#039be5' } }}
          >
            Nuevo Alumno
          </Button>
        </Box>"""
content = re.sub(header_target, header_replacement, content, flags=re.DOTALL)

# 4. Form Field (Gender)
form_target = r'<TextField\s*select\s*label="Preferencia de Idioma"'
form_replacement = """<TextField
                select
                label="¿Es niño o niña?"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                fullWidth
                required
              >
                <MenuItem value="boy">Niño 👦</MenuItem>
                <MenuItem value="girl">Niña 👧</MenuItem>
              </TextField>

              <TextField
                select
                label="Preferencia de Idioma" """
content = re.sub(form_target, form_replacement, content)

# 5. Avatar color customization based on gender
avatar_target = r'<Avatar sx=\{\{ bgcolor: \'#ab47bc\', mr: 2, width: 64, height: 64, fontSize: \'2rem\', fontWeight: \'bold\' \}\}>'
avatar_replacement = """<Avatar sx={{ 
                      bgcolor: student.gender === 'girl' ? '#ec407a' : (student.gender === 'boy' ? '#29b6f6' : '#ab47bc'), 
                      mr: 2, width: 64, height: 64, fontSize: '2rem', fontWeight: 'bold' 
                    }}>"""
content = re.sub(avatar_target, avatar_replacement, content)

with open('frontend/src/components/HomeschoolDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
