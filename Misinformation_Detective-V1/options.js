const DEFAULT_SETTINGS = {
  serperKey: '',
  openrouterKey: '',
  autoScanState: 'enabled',
  charLimit: 200
};

// Populate layout values on open
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(DEFAULT_SETTINGS, (items) => {
    document.getElementById('serperKey').value = items.serperKey;
    document.getElementById('openrouterKey').value = items.openrouterKey;
    document.getElementById('autoScanState').value = items.autoScanState;
    document.getElementById('charLimit').value = items.charLimit;
  });
});

// Auto-save setting shifts
const settingIds = ['serperKey', 'openrouterKey', 'autoScanState', 'charLimit'];
settingIds.forEach(elementId => {
  const element = document.getElementById(elementId);
  if (element) {
    element.addEventListener('change', () => {
      chrome.storage.local.set({ [elementId]: element.value.trim() }, () => {
        showFeedbackToast();
      });
    });
  }
});

function showFeedbackToast() {
  const status = document.getElementById('status');
  status.textContent = 'Settings saved.';
  setTimeout(() => { status.textContent = ''; }, 1500);
}

// =========================================================================
// INTERACTIVE RUNTIME LOGIC FOR THE MANUAL TERMINAL PANEL
// =========================================================================
document.getElementById('runManualScanBtn').addEventListener('click', async () => {
  const inputField = document.getElementById('manualInput');
  const scanButton = document.getElementById('runManualScanBtn');
  const resultPanel = document.getElementById('manual-result');
  const verdictDiv = document.getElementById('result-verdict');
  const summaryDiv = document.getElementById('result-summary');

  const textToAnalyze = inputField.value.trim();
  if (!textToAnalyze || textToAnalyze.length < 5) {
    alert("Please provide a longer text statement or info query to judge.");
    return;
  }

  // Set loading states
  scanButton.disabled = true;
  scanButton.textContent = "Analyzing Context...";
  resultPanel.style.display = "none";

  // Dispatch text parsing request down to background service workers
  chrome.runtime.sendMessage({ action: "verifyClaim", claim: textToAnalyze }, (response) => {
    scanButton.disabled = false;
    scanButton.textContent = "Analyze Target Info";

    if (response && !response.error) {
      // Clear out previous styling classes cleanly
      verdictDiv.className = "verdict-box";
      
      // Match styling to clean token formats (replace space with underscores safely)
      const sanitizedClass = dataSanitizer(response.verdict);
      verdictDiv.classList.add(`verdict-${sanitizedClass}`);
      
      verdictDiv.textContent = `Verdict: ${response.verdict} (${response.trueRatio}% True / ${response.falseRatio}% False)`;
      summaryDiv.textContent = response.summary;
      resultPanel.style.display = "block";
    } else {
      alert(`Pipeline Scan Error: ${response?.error || "Unknown Failure"}`);
    }
  });
});

function dataSanitizer(str) {
  return str ? str.replace(/\s+/g, '_') : 'Neutral';
}