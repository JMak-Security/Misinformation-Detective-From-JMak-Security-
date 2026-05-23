// =========================================================================
// 1. MESSAGING PORT LISTENERS (WAKES UP PER PAGE VERIFICATION)
// =========================================================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "verifyClaim") {
    
    // Dynamically retrieve the keys saved via the options dashboard
    chrome.storage.local.get({ serperKey: '', openrouterKey: '' }, (keys) => {
      
      // Safety Intercept: Block outbound calls if user hasn't supplied keys yet
      if (!keys.serperKey || !keys.openrouterKey) {
        console.warn("AI Judge Notice: Missing API credentials inside Extension Options.");
        sendResponse({ error: "Missing API configuration keys." });
        return;
      }

      // Execute search query and AI compilation pipelines sequentially
      executeVerificationPipeline(request.claim, keys.serperKey, keys.openrouterKey)
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
async function executeVerificationPipeline(claim, serperKey, openrouterKey) {
  const searchResults = await fetchLiveSearchEvidence(claim, serperKey);
  const finalVerdict = await consultAIJudge(claim, searchResults, openrouterKey);
  return finalVerdict;
}

// =========================================================================
// 3. SERPER.DEV SEARCH ENGINE FETCH LAYER
// =========================================================================
async function fetchLiveSearchEvidence(query, apiKey) {
  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, num: 4 }),
    });

    if (!response.ok) {
      throw new Error(`Serper API returned HTTP status ${response.status}`);
    }

    const data = await response.json();
    return data.organic?.map(item => ({
      title: item.title,
      snippet: item.snippet,
      link: item.link
    })) || [];

  } catch (err) {
    throw new Error(`Google Web Search failed: ${err.message}`);
  }
}

// =========================================================================
// 4. OPENROUTER FREE LLM PROMPT COMPLIANCE LAYER
// =========================================================================
async function consultAIJudge(claim, context, apiKey) {
  try {
    const systemPrompt = `
      You are an objective, elite AI Fact-Checking Magistrate. 
      Analyze the user's claim against the provided search engine snippet context.
      You must respond strictly in valid JSON matching this schema:
      {
        "verdict": "Mostly True" | "Partially True" | "Partially False" | "Mostly False",
        "trueRatio": number, 
        "falseRatio": number,
        "summary": "2 to 3 sentences detailing your empirical reasoning based on the source texts."
      }
      Do not include markdown code block wrappers (like \`\`\`json) or text outside the JSON object block.
    `;

    const userPrompt = `Claim to evaluate: "${claim}"\n\nEvidence Context:\n${JSON.stringify(context, null, 2)}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://localhost', 
        'X-OpenRouter-Title': 'AI Fact Checking Extension'
      },
      body: JSON.stringify({
        model: 'openrouter/free', 
        response_format: { type: "json_object" }, 
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API returned HTTP status ${response.status}`);
    }

    const data = await response.json();
    let rawOutputText = data.choices[0].message.content.trim();
    
    if (rawOutputText.startsWith("```")) {
      rawOutputText = rawOutputText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    }
    
    return JSON.parse(rawOutputText);

  } catch (err) {
    throw new Error(`AI Engine verification failure: ${err.message}`);
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