/**
 * MOBI Speech Service (Client-Side)
 * Real Web Speech API STT & TTS with Native Microphone Audio Capture
 */

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export class ClientSpeechService {
  constructor() {
    this.recognition = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isListeningActive = false;
    this.selectedLanguage = "en-IN";
    this.ttsEnabled = true;

    this.initRecognition();
  }

  /**
   * Check if speech recognition is supported in this browser
   */
  isSTTSupported() {
    return Boolean(SpeechRecognition || navigator.mediaDevices?.getUserMedia);
  }

  /**
   * Check if text-to-speech is supported
   */
  isTTSSupported() {
    return "speechSynthesis" in window;
  }

  /**
   * Initialize native Web Speech API recognition instance
   */
  initRecognition() {
    if (!SpeechRecognition) return;

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = this.selectedLanguage;
    this.recognition.maxAlternatives = 1;
  }

  /**
   * Set language for both speech recognition and synthesis
   */
  setLanguage(langCode) {
    this.selectedLanguage = langCode;
    if (this.recognition) {
      this.recognition.lang = langCode;
    }
  }

  /**
   * Request real microphone permission from the browser
   */
  async requestMicPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop temporary stream immediately after confirming permission
      stream.getTracks().forEach((track) => track.stop());
      return { granted: true };
    } catch (err) {
      console.warn("Microphone permission denied:", err);
      return {
        granted: false,
        error: err.name === "NotAllowedError" ? "PERMISSION_DENIED" : "MIC_UNAVAILABLE",
        message: err.message
      };
    }
  }

  /**
   * Start real microphone voice capture and speech recognition
   * @param {Object} callbacks
   * @param {Function} callbacks.onStart - Mic active
   * @param {Function} callbacks.onInterim - Real-time interim speech transcript
   * @param {Function} callbacks.onResult - Final complete speech transcript
   * @param {Function} callbacks.onError - Recognition error
   * @param {Function} callbacks.onEnd - Recording finished
   */
  async startListening({ onStart = () => {}, onInterim = () => {}, onResult = () => {}, onError = () => {}, onEnd = () => {} } = {}) {
    if (this.isListeningActive) {
      this.stopListening();
    }

    // 1. Verify mic permissions
    const perm = await this.requestMicPermission();
    if (!perm.granted) {
      onError({
        code: "MIC_PERMISSION_DENIED",
        message: "Microphone access is required to use voice search. Please allow microphone permissions."
      });
      return;
    }

    // 2. Use Web Speech Recognition if available
    if (SpeechRecognition) {
      this.initRecognition();
      let finalTranscript = "";
      let hasReceivedResult = false;

      this.recognition.onstart = () => {
        this.isListeningActive = true;
        onStart();
      };

      this.recognition.onresult = (event) => {
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
            hasReceivedResult = true;
          } else {
            interimTranscript += item[0].transcript;
          }
        }

        if (interimTranscript) {
          onInterim(interimTranscript);
        }

        if (hasReceivedResult && finalTranscript.trim()) {
          onResult(finalTranscript.trim());
        }
      };

      this.recognition.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        this.isListeningActive = false;

        let userMsg = "I couldn't understand that. Please try again.";
        if (event.error === "no-speech") {
          userMsg = "No speech was detected. Please try again.";
        } else if (event.error === "not-allowed") {
          userMsg = "Microphone access was denied. Please allow microphone permissions.";
        } else if (event.error === "network") {
          userMsg = "Network error during speech recognition.";
        }

        onError({
          code: event.error,
          message: userMsg
        });
      };

      this.recognition.onend = () => {
        this.isListeningActive = false;
        onEnd({ finalTranscript: finalTranscript.trim() });
      };

      try {
        this.recognition.start();
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
        onError({ code: "START_FAILED", message: err.message });
      }
    } else {
      // Fallback: Record audio blob using MediaRecorder for server-side transcription
      await this.startMediaRecorderListening({ onStart, onResult, onError, onEnd });
    }
  }

  /**
   * MediaRecorder fallback for recording audio and sending to server transcribe
   */
  async startMediaRecorderListening({ onStart, onResult, onError, onEnd }) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };

      this.mediaRecorder.onstop = async () => {
        this.isListeningActive = false;
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" });
        if (audioBlob.size === 0) {
          onError({ code: "EMPTY_AUDIO", message: "No audio was recorded." });
          onEnd();
          return;
        }

        // Send to server-side transcription endpoint
        try {
          const formData = new FormData();
          formData.append("audio", audioBlob, "recording.webm");
          formData.append("language", this.selectedLanguage);

          const res = await fetch("/api/mobi/transcribe", {
            method: "POST",
            body: formData
          });

          const data = await res.json();
          if (data.success && data.transcript) {
            onResult(data.transcript);
          } else {
            onError({ code: "TRANSCRIPTION_FAILED", message: data.message || "Could not transcribe audio." });
          }
        } catch (err) {
          onError({ code: "NETWORK_ERROR", message: "Failed to connect to transcription service." });
        }
        onEnd();
      };

      this.mediaRecorder.start();
      this.isListeningActive = true;
      onStart();
    } catch (err) {
      onError({ code: "RECORDER_ERROR", message: err.message });
    }
  }

  /**
   * Stop current voice recording
   */
  stopListening() {
    if (!this.isListeningActive) return;

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }

    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      try {
        this.mediaRecorder.stop();
      } catch (e) {}
    }

    this.isListeningActive = false;
  }

  /**
   * Cancel and discard current speech recording
   */
  cancelListening() {
    if (!this.isListeningActive) return;

    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (e) {}
    }

    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      try {
        this.mediaRecorder.stream.getTracks().forEach((t) => t.stop());
        this.mediaRecorder = null;
      } catch (e) {}
    }

    this.isListeningActive = false;
  }

  /**
   * Speak response text using real native Web Speech API SpeechSynthesis
   */
  speakText(text, { onStart = () => {}, onEnd = () => {} } = {}) {
    if (!this.ttsEnabled || !this.isTTSSupported() || !text) return;

    // Clean text of markdown characters before speaking
    const spokenText = text
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/\[(.*?)\]\(.*?\)/g, "$1")
      .replace(/`/g, "")
      .replace(/[#_~]/g, "")
      .trim();

    if (!spokenText) return;

    // Stop previous utterance if running
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.lang = this.selectedLanguage;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Select the most natural voice available for the language
    const voices = window.speechSynthesis.getVoices();
    const langPrefix = this.selectedLanguage.slice(0, 2);
    const naturalVoice =
      voices.find((v) => v.lang.startsWith(langPrefix) && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Premium"))) ||
      voices.find((v) => v.lang.startsWith(langPrefix));

    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    utterance.onstart = () => onStart();
    utterance.onend = () => onEnd();
    utterance.onerror = (e) => {
      console.warn("TTS error:", e);
      onEnd();
    };

    window.speechSynthesis.speak(utterance);
  }

  /**
   * Stop active speech synthesis
   */
  stopSpeaking() {
    if (this.isTTSSupported()) {
      window.speechSynthesis.cancel();
    }
  }
}
