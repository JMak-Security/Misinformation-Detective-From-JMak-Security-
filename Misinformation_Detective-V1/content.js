beginAnalysis();

async function beginAnalysis() {
  // Pull settings from local extension storage with our adjusted schema parameters
  chrome.storage.local.get({ autoScanState: 'enabled', charLimit: 200 }, async (settings) => {
    
    // EXPLICIT CHECK: If automated page scanning option is disabled, sleep
    if (settings.autoScanState === 'disabled') return;

    const pageTitle = document.title;
    const mainHeadline = document.querySelector('h1')?.innerText || '';
    
    let claimToVerify = mainHeadline.length > 20 ? mainHeadline : pageTitle;
    if (!claimToVerify || claimToVerify.length < 15) return;

    // Truncate locally
    const absoluteMaxCharacters = parseInt(settings.charLimit, 10);
    if (claimToVerify.length > absoluteMaxCharacters) {
      claimToVerify = claimToVerify.substring(0, absoluteMaxCharacters).trim() + "...";
    }

    createJudgeWidget();

    try {
      const response = await chrome.runtime.sendMessage({
        action: "verifyClaim",
        claim: claimToVerify
      });

      if (response && !response.error) {
        updateJudgeWidget(response);
      } else {
        displayErrorInWidget(response.error || "Verification failed.");
      }
    } catch (err) {
      console.error("AI Judge execution failed:", err);
      removeJudgeWidget();
    }
  });
}

function createJudgeWidget() {
  if (document.getElementById('ai-judge-badge')) return;
  const widget = document.createElement('div');
  widget.id = 'ai-judge-badge';
  widget.innerHTML = `
    <div class="ai-judge-header"><span class="ai-judge-title">AI Judge</span></div>
    <div id="ai-judge-status">Analyzing facts...</div>
  `;
  document.body.appendChild(widget);
}

function updateJudgeWidget(data) {
  const widget = document.getElementById('ai-judge-badge');
  if (!widget) return;

  let colorClass = 'verdict-neutral';
  if (data.verdict === 'Mostly True') colorClass = 'verdict-true';
  if (data.verdict === 'Partially True' || data.verdict === 'Partially False') colorClass = 'verdict-mixed';
  if (data.verdict === 'Mostly False') colorClass = 'verdict-false';

  widget.innerHTML = `
    <div class="ai-judge-header">
      <span class="ai-judge-title">AI Judge Verdict</span>
      <span class="ai-judge-close" id="ai-judge-close-btn">×</span>
    </div>
    <div class="ai-judge-verdict ${colorClass}">${data.verdict}</div>
    <div class="ai-judge-meter-container">
      <div class="ai-judge-meter" style="width: ${data.trueRatio}%;"></div>
    </div>
    <div class="ai-judge-ratio">True: ${data.trueRatio}% | False: ${data.falseRatio}%</div>
    <div class="ai-judge-summary">${data.summary}</div>
  `;
  document.getElementById('ai-judge-close-btn').addEventListener('click', removeJudgeWidget);
}

function displayErrorInWidget(errorMessage) {
  const widget = document.getElementById('ai-judge-badge');
  if (!widget) return;

  widget.innerHTML = `
    <div class="ai-judge-header">
      <span class="ai-judge-title">AI Judge Error</span>
      <span class="ai-judge-close" id="ai-judge-close-btn">×</span>
    </div>
    <div class="ai-judge-summary" style="color: #ef4444; font-weight: 600;">${errorMessage}</div>
  `;
  document.getElementById('ai-judge-close-btn').addEventListener('click', removeJudgeWidget);
}

function removeJudgeWidget() {
  document.getElementById('ai-judge-badge')?.remove();
}