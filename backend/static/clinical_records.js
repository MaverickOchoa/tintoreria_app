// clinical_records.js - Handles PDF upload and list display
document.addEventListener('DOMContentLoaded', () => {
  const uploadBtn = document.getElementById('uploadBtn');
  const pdfInput = document.getElementById('pdfFile');
  const statusEl = document.getElementById('uploadStatus');
  const recordsList = document.getElementById('recordsList');

  const token = localStorage.getItem('access_token'); // Adjust per your auth storage

  const apiBase = '/api/clinical-records';

  const showMessage = (msg, isError = false) => {
    statusEl.textContent = msg;
    statusEl.style.color = isError ? 'red' : 'green';
  };

  const loadRecords = async () => {
    recordsList.innerHTML = '';
    try {
      const resp = await fetch(apiBase, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error('Error fetching records');
      const data = await resp.json();
      data.records.forEach(r => {
        const li = document.createElement('li');
        const nameSpan = document.createElement('span');
        nameSpan.textContent = r.name;
        const dlLink = document.createElement('a');
        dlLink.href = `${apiBase}/${r.id}/download`;
        dlLink.className = 'download-link';
        dlLink.textContent = 'Descargar';
        dlLink.setAttribute('target', '_blank');
        li.appendChild(nameSpan);
        li.appendChild(dlLink);
        recordsList.appendChild(li);
      });
    } catch (e) {
      showMessage(e.message, true);
    }
  };

  uploadBtn.addEventListener('click', async () => {
    if (!pdfInput.files.length) {
      showMessage('Selecciona un archivo PDF.', true);
      return;
    }
    const file = pdfInput.files[0];
    const formData = new FormData();
    formData.append('file', file);
    try {
      const resp = await fetch(`${apiBase}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.message || 'Upload failed');
      showMessage('Archivo subido correctamente.');
      pdfInput.value = '';
      loadRecords();
    } catch (e) {
      showMessage(e.message, true);
    }
  });

  loadRecords();
});
