import re

with open('frontend/src/components/HomeschoolDashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add the Button to the imports if missing (it shouldn't be, but CardActions might be missing)
content = content.replace(
  'Avatar, LinearProgress, AppBar, Toolbar, Menu, MenuItem as MuiMenuItem, Fade',
  'Avatar, LinearProgress, AppBar, Toolbar, Menu, MenuItem as MuiMenuItem, Fade, CardActions'
)

# Add the button to the student card
card_content_regex = r'(<CardContent>.*?<Typography variant="body2" color="text\.secondary" sx=\{\{ mt: 2 \}\}>.*?Idioma: \{student\.bilingual_preference\}.*?</Typography>.*?</Box>.*?</CardContent>)'

new_card_content = r'\1\n                  <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>\n                    <Button \n                      variant="contained" \n                      fullWidth \n                      color="secondary"\n                      onClick={() => navigate(`/homeschool/student/${student.id}`)}\n                      sx={{ borderRadius: 2, fontWeight: "bold" }}\n                    >\n                      Entrar al Aula\n                    </Button>\n                  </CardActions>'

content = re.sub(card_content_regex, new_card_content, content, flags=re.DOTALL)

with open('frontend/src/components/HomeschoolDashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
