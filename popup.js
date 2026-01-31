document.addEventListener('DOMContentLoaded', () => {
  const exportBtn = document.getElementById('exportBtn');
  const status = document.getElementById('status');
  const progressContainer = document.getElementById('progressContainer');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');

  function setStatus(message, type) {
    status.textContent = message;
    status.className = type;
  }

  function setProgress(text, percent = null) {
    progressContainer.classList.add('active');
    progressText.textContent = text;
    if (percent !== null) {
      progressFill.style.width = `${percent}%`;
    }
  }

  function resetUI() {
    exportBtn.disabled = false;
    exportBtn.innerHTML = '<span class="icon">⬇️</span><span class="text">Export All Pages</span>';
    progressContainer.classList.remove('active');
    progressFill.style.width = '0%';
  }

  function setLoading(isLoading) {
    exportBtn.disabled = isLoading;
    if (isLoading) {
      exportBtn.innerHTML = '<span class="spinner"></span><span class="text">Exporting...</span>';
    } else {
      exportBtn.innerHTML = '<span class="icon">⬇️</span><span class="text">Export All Pages</span>';
    }
  }

  exportBtn.addEventListener('click', async () => {
    setLoading(true);
    setStatus('', '');
    setProgress('Starting export...', 10);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        throw new Error('No active tab found');
      }

      setProgress('Connecting to page...', 20);

      chrome.tabs.sendMessage(
        tab.id,
        { action: 'startExport' },
        (response) => {
          if (chrome.runtime.lastError) {
            resetUI();
            setStatus('Error: Could not connect to page. Please refresh and try again.', 'error');
            return;
          }

          if (response && response.success) {
            setProgress('Export complete!', 100);
            setStatus(`✅ Exported ${response.totalRows} rows from ${response.totalPages} page(s)`, 'success');
            setTimeout(resetUI, 2000);
          } else if (response && response.error) {
            resetUI();
            setStatus(`❌ ${response.error}`, 'error');
          } else {
            resetUI();
            setStatus('❌ Unknown error occurred', 'error');
          }
        }
      );

      chrome.runtime.onMessage.addListener((message) => {
        if (message.action === 'progress') {
          const percent = Math.min(20 + (message.page / Math.max(message.totalPages, 1)) * 70, 90);
          setProgress(`Processing page ${message.page}... (${message.rowsCollected} rows)`, percent);
        }
      });

    } catch (error) {
      resetUI();
      setStatus(`❌ ${error.message}`, 'error');
    }
  });
});
