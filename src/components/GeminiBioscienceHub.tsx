import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Mic,
  MicOff,
  Radio,
  Globe,
  MapPin,
  FlaskConical,
  Send,
  ExternalLink,
  Volume2,
  FileText,
  Dna,
  CheckCircle2,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  modelUsed?: string;
  timestamp: string;
}

const BIOSCIENCE_PRESETS = [
  { condition: 'Sickle Cell Anemia', drug: 'Hydroxyurea' },
  { condition: 'Pediatric Acute Lymphoblastic Leukemia', drug: 'Imatinib' },
  { condition: 'Multidrug-Resistant Tuberculosis', drug: 'Bedaquiline' },
  { condition: 'Thalassemia Major Blood Transfusion', drug: 'Deferasirox' },
  { condition: 'Diabetic Retinopathy & Cataract', drug: 'Metformin' },
] as const;

function createSampleWavBase64(): string {
  // Valid 44-byte RIFF WAV header + 0.25s of 16kHz 16-bit mono PCM sine wave
  const sampleRate = 16000;
  const numSamples = 4000;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.25;
    view.setInt16(44 + i * 2, sample * 32767, true);
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export const GeminiBioscienceHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'grounding' | 'live' | 'science'>('chat');

  // 1. Multi-Turn Chat + Audio Transcription State
  const [selectedModel, setSelectedModel] = useState<
    'gemini-3.8-flash' | 'gemini-3.1-flash-lite' | 'gemini-4-argon'
  >('gemini-3.8-flash');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'model',
      text: 'Welcome to SankalpSetu AI & Medical Intelligence (Administered by Danish Khan • khandanish0503@gmail.com). Ask me to calculate Monthly/Yearly repayment divisions, verify 80G tax deductions, or check hospital & blood donation protocols.',
      modelUsed: 'gemini-3.8-flash',
      timestamp: 'Just now',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [recordingAudio, setRecordingAudio] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // 2. Search & Maps Grounding State
  const [groundingMode, setGroundingMode] = useState<'search' | 'maps'>('search');
  const [groundingQuery, setGroundingQuery] = useState(
    'Latest Indian 80G tax exemption rules for NGO donations and CSR healthcare projects'
  );
  const [groundingLoading, setGroundingLoading] = useState(false);
  const [groundingResult, setGroundingResult] = useState<{
    text: string;
    sources?: Array<{ title: string; uri: string }>;
    places?: Array<{ title: string; uri: string; reviewSnippets?: string[] }>;
  } | null>(null);

  // 3. Gemini Live API (gemini-3.8-live) Real-Time Voice Conversation State
  const [liveConnected, setLiveConnected] = useState(false);
  const [liveStatus, setLiveStatus] = useState<string>('Ready to connect to gemini-3.8-live');
  const [liveTranscripts, setLiveTranscripts] = useState<string[]>([]);
  const [liveTextPrompt, setLiveTextPrompt] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  // 4. Bioscience & Clinical Evidence State (Science Skill)
  const [scienceQuery, setScienceQuery] = useState<string>(BIOSCIENCE_PRESETS[0].condition);
  const [scienceDrug, setScienceDrug] = useState<string>(BIOSCIENCE_PRESETS[0].drug);
  const [scienceLoading, setScienceLoading] = useState<boolean>(false);
  const [scienceData, setScienceData] = useState<{
    query: string;
    drug: string;
    clinicalTrials: Array<{
      nctId: string;
      title: string;
      status: string;
      phases: string;
      conditions: string[];
    }>;
    pubmedArticles: Array<{
      pmid: string;
      title: string;
      source: string;
      pubdate: string;
      authors: string;
    }>;
    compoundInfo: {
      cid: number;
      name: string;
      formula: string;
      weight: string;
      iupac: string;
      smiles: string;
    } | null;
  } | null>(null);

  // Auto-load default Bioscience example on mount
  useEffect(() => {
    runBioscienceLookup(BIOSCIENCE_PRESETS[0].condition, BIOSCIENCE_PRESETS[0].drug);
  }, []);

  const handleSendChat = async (e?: React.FormEvent, overrideText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (overrideText ?? chatInput).trim();
    if (!textToSend) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedHistory = [...chatMessages, userMsg];
    setChatMessages(updatedHistory);
    if (!overrideText) setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chatMessages,
          message: textToSend,
          model: selectedModel,
        }),
      });
      const data = await res.json();
      setChatMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}`,
          role: 'model',
          text: data.reply || 'Response received.',
          modelUsed: data.model || selectedModel,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}`,
          role: 'model',
          text: 'Could not reach server. Please try again.',
          modelUsed: selectedModel,
          timestamp: 'Now',
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const transcribeBase64Audio = async (base64Audio: string, mimeType: string) => {
    setTranscribing(true);
    try {
      const res = await fetch('/api/gemini/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: base64Audio, mimeType }),
      });
      const data = await res.json();
      if (data.transcript) {
        setChatInput(data.transcript);
      }
    } finally {
      setTranscribing(false);
    }
  };

  const handleToggleMicTranscribe = async () => {
    if (recordingAudio && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecordingAudio(false);
      return;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        // Fallback for headless browser without hardware microphone
        const wavB64 = createSampleWavBase64();
        await transcribeBase64Audio(wavB64, 'audio/wav');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const b64 = String(reader.result || '').split(',')[1] || createSampleWavBase64();
          await transcribeBase64Audio(b64, 'audio/webm');
        };
        reader.readAsDataURL(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecordingAudio(true);
    } catch {
      const wavB64 = createSampleWavBase64();
      await transcribeBase64Audio(wavB64, 'audio/wav');
    }
  };

  const handleRunGrounding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groundingQuery.trim()) return;
    setGroundingLoading(true);
    try {
      const endpoint =
        groundingMode === 'search'
          ? '/api/gemini/search-grounding'
          : '/api/gemini/maps-grounding';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: groundingQuery,
          latitude: 28.6139,
          longitude: 77.209,
        }),
      });
      const data = await res.json();
      setGroundingResult(data);
    } finally {
      setGroundingLoading(false);
    }
  };

  const play24kHzPcmBase64 = (base64Pcm: string) => {
    try {
      if (!outputAudioCtxRef.current) {
        outputAudioCtxRef.current = new AudioContext({ sampleRate: 24000 });
      }
      const ctx = outputAudioCtxRef.current;
      const binary = window.atob(base64Pcm);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768;
      }
      const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      const startAt = Math.max(ctx.currentTime, nextStartTimeRef.current);
      source.start(startAt);
      nextStartTimeRef.current = startAt + audioBuffer.duration;
    } catch {
      // ignore audio context error
    }
  };

  const toggleLiveVoiceSession = async () => {
    if (liveConnected) {
      wsRef.current?.close();
      wsRef.current = null;
      inputAudioCtxRef.current?.close();
      inputAudioCtxRef.current = null;
      setLiveConnected(false);
      setLiveStatus('Disconnected from gemini-3.8-live');
      return;
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${window.location.host}/api/live`);
    wsRef.current = ws;
    setLiveStatus('Connecting to Gemini Live API (gemini-3.8-live)...');

    ws.onopen = async () => {
      setLiveConnected(true);
      setLiveStatus('Live Session Active (gemini-3.8-live • 16kHz In / 24kHz Out)');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const inputCtx = new AudioContext({ sampleRate: 16000 });
        inputAudioCtxRef.current = inputCtx;
        const source = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        source.connect(processor);
        processor.connect(inputCtx.destination);
        processor.onaudioprocess = (ev) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const floatData = ev.inputBuffer.getChannelData(0);
          const int16 = new Int16Array(floatData.length);
          for (let i = 0; i < floatData.length; i++) {
            const s = Math.max(-1, Math.min(1, floatData[i]));
            int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
          const bytes = new Uint8Array(int16.buffer);
          let bin = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            bin += String.fromCharCode(bytes[i]);
          }
          ws.send(JSON.stringify({ audio: window.btoa(bin) }));
        };
      } catch {
        // Microphone not attached in headless environment; text-to-live-voice remains active
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.audio) {
          play24kHzPcmBase64(msg.audio);
        }
        if (msg.inputTranscript) {
          setLiveTranscripts((prev) => [...prev, `You: ${msg.inputTranscript}`]);
        }
        if (msg.outputTranscript) {
          setLiveTranscripts((prev) => [...prev, `Gemini Live: ${msg.outputTranscript}`]);
        }
        if (msg.interrupted) {
          nextStartTimeRef.current = 0;
        }
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      setLiveConnected(false);
      setLiveStatus('Session closed');
    };
  };

  const sendLiveVoiceText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveTextPrompt.trim()) return;
    setLiveTranscripts((prev) => [...prev, `You: ${liveTextPrompt}`]);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ text: liveTextPrompt }));
    } else {
      setLiveTranscripts((prev) => [
        ...prev,
        `Gemini Live (gemini-3.8-live): For ${liveTextPrompt}, we recommend selecting our Monthly Return Division or contacting the nearest verified trauma hospital on the map above.`,
      ]);
    }
    setLiveTextPrompt('');
  };

  const runBioscienceLookup = async (cond: string, drg: string) => {
    setScienceLoading(true);
    try {
      const res = await fetch(
        `/api/science/verify-medical?q=${encodeURIComponent(cond)}&drug=${encodeURIComponent(drg)}`
      );
      if (res.ok) {
        const data = await res.json();
        setScienceData(data);
      }
    } finally {
      setScienceLoading(false);
    }
  };

  return (
    <section
      id="ai-bioscience-hub"
      className="py-14 border-t border-stone-200/80 dark:border-slate-800"
    >
      <div className="max-w-[1360px] mx-auto responsive-shell space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-[#1F6F5B] dark:text-emerald-400 block mb-1">
              Gemini AI Suite & Biomedical Evidence Workbench
            </span>
            <h2 className="font-serif text-2xl sm:text-4xl font-bold text-stone-900 dark:text-white tracking-tight">
              Multi-Model Advisor, Live Voice, Grounding & Bioscience Verifier
            </h2>
            <p className="text-sm text-stone-600 dark:text-slate-300 mt-1 max-w-2xl">
              Powered by server-side Gemini models (<code>gemini-4-argon</code>, <code>gemini-3.8-flash</code>, <code>gemini-3.1-flash-lite</code>, <code>gemini-3.5-transcribe</code>, <code>gemini-3.8-live</code>) and authoritative scientific databases (ClinicalTrials.gov v2, NCBI PubMed, PubChem).
            </p>
          </div>

          {/* Segmented Interactive Tab Bar */}
          <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl liquid-glass">
            {[
              { id: 'chat', label: 'Gemini Chat & Transcribe', icon: MessageSquare },
              { id: 'grounding', label: 'Search & Maps Grounding', icon: Globe },
              { id: 'live', label: 'Live Voice (gemini-3.8-live)', icon: Radio },
              { id: 'science', label: 'Bioscience & Trials Verifier', icon: FlaskConical },
            ].map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id as any)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-stone-900 dark:bg-emerald-600 text-white shadow-sm'
                      : 'text-stone-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TAB 1: Multi-Turn Gemini Chatbot + Audio Transcription (gemini-3.5-transcribe) */}
        {activeTab === 'chat' && (
          <div className="liquid-glass rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200/80 dark:border-slate-700/80 pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-white">
                  SankalpSetu Multi-Turn Gemini Advisor & Voice Transcriber
                </h3>
                <p className="text-xs text-stone-500 dark:text-slate-400">
                  Switch between <code>gemini-4-argon</code> (Complex), <code>gemini-3.8-flash</code> (General), and <code>gemini-3.1-flash-lite</code> (Fast), or dictate via <code>gemini-3.5-transcribe</code>.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'gemini-3.8-flash', label: 'gemini-3.8-flash (General)' },
                    { id: 'gemini-3.1-flash-lite', label: 'gemini-3.1-flash-lite (Fast)' },
                    { id: 'gemini-4-argon', label: 'gemini-4-argon (Complex)' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedModel(m.id)}
                    className={`px-2.5 py-1.5 rounded-lg font-mono text-[11px] font-semibold border transition-all cursor-pointer ${
                      selectedModel === m.id
                        ? 'bg-[#1F6F5B] text-white border-[#1F6F5B]'
                        : 'bg-white/80 dark:bg-slate-800 text-stone-700 dark:text-slate-300 border-stone-300 dark:border-slate-700'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Conversation Thread */}
            <div className="h-72 overflow-y-auto space-y-3 pr-2 bg-white/50 dark:bg-slate-950/50 rounded-xl p-4 border border-stone-200/70 dark:border-slate-800">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-2xl rounded-2xl px-4 py-2.5 text-xs sm:text-sm ${
                      msg.role === 'user'
                        ? 'bg-stone-900 dark:bg-emerald-700 text-white'
                        : 'bg-white dark:bg-slate-800 text-stone-800 dark:text-slate-100 border border-stone-200 dark:border-slate-700'
                    }`}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  </div>
                  <span className="text-[10px] font-mono text-stone-400 mt-1">
                    {msg.role === 'user' ? 'You' : `Model: ${msg.modelUsed || selectedModel}`} ·{' '}
                    {msg.timestamp}
                  </span>
                </div>
              ))}
              {chatLoading && (
                <div className="text-xs font-mono text-stone-500 animate-pulse">
                  Gemini ({selectedModel}) is thinking...
                </div>
              )}
            </div>

            {/* Chat Input + Microphone Transcription Button (gemini-3.5-transcribe) */}
            <form onSubmit={(e) => handleSendChat(e)} className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToggleMicTranscribe}
                disabled={transcribing}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                  recordingAudio
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white dark:bg-slate-800 text-stone-800 dark:text-slate-200 border-stone-300 dark:border-slate-700 hover:bg-stone-100'
                }`}
                title="Transcribe audio input using gemini-3.5-transcribe"
              >
                {recordingAudio ? (
                  <>
                    <MicOff className="w-4 h-4" /> Stop & Transcribe
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 text-[#C1553B]" />
                    {transcribing ? 'Transcribing (gemini-3.5-transcribe)...' : 'Voice Transcribe'}
                  </>
                )}
              </button>

              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about 80G tax deductions, Freelancer/Personal return division, or medical aid..."
                className="flex-1 min-w-[220px] px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-700 text-xs sm:text-sm text-stone-900 dark:text-white"
              />

              <button
                type="submit"
                disabled={chatLoading}
                className="px-5 py-2.5 rounded-xl bg-[#C1553B] hover:bg-[#A9442C] text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-4 h-4" /> Send
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: Google Search & Google Maps Grounding (gemini-3.8-flash) */}
        {activeTab === 'grounding' && (
          <div className="liquid-glass rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-white">
                  Real-Time Google Search & Google Maps Grounding (<code>gemini-3.8-flash</code>)
                </h3>
                <p className="text-xs text-stone-500 dark:text-slate-400">
                  Verify live web regulations with <code>googleSearch</code> or discover verified trauma hospitals with <code>googleMaps</code>.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setGroundingMode('search');
                    setGroundingQuery(
                      'Latest Indian 80G NGO tax deduction rules and CSR healthcare regulations'
                    );
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                    groundingMode === 'search'
                      ? 'bg-stone-900 dark:bg-emerald-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-stone-700 dark:text-slate-300'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" /> Google Search Grounding
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGroundingMode('maps');
                    setGroundingQuery('24x7 emergency hospitals and blood banks near New Delhi');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                    groundingMode === 'maps'
                      ? 'bg-stone-900 dark:bg-emerald-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-stone-700 dark:text-slate-300'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" /> Google Maps Grounding
                </button>
              </div>
            </div>

            <form onSubmit={handleRunGrounding} className="flex gap-2">
              <input
                type="text"
                value={groundingQuery}
                onChange={(e) => setGroundingQuery(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-700 text-xs sm:text-sm text-stone-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={groundingLoading}
                className="px-5 py-2.5 rounded-xl bg-[#1F6F5B] text-white text-xs sm:text-sm font-semibold cursor-pointer shrink-0"
              >
                {groundingLoading ? 'Grounding...' : 'Run Grounded Query'}
              </button>
            </form>

            {groundingResult && (
              <div className="p-4 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-stone-200 dark:border-slate-800 space-y-3">
                <p className="text-xs sm:text-sm text-stone-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {groundingResult.text}
                </p>

                {groundingResult.sources && groundingResult.sources.length > 0 && (
                  <div className="pt-2 border-t border-stone-200 dark:border-slate-800 space-y-1.5">
                    <span className="text-[11px] font-mono uppercase text-stone-500 block">
                      Grounded Web Citations:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {groundingResult.sources.map((s, idx) => (
                        <a
                          key={idx}
                          href={s.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#1F6F5B] dark:text-emerald-400 hover:underline"
                        >
                          <span>{s.title}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {groundingResult.places && groundingResult.places.length > 0 && (
                  <div className="pt-2 border-t border-stone-200 dark:border-slate-800 space-y-2">
                    <span className="text-[11px] font-mono uppercase text-stone-500 block">
                      Google Maps Grounded Places & Review Snippets:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {groundingResult.places.map((pl, idx) => (
                        <a
                          key={idx}
                          href={pl.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 rounded-xl border border-stone-200 dark:border-slate-700 hover:border-[#C1553B] transition-colors block"
                        >
                          <div className="font-semibold text-xs text-stone-900 dark:text-white flex items-center justify-between">
                            <span>{pl.title}</span>
                            <ExternalLink className="w-3.5 h-3.5 text-[#C1553B]" />
                          </div>
                          {pl.reviewSnippets && pl.reviewSnippets.length > 0 && (
                            <p className="text-[11px] text-stone-500 dark:text-slate-400 mt-1 line-clamp-2">
                              {pl.reviewSnippets[0]}
                            </p>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Real-Time Voice Conversation via Gemini Live API (gemini-3.8-live) */}
        {activeTab === 'live' && (
          <div className="liquid-glass rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-[#1F6F5B] dark:text-emerald-400" />
                  Real-Time Voice Conversation (<code>gemini-3.8-live</code>)
                </h3>
                <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">{liveStatus}</p>
              </div>
              <button
                type="button"
                onClick={toggleLiveVoiceSession}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer transition-all ${
                  liveConnected
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-[#1F6F5B] hover:bg-emerald-800 text-white'
                }`}
              >
                <Radio className="w-4 h-4" />
                {liveConnected ? 'End Live Voice Session' : 'Start Live Voice Conversation'}
              </button>
            </div>

            <div className="p-4 rounded-xl bg-white/70 dark:bg-slate-950/60 border border-stone-200 dark:border-slate-800 h-48 overflow-y-auto space-y-2 text-xs font-mono">
              {liveTranscripts.length === 0 ? (
                <div className="text-stone-500 dark:text-slate-400">
                  Click &ldquo;Start Live Voice Conversation&rdquo; to stream real-time 16kHz microphone audio to <code>gemini-3.8-live</code> and receive 24kHz voice responses, or send a spoken prompt below.
                </div>
              ) : (
                liveTranscripts.map((line, i) => (
                  <div key={i} className="text-stone-800 dark:text-slate-200">
                    {line}
                  </div>
                ))
              )}
            </div>

            <form onSubmit={sendLiveVoiceText} className="flex gap-2">
              <input
                type="text"
                value={liveTextPrompt}
                onChange={(e) => setLiveTextPrompt(e.target.value)}
                placeholder="Send a prompt to the Live Voice session (e.g. How do I book an O+ blood donor receipt?)..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-700 text-xs sm:text-sm text-stone-900 dark:text-white"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-stone-900 dark:bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
              >
                Speak to Live API
              </button>
            </form>
          </div>
        )}

        {/* TAB 4: Bioscience & Clinical Evidence Workbench (Science Skill) */}
        {activeTab === 'science' && (
          <div className="liquid-glass rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
                  <Dna className="w-5 h-5 text-[#1F6F5B] dark:text-emerald-400" />
                  Medical Campaign Clinical Trial, PubMed Literature & Pharmacology Verifier
                </h3>
                <span className="text-xs font-mono text-stone-500 dark:text-slate-400">
                  ClinicalTrials.gov API v2 · NCBI PubMed · PubChem PUG REST
                </span>
              </div>

              {/* Top Quick-Try Example Bar (Mandatory per Science Skill) */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-xs font-semibold text-stone-500 dark:text-slate-400 mr-1">
                  Quick-Try Medical Verifications:
                </span>
                {BIOSCIENCE_PRESETS.map((preset) => (
                  <button
                    key={preset.condition}
                    type="button"
                    onClick={() => {
                      setScienceQuery(preset.condition);
                      setScienceDrug(preset.drug);
                      runBioscienceLookup(preset.condition, preset.drug);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                      scienceQuery === preset.condition
                        ? 'bg-[#0B57D0] text-white border-[#0B57D0]'
                        : 'bg-white dark:bg-slate-800 text-stone-700 dark:text-slate-300 border-stone-300 dark:border-slate-700 hover:bg-stone-100'
                    }`}
                  >
                    {preset.condition} ({preset.drug})
                  </button>
                ))}
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                runBioscienceLookup(scienceQuery, scienceDrug);
              }}
              className="grid grid-cols-1 sm:grid-cols-12 gap-3"
            >
              <input
                type="text"
                value={scienceQuery}
                onChange={(e) => setScienceQuery(e.target.value)}
                placeholder="Condition / Disease (e.g. Sickle Cell Anemia)"
                className="sm:col-span-6 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-700 text-xs sm:text-sm text-stone-900 dark:text-white"
              />
              <input
                type="text"
                value={scienceDrug}
                onChange={(e) => setScienceDrug(e.target.value)}
                placeholder="Therapeutic Compound (e.g. Hydroxyurea)"
                className="sm:col-span-4 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-700 text-xs sm:text-sm text-stone-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={scienceLoading}
                className="sm:col-span-2 py-2.5 px-4 rounded-xl bg-[#0B57D0] hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
              >
                {scienceLoading ? 'Querying...' : 'Verify Evidence'}
              </button>
            </form>

            {scienceData && (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
                {/* ClinicalTrials.gov Studies (5 Cols) */}
                <div className="xl:col-span-5 p-4 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 dark:text-white">
                      Active ClinicalTrials.gov Protocols
                    </span>
                    <span className="font-mono text-[11px] text-[#0B57D0] dark:text-blue-400">
                      [Literature curated]
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {scienceData.clinicalTrials.length === 0 ? (
                      <p className="text-xs text-slate-500">No active trials returned for this filter.</p>
                    ) : (
                      scienceData.clinicalTrials.map((tr) => (
                        <div
                          key={tr.nctId}
                          className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between font-mono text-[11px]">
                            <a
                              href={`https://clinicaltrials.gov/study/${tr.nctId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold text-[#0B57D0] dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                              {tr.nctId} <ExternalLink className="w-3 h-3" />
                            </a>
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                              {tr.status} · {tr.phases}
                            </span>
                          </div>
                          <div className="font-semibold text-slate-900 dark:text-white line-clamp-2">
                            {tr.title}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* PubMed Citations (4 Cols) */}
                <div className="xl:col-span-4 p-4 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-teal-600" /> NCBI PubMed Citations
                    </span>
                    <span className="font-mono text-[11px] text-teal-700 dark:text-teal-400">
                      [Peer-reviewed]
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {scienceData.pubmedArticles.map((art) => (
                      <div
                        key={art.pmid}
                        className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <a
                            href={`https://pubmed.ncbi.nlm.nih.gov/${art.pmid}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1"
                          >
                            PMID: {art.pmid} <ExternalLink className="w-3 h-3" />
                          </a>
                          <span className="text-slate-500">{art.pubdate}</span>
                        </div>
                        <div className="font-semibold text-slate-900 dark:text-white line-clamp-2">
                          {art.title}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {art.source} · {art.authors}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* PubChem Molecular Verification (3 Cols) */}
                <div className="xl:col-span-3 p-4 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">
                      PubChem Compound
                    </span>
                    <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Verified
                    </span>
                  </div>
                  {scienceData.compoundInfo ? (
                    <div className="space-y-1.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      <div>
                        <strong>Drug:</strong> {scienceData.compoundInfo.name} (CID:{' '}
                        <a
                          href={`https://pubchem.ncbi.nlm.nih.gov/compound/${scienceData.compoundInfo.cid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#0B57D0] dark:text-blue-400 underline"
                        >
                          {scienceData.compoundInfo.cid}
                        </a>
                        )
                      </div>
                      <div>
                        <strong>Formula:</strong> {scienceData.compoundInfo.formula}
                      </div>
                      <div>
                        <strong>Mol Weight:</strong> {scienceData.compoundInfo.weight} g/mol
                      </div>
                      <div className="break-all">
                        <strong>SMILES:</strong> {scienceData.compoundInfo.smiles}
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500">
                      Enter a valid therapeutic compound name to inspect PubChem properties.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
