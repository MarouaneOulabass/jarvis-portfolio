'use client';

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound } from '@/lib/jarvisSound';
import {
  speakJarvis,
  stopSpeaking,
  setTtsEnabled,
  isTtsEnabled,
  setTtsLang,
  getTtsLang,
  isTtsSupported,
  type TtsLang,
} from '@/lib/speak';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  streaming?: boolean;
}

function extractContentPartial(raw: string): string {
  const startIdx = raw.indexOf('<content>');
  if (startIdx === -1) {
    // Fallback: accept raw text if no XML wrap (legacy)
    const metaIdx = raw.indexOf('<meta>');
    return metaIdx === -1 ? raw : raw.slice(0, metaIdx);
  }
  const afterStart = raw.slice(startIdx + '<content>'.length);
  const endIdx = afterStart.indexOf('</content>');
  return endIdx === -1 ? afterStart : afterStart.slice(0, endIdx);
}

function extractMeta(raw: string): { projectIds: string[]; hideProjectIds: string[] } {
  const m = raw.match(/<meta>([\s\S]*?)<\/meta>/);
  if (!m) {
    // Legacy JSON fallback
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          projectIds: Array.isArray(parsed.projectIds) ? parsed.projectIds : [],
          hideProjectIds: Array.isArray(parsed.hideProjectIds) ? parsed.hideProjectIds : [],
        };
      } catch {
        // fall through
      }
    }
    return { projectIds: [], hideProjectIds: [] };
  }
  try {
    const parsed = JSON.parse(m[1]);
    return {
      projectIds: Array.isArray(parsed.projectIds) ? parsed.projectIds : [],
      hideProjectIds: Array.isArray(parsed.hideProjectIds) ? parsed.hideProjectIds : [],
    };
  } catch {
    return { projectIds: [], hideProjectIds: [] };
  }
}

interface ChatInterfaceProps {
  onAIResponse: (response: string, projectIds: string[], hideIds: string[]) => void;
  onActivityChange: (active: boolean) => void;
  onOpenRequest?: () => void;
}

export interface ChatHandle {
  ask: (text: string) => void;
}

type VoiceLang = TtsLang;

const LANG_LABELS: Record<VoiceLang, string> = {
  'fr-FR': 'FR',
  'en-US': 'EN',
  'ar-MA': 'AR',
};

const SUGGESTIONS = [
  'Montre-moi tout',
  'Prospect télécom au Maroc',
  'Pitch pour du retail',
  'Compétences data engineering',
];

const ChatInterface = forwardRef<ChatHandle, ChatInterfaceProps>(function ChatInterface(
  { onAIResponse, onActivityChange, onOpenRequest },
  ref,
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceLang, setVoiceLangState] = useState<VoiceLang>('fr-FR');
  const [volume, setVolume] = useState(0);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [ttsEnabled, setTtsEnabledState] = useState(true);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const spokenIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setVoiceSupported(
      'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
    );
    setTtsSupported(isTtsSupported());
    setTtsEnabledState(isTtsEnabled());
    setVoiceLangState(getTtsLang());
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content:
          'Cockpit en ligne. Décrivez-moi votre prospect, votre besoin, ou dites « montre-moi tout ». Glissez une card vers la zone CLIENT pour générer un pitch.',
        timestamp: new Date(),
      },
    ]);
  }, []);

  const speak = useCallback((text: string) => {
    if (!ttsSupported || !ttsEnabled) return;
    speakJarvis(text, {
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
    });
  }, [ttsEnabled, ttsSupported]);

  // Auto-speak latest assistant message (after streaming completes)
  useEffect(() => {
    if (!ttsEnabled || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role !== 'assistant') return;
    if (last.streaming) return;
    if (!last.content) return;
    if (spokenIdsRef.current.has(last.id)) return;
    spokenIdsRef.current.add(last.id);
    if (last.id === 'welcome') return;
    speak(last.content);
  }, [messages, ttsEnabled, speak]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
      };

      const assistantId = (Date.now() + 1).toString();
      const assistantSeed: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        streaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantSeed]);
      setInput('');
      setIsLoading(true);
      onActivityChange(true);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messages, userMsg].map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });
        if (!res.ok || !res.body) throw new Error(`API error: ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let raw = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          raw += decoder.decode(value, { stream: true });
          const visible = extractContentPartial(raw);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: visible } : m,
            ),
          );
        }

        const finalContent = extractContentPartial(raw).trim();
        const meta = extractMeta(raw);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: finalContent, streaming: false }
              : m,
          ),
        );
        playSound('message');
        onAIResponse(finalContent, meta.projectIds, meta.hideProjectIds);
      } catch {
        playSound('error');
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content:
                    'Canal IA indisponible. Vérifiez la clé API dans .env.local.',
                  streaming: false,
                }
              : m,
          ),
        );
      } finally {
        setIsLoading(false);
        onActivityChange(false);
      }
    },
    [isLoading, messages, onAIResponse, onActivityChange],
  );

  useImperativeHandle(
    ref,
    () => ({
      ask: (text: string) => {
        onOpenRequest?.();
        sendMessage(text);
      },
    }),
    [sendMessage, onOpenRequest],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const stopVoice = useCallback(() => {
    recognitionRef.current?.stop();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    streamRef.current = null;
    setVolume(0);
    setIsListening(false);
  }, []);

  const startVoice = useCallback(async () => {
    if (!voiceSupported) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = voiceLang;
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join('');
      setInput(transcript);
      if (event.results[event.results.length - 1].isFinal) {
        sendMessage(transcript);
        stopVoice();
      }
    };

    recognition.onerror = () => stopVoice();
    recognition.onend = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      streamRef.current = null;
      setVolume(0);
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        setVolume(Math.min(1, sum / data.length / 100));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // mic unavailable
    }

    recognition.start();
    setIsListening(true);
  }, [sendMessage, stopVoice, voiceLang, voiceSupported]);

  const toggleVoice = () => (isListening ? stopVoice() : startVoice());

  const toggleTts = () => {
    const next = !ttsEnabled;
    setTtsEnabled(next);
    setTtsEnabledState(next);
    if (!next) stopSpeaking();
  };

  useEffect(() => () => {
    stopVoice();
    stopSpeaking();
  }, [stopVoice]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-4 py-2.5 rounded-lg text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-jarvis-blue/15 border border-jarvis-blue/30 text-jarvis-blue'
                    : 'bg-jarvis-panel border border-jarvis-border text-gray-300'
                }`}
              >
                {msg.role === 'assistant' && (
                  <span className="text-jarvis-green text-[0.6rem] font-display tracking-widest block mb-1">
                    JARVIS
                  </span>
                )}
                {msg.streaming && !msg.content ? (
                  <span className="flex items-center gap-1.5 text-xs text-gray-400">
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-jarvis-blue rounded-full animate-bounce" />
                      <span
                        className="w-1.5 h-1.5 bg-jarvis-blue rounded-full animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      />
                      <span
                        className="w-1.5 h-1.5 bg-jarvis-blue rounded-full animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      />
                    </span>
                  </span>
                ) : (
                  <>
                    <span>{msg.content}</span>
                    {msg.streaming && <span className="typing-cursor" />}
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {messages.length <= 1 && !isLoading && (
        <div className="px-3 pb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="px-2.5 py-1 text-[0.6rem] rounded-full bg-jarvis-panel border border-jarvis-border text-jarvis-blue/80 hover:bg-jarvis-blue/10 hover:text-jarvis-blue transition-colors uppercase tracking-wider"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-3 border-t border-jarvis-border/30">
        <div className="chat-input-glow flex items-center gap-2 bg-jarvis-darker/80 rounded-lg px-3 py-2">
          {voiceSupported && (
            <button
              type="button"
              onClick={toggleVoice}
              title={isListening ? 'Stop' : `Parler (${LANG_LABELS[voiceLang]})`}
              className={`relative flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                isListening
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                  : 'bg-jarvis-panel text-jarvis-blue border border-jarvis-border hover:bg-jarvis-blue/10'
              }`}
            >
              {isListening && (
                <span
                  className="absolute inset-0 rounded-full border border-red-500/40"
                  style={{
                    transform: `scale(${1 + volume * 0.8})`,
                    opacity: 0.5 + volume * 0.5,
                    transition: 'transform 80ms linear, opacity 80ms linear',
                  }}
                />
              )}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              const order: VoiceLang[] = ['fr-FR', 'en-US', 'ar-MA'];
              const next = order[(order.indexOf(voiceLang) + 1) % order.length];
              setVoiceLangState(next);
              setTtsLang(next);
            }}
            title="Langue"
            className="flex-shrink-0 px-2 h-7 rounded-md bg-jarvis-panel/60 border border-jarvis-border text-[0.6rem] text-jarvis-blue/80 hover:text-jarvis-blue font-display tracking-wider"
          >
            {LANG_LABELS[voiceLang]}
          </button>

          {ttsSupported && (
            <button
              type="button"
              onClick={toggleTts}
              title={ttsEnabled ? 'Couper la voix de Jarvis' : 'Activer la voix'}
              className={`flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center border transition-all ${
                ttsEnabled
                  ? speaking
                    ? 'bg-jarvis-green/20 border-jarvis-green/40 text-jarvis-green animate-pulse'
                    : 'bg-jarvis-blue/10 border-jarvis-blue/30 text-jarvis-blue'
                  : 'bg-jarvis-panel/40 border-jarvis-border text-gray-600'
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                {ttsEnabled ? (
                  <>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  </>
                ) : (
                  <line x1="23" y1="9" x2="17" y2="15" />
                )}
                {!ttsEnabled && <line x1="17" y1="9" x2="23" y2="15" />}
              </svg>
            </button>
          )}

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isListening ? 'Jarvis écoute…' : 'Parlez à Jarvis...'}
            className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 outline-none font-mono"
            disabled={isLoading}
          />

          {isListening && (
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {[0.25, 0.5, 0.75, 1].map((t) => (
                <span
                  key={t}
                  className="w-0.5 bg-red-400/70 rounded-full"
                  style={{
                    height: `${6 + volume * 18 * t}px`,
                    opacity: volume > t * 0.4 ? 1 : 0.3,
                    transition: 'height 80ms linear',
                  }}
                />
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-jarvis-blue/20 text-jarvis-blue border border-jarvis-blue/30 hover:bg-jarvis-blue/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
});

export default ChatInterface;
