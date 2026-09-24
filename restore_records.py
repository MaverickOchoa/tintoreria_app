import re

content = open('frontend/src/components/clinic/ClinicPatientProfile.jsx', encoding='utf-8').read()

# Put it back
target = '  const [appointments, setAppointments] = useState([]);'
replacement = '  const [records, setRecords] = useState([]);\n' + target

content = content.replace(target, replacement)

open('frontend/src/components/clinic/ClinicPatientProfile.jsx', 'w', encoding='utf-8').write(content)
