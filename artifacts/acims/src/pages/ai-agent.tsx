import { useState, useEffect, useRef, type FormEvent } from 'react';
import {
  ArrowRight,
  Bot,
  BusFront,
  Compass,
  Footprints,
  GraduationCap,
  LocateFixed,
  MapPin,
  Mic,
  MicOff,
  Navigation,
  Radio,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  TrainFront,
  User,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { PageHeading } from '@/components/acims-ui';
import 'leaflet/dist/leaflet.css';

interface MessageCard {
  type: 'next-bus' | 'bus-stop' | 'journey' | 'alternative' | 'route';
  title: string;
  subtitle?: string;
  status?: 'Scheduled' | 'Live' | 'Predicted';
  details: Record<string, any>;
}

interface MapMarker {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  type: 'student' | 'stop' | 'bus' | 'destination';
}

interface MessageItem {
  role: 'user' | 'assistant';
  text: string;
  intent?: string;
  sources?: string[];
  sourceBadge?: {
    label: string;
    type: 'scheduled' | 'live GPS' | 'official' | 'calculated';
    timestamp: string;
  };
  cards?: MessageCard[];
  mapData?: {
    center: { latitude: number; longitude: number };
    zoom?: number;
    markers: MapMarker[];
  };
  ttsText?: string;
  time: string;
}

interface StudentProfileState {
  studentId: string;
  name: string;
  department: string;
  pickupStopName: string;
  assignedBusId: string;
  collegeDestination: string;
}

const promptSuggestions = [
  'Where is my college bus?',
  "What's my next bus?",
  'Which buses are near me?',
  'I missed my bus. What can I take?',
  'How do I get to REC from my stop?',
  'When should I leave home?',
  'What about public buses?',
  'Where do I get down?',
];

function LeafletAutoCenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function AiAgentPage() {
  const [studentId, setStudentId] = useState(() => {
    try {
      return sessionStorage.getItem('acmis_student_session') || 'student-20418';
    } catch {
      return 'student-20418';
    }
  });

  const [studentProfile, setStudentProfile] = useState<StudentProfileState>({
    studentId: 'student-20418',
    name: 'Ananya Raman',
    department: 'Computer Science & Design',
    pickupStopName: 'Tambaram Terminal',
    assignedBusId: 'bus-12',
    collegeDestination: 'Rajalakshmi Engineering College (REC)',
  });

  // GPS State
  const [deviceCoords, setDeviceCoords] = useState<{
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
    timestamp?: string;
  } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'prompt' | 'granted' | 'denied' | 'unavailable'>('prompt');
  const [gpsErrorMessage, setGpsErrorMessage] = useState<string | null>(null);

  // Chat State
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      role: 'assistant',
      text: 'Hello Ananya! I am your personal ACIMS Mobility Assistant. I can check your college bus GPS, pickup stop timings, nearby MTC buses, Metro/Rail connections, and journey alternatives using verified transport data.',
      sources: ['ACIMS Student Identity & Transit Registry'],
      sourceBadge: {
        label: 'ACIMS Verified Network',
        type: 'official',
        timestamp: new Date().toISOString(),
      },
      time: 'Just now',
    },
  ]);

  // Voice Search / Speech Recognition State
  const [isListening, setIsListening] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Text-To-Speech (TTS) State
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);

  // Load student profile from backend
  useEffect(() => {
    fetch(`/api/student/profile?studentId=${encodeURIComponent(studentId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setStudentProfile({
            studentId: data.studentId,
            name: data.name,
            department: data.department,
            pickupStopName: data.pickupStopName,
            assignedBusId: data.assignedBusId,
            collegeDestination: data.collegeDestination?.name || 'Rajalakshmi Engineering College',
          });
        }
      })
      .catch(() => {});
  }, [studentId]);

  // Initialize GPS (Real User Location)
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('unavailable');
      setGpsErrorMessage('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDeviceCoords({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy),
          speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : undefined,
          heading: pos.coords.heading ? Math.round(pos.coords.heading) : undefined,
          timestamp: new Date().toISOString(),
        });
        setGpsStatus('granted');
        setGpsErrorMessage(null);
      },
      (err) => {
        setGpsStatus('denied');
        setGpsErrorMessage(err.message || 'Location permission denied.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );
  };

  useEffect(() => {
    // Initial request attempt
    requestLocation();
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-IN'; // English (India)

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechTranscript('');
      };

      recognition.onresult = (event: any) => {
        let current = '';
        for (let i = 0; i < event.results.length; i++) {
          current += event.results[i][0].transcript;
        }
        setSpeechTranscript(current);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Toggle voice recognition
  const toggleSpeech = () => {
    if (!speechSupported || !recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      if (speechTranscript.trim()) {
        sendQuery(speechTranscript.trim());
      }
    } else {
      setSpeechTranscript('');
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Failed to start speech recognition:', err);
      }
    }
  };

  // Submit query
  const sendQuery = async (queryText?: string) => {
    const textToSend = (queryText || message).trim();
    if (!textToSend || isSubmitting) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMessage: MessageItem = {
      role: 'user',
      text: textToSend,
      time: timeStr,
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!queryText) setMessage('');
    setIsSubmitting(true);

    // Build context history for follow-ups
    const conversationHistory = messages.slice(-6).map((m) => ({
      role: m.role,
      text: m.text,
      intent: m.intent as any,
    }));

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          message: textToSend,
          deviceCoords: deviceCoords || undefined,
          history: conversationHistory,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMessage: MessageItem = {
          role: 'assistant',
          text: data.answer,
          intent: data.intent,
          sources: data.sources,
          sourceBadge: data.sourceBadge,
          cards: data.cards,
          mapData: data.mapData,
          ttsText: data.ttsText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error('Server returned an error');
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: "I don't have reliable transport data for that right now. Please verify your connection or try another travel query.",
          sources: ['ACIMS Fallback Safeguard'],
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // TTS Read Answer
  const toggleSpeak = (text: string, index: number) => {
    if (!('speechSynthesis' in window)) return;

    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);

    setSpeakingIndex(index);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="page-in min-h-[calc(100vh-80px)]">
      {/* Header */}
      <PageHeading
        eyebrow="Personal Mobility Assistant"
        title="ACIMS AI"
        description="Your dedicated transit intelligence companion. Grounded exclusively in verified CUMTA GTFS data, stop-specific timetables, and live college bus telemetry."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {gpsStatus === 'granted' && deviceCoords ? (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                <span className="pulse-dot h-2 w-2 rounded-full bg-emerald-500" />
                <span>GPS Active (±{deviceCoords.accuracy}m)</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={requestLocation}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition"
              >
                <LocateFixed size={13} />
                <span>Allow Phone GPS</span>
              </button>
            )}
          </div>
        }
      />

      {/* Authenticated Student Profile Bar */}
      <div className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground font-extrabold text-sm">
            <GraduationCap size={18} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-foreground">{studentProfile.name}</span>
              <span className="mono rounded bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                {studentProfile.studentId}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {studentProfile.department} · Destination: <strong className="text-foreground">{studentProfile.collegeDestination}</strong>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <span className="rounded-xl border border-border bg-background px-3 py-1.5 text-foreground flex items-center gap-1.5">
            <MapPin size={12} className="text-accent-foreground" />
            <span>Pickup: {studentProfile.pickupStopName}</span>
          </span>
          <span className="rounded-xl border border-border bg-background px-3 py-1.5 text-foreground flex items-center gap-1.5">
            <BusFront size={12} className="text-accent-foreground" />
            <span>Bus #{studentProfile.assignedBusId.replace('bus-', '')}</span>
          </span>
        </div>
      </div>

      {/* Main Grid: Prompts Sidebar + Chat Feed */}
      <section className="mt-5 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        {/* Left Column: Instant Prompts & Voice Action */}
        <div className="space-y-4">
          {/* Prominent Voice Assistant Box */}
          <div className="rounded-[28px] border-2 border-accent/70 bg-gradient-to-br from-card to-accent/10 p-6 shadow-md text-center space-y-4">
            <div className="mono text-[10px] uppercase tracking-[0.2em] font-extrabold text-muted-foreground">
              Voice Assistant
            </div>
            <h2 className="text-lg font-extrabold text-foreground">Ask anything about your commute</h2>
            <p className="text-xs text-muted-foreground">
              Tap the microphone to speak naturally. Speech recognition will query live transit schedules and bus telemetry.
            </p>

            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={toggleSpeech}
                data-testid="button-voice-assistant"
                className={`relative flex h-16 w-16 items-center justify-center rounded-full transition shadow-lg ${
                  isListening
                    ? 'bg-destructive text-destructive-foreground animate-pulse scale-105 ring-4 ring-destructive/30'
                    : 'bg-accent text-accent-foreground hover:scale-105 active:scale-95'
                }`}
                title={isListening ? 'Stop listening' : 'Start speaking'}
              >
                {isListening ? <MicOff size={26} /> : <Mic size={26} />}
              </button>
            </div>

            {isListening && (
              <div className="rounded-xl bg-background/80 p-3 text-xs font-bold text-foreground border border-border animate-in fade-in">
                <span className="pulse-dot mr-2 inline-block h-2 w-2 rounded-full bg-destructive" />
                <span>{speechTranscript || 'Listening for your commute question…'}</span>
              </div>
            )}

            <div className="text-[11px] font-bold text-muted-foreground">
              {isListening ? 'Tap mic again to submit query' : '🎙️ Tap to Speak'}
            </div>
          </div>

          {/* Quick Suggestions */}
          <div className="rounded-[28px] border border-border bg-card p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-accent-foreground" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                Suggested Questions
              </h3>
            </div>
            <div className="grid gap-2">
              {promptSuggestions.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendQuery(prompt)}
                  disabled={isSubmitting}
                  data-testid={`prompt-btn-${prompt.slice(0, 10).toLowerCase().replace(/\s+/g, '-')}`}
                  className="rounded-xl border border-border/80 bg-background px-3.5 py-2.5 text-left text-xs font-bold text-foreground transition hover:border-accent hover:bg-accent/10 disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Chat Window */}
        <div className="flex min-h-[680px] flex-col rounded-[28px] border border-border bg-card p-5 sm:p-7 shadow-sm">
          {/* Desk Header */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground font-extrabold">
                <Bot size={20} />
              </span>
              <div>
                <div className="text-sm font-extrabold text-foreground">ACIMS Mobility Intelligence Desk</div>
                <div className="text-[10px] text-muted-foreground">Personalized commute &amp; multi-modal transit</div>
              </div>
            </div>
            <span className="mono text-[10px] font-extrabold rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
              Zero Hallucination
            </span>
          </div>

          {/* Message Stream */}
          <div className="flex-1 space-y-5 overflow-y-auto py-5 pr-1 max-h-[580px]">
            {messages.map((item, index) => (
              <div
                key={`${item.role}-${index}`}
                data-testid={`ai-msg-${index}`}
                className={`flex gap-3 ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {item.role === 'assistant' && (
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground text-xs font-bold mt-1">
                    <Bot size={15} />
                  </span>
                )}

                <div
                  className={`max-w-[90%] rounded-2xl p-4 text-xs leading-5 shadow-xs ${
                    item.role === 'user'
                      ? 'rounded-br-sm bg-primary text-primary-foreground'
                      : 'rounded-bl-sm bg-muted/80 text-foreground border border-border/60'
                  }`}
                >
                  <div className="whitespace-pre-line font-medium text-xs sm:text-[13px]">{item.text}</div>

                  {/* Transport Cards */}
                  {item.cards && item.cards.length > 0 && (
                    <div className="mt-3.5 space-y-2.5">
                      {item.cards.map((card, cIdx) => (
                        <div
                          key={cIdx}
                          className="rounded-xl border border-border bg-background p-3 shadow-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-xs text-foreground flex items-center gap-1.5">
                              <BusFront size={13} className="text-accent-foreground" />
                              {card.title}
                            </span>
                            {card.status && (
                              <span
                                className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${
                                  card.status === 'Live'
                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                    : card.status === 'Predicted'
                                      ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                                      : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {card.status}
                              </span>
                            )}
                          </div>
                          {card.subtitle && (
                            <div className="text-[11px] font-bold text-muted-foreground">{card.subtitle}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Leaflet Map Preview */}
                  {item.mapData && item.mapData.markers.length > 0 && (
                    <div className="mt-3.5 overflow-hidden rounded-xl border border-border shadow-xs">
                      <div className="h-48 w-full">
                        <MapContainer
                          center={[item.mapData.center.latitude, item.mapData.center.longitude]}
                          zoom={item.mapData.zoom || 14}
                          scrollWheelZoom={false}
                          className="h-full w-full"
                        >
                          <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          />
                          <LeafletAutoCenter
                            center={[item.mapData.center.latitude, item.mapData.center.longitude]}
                          />
                          {item.mapData.markers.map((m) => {
                            const iconHtml =
                              m.type === 'student'
                                ? `<div style="background:#2563eb; width:16px; height:16px; border-radius:50%; border:2px solid white; box-shadow:0 0 8px rgba(37,99,235,0.8)"></div>`
                                : m.type === 'bus'
                                  ? `<div style="background:#f59e0b; width:22px; height:22px; border-radius:6px; display:flex; align-items:center; justify-content:center; color:white; font-size:11px; font-weight:bold; border:2px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.3)">🚌</div>`
                                  : m.type === 'destination'
                                    ? `<div style="background:#dc2626; width:18px; height:18px; border-radius:50%; border:2px solid white; box-shadow:0 0 8px rgba(220,38,38,0.8)"></div>`
                                    : `<div style="background:#10b981; width:16px; height:16px; border-radius:50%; border:2px solid white;"></div>`;

                            const customIcon = divIcon({
                              html: iconHtml,
                              className: '',
                              iconSize: [20, 20],
                              iconAnchor: [10, 10],
                            });

                            return (
                              <Marker key={m.id} position={[m.latitude, m.longitude]} icon={customIcon}>
                                <Tooltip permanent={false} direction="top">
                                  <span className="font-bold text-xs">{m.title}</span>
                                </Tooltip>
                              </Marker>
                            );
                          })}
                        </MapContainer>
                      </div>
                    </div>
                  )}

                  {/* Source Provenance Badge */}
                  {item.sourceBadge && (
                    <div className="mt-2.5 pt-2 border-t border-border/50 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
                      <span className="font-bold flex items-center gap-1">
                        <ShieldCheck size={11} className="text-accent-foreground" />
                        <span>{item.sourceBadge.label}</span>
                      </span>
                      <span className="mono opacity-70">{item.time}</span>
                    </div>
                  )}

                  {/* Actions Bar: Read Answer & Ask Follow-up */}
                  {item.role === 'assistant' && (
                    <div className="mt-2 pt-1.5 flex items-center justify-end gap-2 border-t border-border/30">
                      <button
                        type="button"
                        onClick={() => toggleSpeak(item.ttsText || item.text, index)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-foreground transition"
                        title="Read answer aloud"
                      >
                        {speakingIndex === index ? (
                          <>
                            <VolumeX size={12} className="text-destructive" />
                            <span>Stop</span>
                          </>
                        ) : (
                          <>
                            <Volume2 size={12} />
                            <span>Read answer</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {item.role === 'user' && (
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground text-xs font-bold mt-1">
                    <User size={15} />
                  </span>
                )}
              </div>
            ))}

            {isSubmitting && (
              <div className="flex gap-3 justify-start items-center">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground text-xs font-bold animate-pulse">
                  <Bot size={15} />
                </span>
                <div className="rounded-2xl bg-muted px-4 py-3 text-xs text-muted-foreground animate-pulse border border-border/50">
                  Querying CUMTA GTFS schedules, student stop matrices, and live bus GPS…
                </div>
              </div>
            )}
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendQuery();
            }}
            className="flex items-center gap-2 border-t border-border pt-4"
          >
            <button
              type="button"
              onClick={toggleSpeech}
              title={isListening ? 'Stop listening' : 'Speak your question'}
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl transition ${
                isListening
                  ? 'bg-destructive text-destructive-foreground animate-pulse'
                  : 'bg-muted text-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <Mic size={18} />
            </button>

            <input
              data-testid="input-ai-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask anything (e.g. When is my next bus? Did I miss my bus? Buses near me?)"
              className="h-12 flex-1 rounded-xl border border-input bg-background px-4 text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-ring"
            />

            <button
              type="submit"
              data-testid="button-send-ai"
              disabled={!message.trim() || isSubmitting}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground transition hover:opacity-90 disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
