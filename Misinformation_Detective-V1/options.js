// =========================================================================
// 1. SETTINGS MANAGEMENT (AUTO-SAVE)
// =========================================================================

// Save preferences to chrome.storage.local
function saveOptions() {
  const serperKey = document.getElementById('serperKey').value.trim();
  const autoScanState = document.getElementById('autoScanState').value;
  const charLimit = document.getElementById('charLimit').value;
  const status = document.getElementById('status');

  chrome.storage.local.set({
    serperKey: serperKey,
    autoScanState: autoScanState,
    charLimit: charLimit
  }, () => {
    status.textContent = 'Configuration saved securely.';
    status.style.color = '#4ade80';
    setTimeout(() => { status.textContent = ''; }, 2000);
  });
}

// Restore saved settings when page loads
function restoreOptions() {
  chrome.storage.local.get({
    serperKey: '',
    autoScanState: 'enabled',
    charLimit: 180
  }, (items) => {
    document.getElementById('serperKey').value = items.serperKey;
    document.getElementById('autoScanState').value = items.autoScanState;
    document.getElementById('charLimit').value = items.charLimit;
  });
}

// =========================================================================
// 2. LIVE FACT-CHECK TERMINAL LOGIC (ROUTING TO OLLAMA PORT 8080)
// =========================================================================
async function runManualExecution() {
  const manualInput = document.getElementById('manualInput').value.trim();
  const resultPanel = document.getElementById('manual-result');
  const verdictBox = document.getElementById('result-verdict');
  const summaryBox = document.getElementById('result-summary');
  const scanBtn = document.getElementById('runManualScanBtn');

  if (!manualInput) return;

  // UI Loading State
  scanBtn.disabled = true;
  scanBtn.textContent = "Executing Local Analysis...";
  resultPanel.style.display = "block";
  verdictBox.className = "verdict-box"; // Reset classes
  verdictBox.textContent = "PENDING";
  summaryBox.textContent = "Querying local language model weights...";

  try {
    // 1. Ask background.js to grab live search evidence first
    // This reuses the exact pipeline you already built!
    chrome.runtime.sendMessage({ action: "verifyClaim", claim: manualInput }, (response) => {
      
      scanBtn.disabled = false;
      scanBtn.textContent = "Analyze Target Info";

      if (!response || response.error) {
        verdictBox.textContent = "ERROR";
        verdictBox.classList.add('verdict-Mostly_False');
        summaryBox.textContent = response?.error || "Failed to communicate with the background engine worker.";
        return;
      }

      // 2. Render the clean JSON response from Ollama
      // Sanitize the verdict string format to match your CSS classes (e.g., Mostly True -> Mostly_True)
      const sanitizedVerdictClass = response.verdict.replace(" ", "_");
      
      verdictBox.textContent = response.verdict;
      verdictBox.classList.add(`verdict-${sanitizedVerdictClass}`);
      
      // Append metrics if your pipeline includes them
      if (response.trueRatio !== undefined) {
        summaryBox.innerHTML = `<strong>Confidence Metrics:</strong> True: ${response.trueRatio}% | False: ${response.falseRatio}%<br><br>${response.summary}`;
      } else {
        summaryBox.textContent = response.summary;
      }
    });

  } catch (err) {
    scanBtn.disabled = false;
    scanBtn.textContent = "Analyze Target Info";
    verdictBox.textContent = "CRASH";
    summaryBox.textContent = `Execution fault: ${err.message}`;
  }
}

// =========================================================================
// 3. EVENT LISTENERS INITIALIZATION
// =========================================================================
document.addEventListener('DOMContentLoaded', restoreOptions);

// Watch for configuration adjustments to auto-save
document.getElementById('autoScanState').addEventListener('change', saveOptions);
document.getElementById('charLimit').addEventListener('input', saveOptions);
document.getElementById('serperKey').addEventListener('input', saveOptions);

// Trigger the terminal fact check on button click
document.getElementById('runManualScanBtn').addEventListener('click', runManualExecution);