'use client';

export type TtsLang = 'fr-FR' | 'en-US' | 'ar-MA';

let enabled = true;
let lang: TtsLang = 'fr-FR';
let initialized = false;

const STORAGE_KEY = 'jarvis-tts-enabled';
const LANG_KEY = 'jarvis-tts-lang';

function init() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) enabled = stored === '1';
    const storedLang = localStorage.getItem(LANG_KEY);
    if (storedLang === 'fr-FR' || storedLang === 'en-US' || storedLang === 'ar-MA') {
      lang = storedLang;
    }
  } catch {
    // ignore
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }
}

function pickBestVoice(l: TtsLang): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  const prefix = l.split('-')[0];
  const matches = voices.filter((v) => v.lang.startsWith(prefix));
  if (matches.length === 0) return voices[0] || null;
  const premium = matches.find((v) => /google|neural|premium|aurelie|paul|natural/i.test(v.name));
  return premium || matches[0];
}

export function speakJarvis(
  text: string,
  callbacks?: { onStart?: () => void; onEnd?: () => void },
) {
  init();
  if (!enabled) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (!text) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const voice = pickBestVoice(lang);
    if (voice) utter.voice = voice;
    utter.lang = voice?.lang || lang;
    utter.rate = 1.02;
    utter.pitch = 1.02;
    utter.volume = 1;
    utter.onstart = () => callbacks?.onStart?.();
    utter.onend = () => callbacks?.onEnd?.();
    utter.onerror = () => callbacks?.onEnd?.();
    window.speechSynthesis.speak(utter);
  } catch {
    // silent
  }
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function setTtsEnabled(v: boolean) {
  init();
  enabled = v;
  if (!v) stopSpeaking();
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, v ? '1' : '0');
    } catch {
      // ignore
    }
  }
}

export function isTtsEnabled(): boolean {
  init();
  return enabled;
}

export function setTtsLang(l: TtsLang) {
  init();
  lang = l;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      // ignore
    }
  }
}

export function getTtsLang(): TtsLang {
  init();
  return lang;
}

export function isTtsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}
