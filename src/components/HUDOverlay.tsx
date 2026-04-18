'use client';

import { useEffect, useState } from 'react';
import {
  initSound,
  isSoundEnabled,
  setSoundEnabled,
  playSound,
} from '@/lib/jarvisSound';

export default function HUDOverlay() {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    initSound();
    setSoundOn(isSoundEnabled());
  }, []);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundEnabled(next);
    setSoundOn(next);
    if (next) playSound('tap');
  };

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      );
      setDate(
        now.toLocaleDateString('fr-FR', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
        <div className="flex items-center justify-between px-6 py-3">
          {/* Left - System status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-jarvis-green animate-pulse" />
              <span className="text-[0.6rem] text-jarvis-green uppercase tracking-[0.2em] font-display">
                System Online
              </span>
            </div>
            <div className="h-3 w-px bg-jarvis-border" />
            <span className="text-[0.55rem] text-gray-600 uppercase tracking-widest">
              Marouane Oulabass
            </span>
          </div>

          {/* Center - Title */}
          <div className="absolute left-1/2 -translate-x-1/2 text-center">
            <h1 className="font-display text-sm font-bold tracking-[0.3em] neon-text">
              J.A.R.V.I.S
            </h1>
            <p className="text-[0.5rem] text-gray-600 tracking-[0.15em] mt-0.5">
              JUST A RATHER VERY INTELLIGENT SYSTEM
            </p>
          </div>

          {/* Right - Time + sound */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSound}
              title={soundOn ? 'Couper les sons' : 'Activer les sons'}
              className={`pointer-events-auto w-6 h-6 rounded flex items-center justify-center border transition-all ${
                soundOn
                  ? 'bg-jarvis-blue/10 border-jarvis-blue/30 text-jarvis-blue'
                  : 'bg-jarvis-panel/40 border-jarvis-border text-gray-600'
              }`}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {soundOn ? (
                  <>
                    <path d="M9 18V6l12-3v12" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="15" r="3" />
                  </>
                ) : (
                  <>
                    <path d="M9 18V6l12-3v12" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="15" r="3" />
                    <line x1="2" y1="2" x2="22" y2="22" />
                  </>
                )}
              </svg>
            </button>
            <div className="text-right">
              <div className="text-xs text-jarvis-blue font-mono tabular-nums">
                {time}
              </div>
              <div className="text-[0.55rem] text-gray-600 uppercase tracking-wider">
                {date}
              </div>
            </div>
          </div>
        </div>

        {/* Top border line */}
        <div className="h-px bg-gradient-to-r from-transparent via-jarvis-blue/30 to-transparent" />
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
        <div className="h-px bg-gradient-to-r from-transparent via-jarvis-blue/20 to-transparent" />
        <div className="flex items-center justify-between px-6 py-2">
          <span className="text-[0.5rem] text-gray-700 tracking-widest">
            PORTFOLIO COCKPIT v1.0
          </span>
          <div className="flex items-center gap-4">
            <span className="text-[0.5rem] text-gray-700 tracking-widest">
              NEXT.JS + CLAUDE AI + THREE.JS
            </span>
            <span className="text-[0.5rem] text-gray-700">|</span>
            <span className="text-[0.5rem] text-jarvis-blue/40 tracking-widest">
              TACTILE READY
            </span>
          </div>
        </div>
      </div>

      {/* Side decorations - Left */}
      <div className="fixed left-0 top-1/2 -translate-y-1/2 z-40 pointer-events-none">
        <div className="flex flex-col items-center gap-1 px-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-jarvis-blue/20 rounded-full"
              style={{
                height: `${12 + Math.sin(i * 1.2) * 8}px`,
                opacity: 0.3 + Math.sin(i * 0.8) * 0.2,
              }}
            />
          ))}
        </div>
      </div>

      {/* Side decorations - Right */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 pointer-events-none">
        <div className="flex flex-col items-center gap-1 px-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-jarvis-blue/20 rounded-full"
              style={{
                height: `${12 + Math.cos(i * 1.2) * 8}px`,
                opacity: 0.3 + Math.cos(i * 0.8) * 0.2,
              }}
            />
          ))}
        </div>
      </div>

      {/* Background layers */}
      <div className="hud-scanlines" />
      <div className="hud-grid" />
      <div className="hex-pattern" />
      <div className="vignette" />
      <div className="scan-beam" />
    </>
  );
}
