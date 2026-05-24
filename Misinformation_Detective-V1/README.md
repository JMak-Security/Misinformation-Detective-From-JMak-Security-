# Release v1.0.0 · Misinformation Detective-v1

This is the initial stable release of **[Misinformation Detective-v1]**, a privacy-first, decentralized Chrome extension framework built to act as an immediate factual shield against online disinformation.

---

## 🛠️ What's New in v1.0.0

* **Live Automated Scanning:** Background text extraction that safely captures webpage headlines and prepares them for context evaluation.
* **On-Demand Fact-Check Terminal:** An interactive, glassmorphic UI terminal allowing users to manually paste custom claims or text blocks for instant verification.
* **Decentralized BYOK Engine:** Full integration with `chrome.storage.local`, allowing users to securely input their own Serper and OpenRouter keys—completely eliminating centralized server tracking and hosting overhead.
* **AI-Assisted Optimization:** Highly optimized system prompts that force low-temperature, structured JSON schemas from open-source LLMs to prevent user interface anomalies.

---

## ⚠️ PRECAUTIONS & USAGE NOTICE

* **API Quota Management:** Because this extension connects directly to your live Serper and OpenRouter developer endpoints, frequent automated browsing may consume your provider account's free tiers or daily credits.
* **Key Safety:** Your API tokens are isolated entirely within your local browser sandbox. They are never transmitted to, viewed by, or managed by us. Keep your personal keys confidential.

---

### ⏱️ Performance Note for Reviewers
Because this extension runs 100% locally on your computer to protect data privacy, the processing speed depends directly on your device's hardware hardware (CPU/GPU). 
- On a high-performance system, the local AI Judge analyzes and responds within a few seconds. 
- On standard hardware configurations, it can take up to 1-2 minutes to fully generate the structured truth score metrics. 
- For presentation smoothness, the video demonstration was trimmed to highlight the target UI layout and functional workflow.

---

## 📋 Local Installation & Deployment

To load this extension framework into your browser:

1. Download the release source code zip and extract it.
2. Head to `chrome://extensions/` in Google Chrome.
3. Toggle on **Developer mode** in the top right.
4. Click **Load unpacked** in the top left and select your extracted folder.

Please review the **Disclaimer** and **License (MIT)** files in the root folder before configuring your keys.
