// =========================================================================
// 1. MESSAGING PORT LISTENERS (WAKES UP PER PAGE VERIFICATION)
// =========================================================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "verifyClaim") {
    
    // Dynamically retrieve the Serper key saved via the dashboard
    chrome.storage.local.get({ serperKey: '' }, (keys) => {
      
      // Safety Intercept: Block outbound calls if user hasn't supplied the Serper search key
      if (!keys.serperKey) {
        console.warn("AI Judge Notice: Missing Serper API credentials inside Extension Options.");
        sendResponse({ error: "Missing Serper API configuration key." });
        return;
      }

      executeVerificationPipeline(request.claim, keys.serperKey)
        .then((analysisResult) => {
          sendResponse(analysisResult);
        })
        .catch((error) => {
          console.error("Background Engine Failure:", error);
          sendResponse({ error: error.message });
        });
    });

    return true; // Keep communication port open for asynchronous resolution
  }
});

// =========================================================================
// 2. MAIN PIPELINE EXECUTION HUB
// =========================================================================
async function executeVerificationPipeline(claim, serperKey) {
  const searchResults = await fetchLiveSearchEvidence(claim, serperKey);
  const finalVerdict = await consultLocalAIJudge(claim, searchResults);
  return finalVerdict;
}

// =========================================================================
// 3. SERPER.DEV SEARCH ENGINE FETCH LAYER
// =========================================================================
async function fetchLiveSearchEvidence(query, apiKey) {
  let currentKey = apiKey;
  if (!currentKey) {
    const data = await chrome.storage.local.get("serperKey");
    currentKey = data.serperKey;
  }

  if (!currentKey || currentKey.trim() === "") {
    currentKey = "PASTE_YOUR_ACTUAL_SERPER_KEY_HERE"; 
  }

  const sanitizedQuery = String(query).replace(/[\u201c\u201d\u2018\u2019]/g, '"');

  const fetchOptions = {
    method: "POST",
    mode: "cors",
    credentials: "omit",
    headers: {
      "X-API-KEY": currentKey.trim(),
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      q: sanitizedQuery
    })
  };

  try {
    const response = await fetch("https://google.serper.dev/search", fetchOptions);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`🕵️‍♂️ Serper Server responded with status ${response.status}:`, errorText);
      throw new Error(`Serper search failed with status ${response.status}.`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("🕵️‍♂️ Network error inside background.js:", error);
    throw new Error(`Google Web Search failed: ${error.message}`);
  }
}

// =========================================================================
// 4. OLLAMA LOCAL LLM PROMPT & JSON COMPLIANCE LAYER (PORT 7777)
// =========================================================================
async function consultLocalAIJudge(claim, context) {
  try {
    const systemPrompt = `You are an objective, elite AI Fact-Checking Magistrate.
Analyze the user's claim against the provided search engine snippet context.
You MUST respond with a valid, raw JSON object matching this structure exactly, with no markdown formatting and no extra text:
{
  "verdict": "Mostly True",
  "trueRatio": 80,
  "falseRatio": 20,
  "summary": "Your 2 to 3 sentence empirical reasoning goes here."
}`;

    const userPrompt = `Claim to evaluate: "${claim}"\n\nEvidence Context:\n${JSON.stringify(context, null, 2)}`;
    
    // Explicitly merge structural framing parameters for the generation payload
    const unifiedPrompt = `${systemPrompt}\n\n${userPrompt}`;
// Inside background.js -> consultLocalAIJudge
const compactContext = typeof context === "string" 
  ? context.substring(0, 1500) // Keep input text footprint light!
  : JSON.stringify(context).substring(0, 1500);

const response = await fetch('http://127.0.0.1:8181/api/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'llama3.2:1b', // 👈 Swapped from 8B to the high-speed 3B parameter model
    prompt: `${systemPrompt}\n\nClaim: ${claim}\n\nContext: ${compactContext}`,
    stream: false, // Keep false for clean JSON parsing, but the 3B model makes this instant
    format: 'json',
    options: {
      temperature: 0.1,
      num_predict: 150 // Stop the model from rambling out long answers
    }
  }),
});

    if (!response.ok) {
      throw new Error(`Ollama engine dropped request with status code: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data || typeof data.response === 'undefined') {
      throw new Error("Target model response text wrapper property definition missing.");
    }

    const rawOutputText = data.response.trim(); 
    console.log("🕵️‍♂️ Ollama Raw Content Output:", rawOutputText);
    
    return JSON.parse(rawOutputText);

  } catch (err) {
    console.error("🔴 Local AI Engine failure:", err);
    throw new Error(`Local AI Engine verification failure: ${err.message}`);
  }
}

// =========================================================================
// 5. TOOLBAR ICON CLICK ROUTER (OPENS OPTIONS IMMEDIATELY)
// =========================================================================
chrome.action.onClicked.addListener((tab) => {
  chrome.runtime.openOptionsPage(() => {
    if (chrome.runtime.lastError) {
      console.error("Failed to open options page:", chrome.runtime.lastError.message);
    }
  });
});