/**
 * MOBI AI Voice Search Agent — Main Client Controller
 * Real Voice Capture, Real-Time SSE Response Streaming, and Conversational Context
 */

import { ClientSpeechService } from "./speechService.js";

// DOM Elements
const micBtn = document.getElementById("micBtn");
const micOrbContainer = document.querySelector(".mic-orb-container");
const voiceStateBadge = document.getElementById("voiceStateBadge");
const micControlsGroup = document.getElementById("micControlsGroup");
const stopMicBtn = document.getElementById("stopMicBtn");
const cancelMicBtn = document.getElementById("cancelMicBtn");
const liveTranscriptBox = document.getElementById("liveTranscriptBox");
const liveTranscriptText = document.getElementById("liveTranscriptText");
const languageSelect = document.getElementById("languageSelect");
const ttsToggleBtn = document.getElementById("ttsToggleBtn");
const connectionStatus = document.getElementById("connectionStatus");
const conversationContainer = document.getElementById("conversationContainer");
const textInputForm = document.getElementById("textInputForm");
const queryInput = document.getElementById("queryInput");
const sendBtn = document.getElementById("sendBtn");
const clearConvoBtn = document.getElementById("clearConvoBtn");
const toastNotification = document.getElementById("toastNotification");
const toastMessage = document.getElementById("toastMessage");
const toastCloseBtn = document.getElementById("toastCloseBtn");

// Speech Service Instance
const speechService = new ClientSpeechService();

// Session Memory State
let currentSessionId = getOrCreateSessionId();
let userLocation = null;
let isProcessingTurn = false;
let currentLanguage = languageSelect.value || "en-IN";

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  initGeolocation();
  initEventListeners();
  checkBackendStatus();
});

function getOrCreateSessionId() {
  let id = sessionStorage.getItem("mobi_session_id");
  if (!id) {
    id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem("mobi_session_id", id);
  }
  return id;
}

/**
 * Check backend configuration and status
 */
async function checkBackendStatus() {
  try {
    const res = await fetch("/api/mobi/status");
    const data = await res.json();
    if (data.status === "ok") {
      updateConnectionStatus(true, "Ready");
    }
  } catch (err) {
    console.warn("Backend status check failed:", err);
    updateConnectionStatus(false, "Offline");
  }
}

function updateConnectionStatus(online, labelText) {
  const statusLabel = connectionStatus.querySelector(".status-label");
  if (online) {
    connectionStatus.className = "status-pill online";
    statusLabel.textContent = labelText || "Ready";
  } else {
    connectionStatus.className = "status-pill offline";
    statusLabel.textContent = labelText || "Offline";
  }
}

/**
 * Request real GPS coordinates for location-grounded nearby bus search
 */
function initGeolocation() {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userLocation = {
          latitude: Number(pos.coords.latitude.toFixed(4)),
          longitude: Number(pos.coords.longitude.toFixed(4))
        };
        console.log("Acquired real user GPS coordinates:", userLocation);
      },
      (err) => {
        console.log("Geolocation not active or denied (defaulting to central coordinates if needed):", err.message);
      },
      { timeout: 8000 }
    );
  }
}

/**
 * Attach UI event listeners
 */
function initEventListeners() {
  // Mic Button Click
  micBtn.addEventListener("click", () => {
    if (speechService.isListeningActive) {
      speechService.stopListening();
    } else {
      startVoiceSearch();
    }
  });

  // Voice Action Controls
  stopMicBtn.addEventListener("click", () => {
    speechService.stopListening();
  });

  cancelMicBtn.addEventListener("click", () => {
    speechService.cancelListening();
    setVoiceState("idle", "Ask MOBI");
    hideLiveTranscript();
  });

  // Language Change
  languageSelect.addEventListener("change", (e) => {
    currentLanguage = e.target.value;
    speechService.setLanguage(currentLanguage);
  });

  // TTS Toggle
  ttsToggleBtn.addEventListener("click", () => {
    speechService.ttsEnabled = !speechService.ttsEnabled;
    const iconOn = ttsToggleBtn.querySelector(".icon-speaker-on");
    const iconOff = ttsToggleBtn.querySelector(".icon-speaker-off");
    if (speechService.ttsEnabled) {
      ttsToggleBtn.classList.add("active");
      iconOn.classList.remove("hidden");
      iconOff.classList.add("hidden");
    } else {
      ttsToggleBtn.classList.remove("active");
      iconOn.classList.add("hidden");
      iconOff.classList.remove("hidden");
      speechService.stopSpeaking();
    }
  });

  // Text Input Submission (Shares exact same AI pipeline)
  textInputForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = queryInput.value.trim();
    if (!query || isProcessingTurn) return;
    queryInput.value = "";
    executeMobiQuery(query);
  });

  // Quick Prompt Chips
  document.querySelectorAll(".prompt-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const query = chip.getAttribute("data-query");
      if (query && !isProcessingTurn) {
        executeMobiQuery(query);
      }
    });
  });

  // Clear Conversation History
  clearConvoBtn.addEventListener("click", () => {
    currentSessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem("mobi_session_id", currentSessionId);
    conversationContainer.innerHTML = `
      <div class="chat-message mobi-message">
        <div class="message-avatar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="22"/>
          </svg>
        </div>
        <div class="message-bubble">
          <div class="message-sender">MOBI</div>
          <div class="message-text">Conversation reset. How can I help you find buses today?</div>
        </div>
      </div>
    `;
    setVoiceState("idle", "Ask MOBI");
  });

  // Toast Close
  toastCloseBtn.addEventListener("click", hideToast);
}

/**
 * Start real microphone capture and speech recognition
 */
function startVoiceSearch() {
  if (isProcessingTurn) return;

  setVoiceState("listening", "Listening...");
  showLiveTranscript("Listening for your voice...");

  speechService.startListening({
    onStart: () => {
      setVoiceState("listening", "Listening...");
      micControlsGroup.classList.remove("hidden");
    },
    onInterim: (text) => {
      showLiveTranscript(text);
    },
    onResult: (finalTranscript) => {
      hideLiveTranscript();
      micControlsGroup.classList.add("hidden");
      if (finalTranscript && finalTranscript.trim()) {
        executeMobiQuery(finalTranscript.trim());
      } else {
        setVoiceState("idle", "Ask MOBI");
      }
    },
    onError: (err) => {
      console.warn("Speech error:", err);
      micControlsGroup.classList.add("hidden");
      setVoiceState("error", "Try again");
      showToast(err.message || "Microphone or speech recognition error.");
      setTimeout(() => {
        setVoiceState("idle", "Ask MOBI");
      }, 3000);
    },
    onEnd: ({ finalTranscript } = {}) => {
      micControlsGroup.classList.add("hidden");
      if (!finalTranscript && !isProcessingTurn) {
        setVoiceState("idle", "Ask MOBI");
        hideLiveTranscript();
      }
    }
  });
}

/**
 * Execute query through real AI backend with Server-Sent Events (SSE) streaming
 */
async function executeMobiQuery(queryText) {
  if (!queryText || isProcessingTurn) return;
  isProcessingTurn = true;

  // 1. Render User Message in conversation stream
  appendUserMessage(queryText);

  // 2. Render initial MOBI turn with jumping dots typing indicator
  const mobiTurn = createMobiMessageTurn();
  scrollToBottom();

  // 3. Set Voice State to Processing (real operation started)
  setVoiceState("processing", "Understanding...");

  try {
    const response = await fetch("/api/mobi/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: queryText,
        sessionId: currentSessionId,
        userLocation,
        language: currentLanguage
      })
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.message || `Server responded with status ${response.status}`);
    }

    // 4. Stream Server-Sent Events (SSE)
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedText = "";
    let executedTools = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const raw = line.slice(6).trim();
          if (!raw) continue;

          try {
            const event = JSON.parse(raw);

            // Real status transition events from backend
            if (event.type === "status") {
              if (event.status === "searching") {
                setVoiceState("searching", "Searching...");
              } else if (event.status === "responding") {
                setVoiceState("responding", "MOBI is responding...");
              } else if (event.status === "processing") {
                setVoiceState("processing", "Understanding...");
              }
            }

            // Real tool execution result
            if (event.type === "tool_result") {
              if (event.result && event.result.results) {
                executedTools.push(event.result);
              }
            }

            // Streaming text deltas
            if (event.type === "delta" && event.text) {
              setVoiceState("responding", "MOBI is responding...");
              accumulatedText += event.text;
              updateMobiResponseText(mobiTurn, accumulatedText);
            }

            // Completed event
            if (event.type === "done") {
              accumulatedText = event.fullText || accumulatedText;
              updateMobiResponseText(mobiTurn, accumulatedText);

              // Render transit card widgets if tools returned structured bus results
              if (event.tools && event.tools.length > 0) {
                renderTransitCards(mobiTurn.cardsContainer, event.tools);
              }

              // Speak response using real native speech synthesis
              speechService.speakText(accumulatedText, {
                onStart: () => setVoiceState("responding", "Speaking..."),
                onEnd: () => setVoiceState("idle", "Ask MOBI")
              });
            }

            // Error event
            if (event.type === "error") {
              setVoiceState("error", "Error");
              updateMobiResponseText(mobiTurn, `⚠️ **Error:** ${event.message}`);
              showToast(event.message);
            }
          } catch (parseErr) {
            console.error("Error parsing SSE event:", parseErr, raw);
          }
        }
      }
    }
  } catch (err) {
    console.error("Query execution error:", err);
    setVoiceState("error", "Something went wrong. Try again.");
    updateMobiResponseText(mobiTurn, `⚠️ **Connection Error:** ${err.message}. Please check your connection and retry.`);
    showToast(err.message || "Failed to contact MOBI AI service.");
  } finally {
    isProcessingTurn = false;
    setTimeout(() => {
      if (!speechService.isListeningActive && window.speechSynthesis && !window.speechSynthesis.speaking) {
        setVoiceState("idle", "Ask MOBI");
      }
    }, 1500);
  }
}

/**
 * State Transition Handler (Updates mic orb and state badge)
 */
function setVoiceState(state, label) {
  voiceStateBadge.className = `state-badge ${state}`;
  voiceStateBadge.textContent = label;

  if (state === "listening") {
    micOrbContainer.classList.add("listening");
  } else {
    micOrbContainer.classList.remove("listening");
  }
}

function showLiveTranscript(text) {
  liveTranscriptBox.classList.remove("hidden");
  liveTranscriptText.textContent = text;
}

function hideLiveTranscript() {
  liveTranscriptBox.classList.add("hidden");
}

function appendUserMessage(text) {
  const msgEl = document.createElement("div");
  msgEl.className = "chat-message user-message";
  msgEl.innerHTML = `
    <div class="message-avatar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    </div>
    <div class="message-bubble">
      <div class="message-sender">You</div>
      <div class="message-text">${escapeHtml(text)}</div>
    </div>
  `;
  conversationContainer.appendChild(msgEl);
  scrollToBottom();
}

function createMobiMessageTurn() {
  const msgEl = document.createElement("div");
  msgEl.className = "chat-message mobi-message";

  msgEl.innerHTML = `
    <div class="message-avatar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="22"/>
      </svg>
    </div>
    <div class="message-bubble">
      <div class="message-sender">
        <span>MOBI</span>
        <button class="speak-msg-btn hidden" title="Read aloud" aria-label="Speak message">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
          </svg>
        </button>
      </div>
      <div class="message-text">
        <div class="typing-indicator" aria-label="Thinking">
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
        </div>
      </div>
      <div class="cards-container"></div>
    </div>
  `;

  conversationContainer.appendChild(msgEl);
  return {
    wrapper: msgEl,
    bubbleText: msgEl.querySelector(".message-text"),
    cardsContainer: msgEl.querySelector(".cards-container"),
    speakBtn: msgEl.querySelector(".speak-msg-btn")
  };
}

function updateMobiResponseText(turn, text) {
  if (!turn || !turn.bubbleText) return;
  if (!text || !text.trim()) {
    turn.bubbleText.innerHTML = `
      <div class="typing-indicator" aria-label="Thinking">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    `;
    return;
  }

  turn.bubbleText.innerHTML = formatMarkdownText(text);

  if (turn.speakBtn) {
    turn.speakBtn.classList.remove("hidden");
    turn.speakBtn.onclick = () => speechService.speakText(text);
  }

  scrollToBottom();
}

/**
 * Render structured cards for bus search results
 */
function renderTransitCards(container, tools) {
  if (!container || !tools || tools.length === 0) return;

  for (const tool of tools) {
    const result = tool.result;
    if (!result) continue;

    // Route search results
    if (result.results && Array.isArray(result.results) && result.results.length > 0) {
      const grid = document.createElement("div");
      grid.className = "transit-results-grid";

      result.results.slice(0, 3).forEach((route) => {
        const card = document.createElement("div");
        card.className = "transit-card";

        const liveVehicle = route.liveVehicles?.[0];
        const etaText = liveVehicle ? `Live ETA: ${liveVehicle.etaMinutes}m` : `Every ${route.frequencyMinutes}m`;

        card.innerHTML = `
          <div class="transit-card-top">
            <span class="route-pill">${escapeHtml(route.routeNumber)}</span>
            <span class="eta-badge">${escapeHtml(etaText)}</span>
          </div>
          <div class="transit-card-body">
            <strong>${escapeHtml(route.name)}</strong>
            <div style="font-size: 11px; margin-top: 2px;">Via: ${escapeHtml(route.via)}</div>
          </div>
          <div class="transit-card-meta">
            <span class="meta-chip">Fare: ${escapeHtml(route.fareRange)}</span>
            <span class="meta-chip">${escapeHtml(route.type)}</span>
            ${liveVehicle ? `<span class="meta-chip">Near: ${escapeHtml(liveVehicle.currentLocation)}</span>` : ""}
          </div>
        `;
        grid.appendChild(card);
      });

      container.appendChild(grid);
    }

    // Nearby bus stops results
    if (result.stops && Array.isArray(result.stops) && result.stops.length > 0) {
      const grid = document.createElement("div");
      grid.className = "transit-results-grid";

      result.stops.slice(0, 3).forEach((stop) => {
        const card = document.createElement("div");
        card.className = "transit-card";

        card.innerHTML = `
          <div class="transit-card-top">
            <strong style="font-size: 0.88rem;">${escapeHtml(stop.shortName)}</strong>
            <span class="eta-badge">${escapeHtml(stop.distanceFormatted)}</span>
          </div>
          <div class="transit-card-body">
            <div>Buses: <strong style="color: var(--accent-cyan);">${escapeHtml(stop.routesServing.join(", "))}</strong></div>
          </div>
        `;
        grid.appendChild(card);
      });

      container.appendChild(grid);
    }
  }

  scrollToBottom();
}

function formatMarkdownText(raw) {
  return escapeHtml(raw)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n\n/g, "<br><br>")
    .replace(/\n/g, "<br>");
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function scrollToBottom() {
  conversationContainer.scrollTop = conversationContainer.scrollHeight;
}

function showToast(message) {
  toastMessage.textContent = message;
  toastNotification.classList.remove("hidden");
  setTimeout(hideToast, 6000);
}

function hideToast() {
  toastNotification.classList.add("hidden");
}
