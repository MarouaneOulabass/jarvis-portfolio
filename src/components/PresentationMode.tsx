'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Project, GitHubInfo } from '@/data/projects';
import { playSound } from '@/lib/jarvisSound';
import { speakJarvis, stopSpeaking } from '@/lib/speak';

interface PresentationModeProps {
  projects: Project[];
  githubData: Record<string, GitHubInfo>;
  clientTitle?: string;
  onExit: () => void;
}

const AUTO_ADVANCE_MS = 15000;

const statusColor: Record<string, string> = {
  live: '#6DB33F',
  development: '#4AAFD5',
  spec: '#FFC107',
  concept: '#CE93D8',
};

export default function PresentationMode({
  projects,
  githubData,
  clientTitle,
  onExit,
}: PresentationModeProps) {
  const [index, setIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [progress, setProgress] = useState(0);
  const spokenRef = useRef<Set<number>>(new Set());
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(Date.now());

  const safeTotal = Math.max(projects.length, 1);
  const project = projects[index] || projects[0];

  const next = useCallback(() => {
    playSound('tap');
    setIndex((i) => (i + 1) % safeTotal);
    startRef.current = Date.now();
  }, [safeTotal]);

  const prev = useCallback(() => {
    playSound('tap');
    setIndex((i) => (i - 1 + safeTotal) % safeTotal);
    startRef.current = Date.now();
  }, [safeTotal]);

  const togglePlay = useCallback(() => {
    playSound('tap');
    setAutoPlay((p) => !p);
    startRef.current = Date.now();
  }, []);

  const exit = useCallback(() => {
    playSound('whoosh');
    if (typeof window !== 'undefined' && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    onExit();
  }, [onExit]);

  // Fullscreen on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const req = document.documentElement.requestFullscreen?.bind(
      document.documentElement,
    );
    if (req) req().catch(() => {});
    playSound('boot');
    return () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, []);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        prev();
      } else if (e.key === 'Escape') {
        exit();
      } else if (e.key === 'p' || e.key === 'P') {
        togglePlay();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, exit, togglePlay]);

  // Auto-advance timer
  useEffect(() => {
    if (!autoPlay) {
      setProgress(0);
      return;
    }
    startRef.current = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const p = Math.min(1, elapsed / AUTO_ADVANCE_MS);
      setProgress(p);
      if (p >= 1) {
        setIndex((i) => (i + 1) % safeTotal);
        startRef.current = Date.now();
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [autoPlay, safeTotal, index]);

  // TTS narration per slide
  useEffect(() => {
    if (!project) return;
    if (spokenRef.current.has(index)) return;
    spokenRef.current.add(index);
    speakJarvis(`${project.name}. ${project.tagline}.`);
  }, [index, project]);

  useEffect(() => () => stopSpeaking(), []);

  if (!project) return null;

  const gh = githubData[project.id];
  const color = statusColor[project.status] || '#4AAFD5';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-jarvis-darker overflow-hidden"
    >
      {/* Ambient grid + scan */}
      <div className="hud-grid" />
      <div className="hud-scanlines" />
      <div className="vignette" />
      <div className="scan-beam" />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-jarvis-green animate-pulse" />
          <span className="text-[0.6rem] font-display text-jarvis-green uppercase tracking-[0.2em]">
            PRESENTATION MODE
          </span>
          {clientTitle && (
            <>
              <span className="h-3 w-px bg-jarvis-border" />
              <span className="text-[0.6rem] text-gray-400 uppercase tracking-widest">
                Pour : <span className="text-jarvis-blue">{clientTitle}</span>
              </span>
            </>
          )}
        </div>

        <div className="text-[0.6rem] text-gray-500 font-display tracking-widest">
          {String(index + 1).padStart(2, '0')} / {String(safeTotal).padStart(2, '0')}
        </div>

        <button
          onClick={exit}
          className="pointer-events-auto px-3 py-1 text-[0.6rem] font-display uppercase tracking-wider rounded-md bg-jarvis-panel/40 border border-jarvis-border text-gray-400 hover:text-jarvis-blue hover:border-jarvis-blue/40 transition-all"
        >
          Esc · Sortir
        </button>
      </div>

      {/* Slide stage */}
      <div className="absolute inset-0 flex items-center justify-center p-8 md:p-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.95, filter: 'blur(8px)' }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-5xl"
          >
            <div className="glass-card p-8 md:p-12 relative">
              {/* Category + status */}
              <div className="flex items-center gap-3 mb-5">
                <span
                  className="px-3 py-1 text-[0.65rem] rounded-full font-display uppercase tracking-widest"
                  style={{
                    background: `${color}20`,
                    color,
                    border: `1px solid ${color}40`,
                  }}
                >
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle"
                    style={{ background: color, boxShadow: `0 0 6px ${color}` }}
                  />
                  {project.statusLabel}
                </span>
                <span className="text-[0.6rem] text-gray-500 uppercase tracking-[0.2em]">
                  {project.category}
                </span>
                {gh && (
                  <span className="ml-auto text-[0.6rem] text-gray-600 font-mono flex items-center gap-2">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" className="text-jarvis-green/70">
                      <path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279L12 19.771l-7.416 3.642 1.48-8.279L.001 9.306l8.332-1.151z" />
                    </svg>
                    {gh.stars}
                    <span className="text-gray-700">•</span>
                    <span>{gh.language || ''}</span>
                  </span>
                )}
              </div>

              {/* Title */}
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="font-display text-3xl md:text-5xl font-bold neon-text mb-3 tracking-wide"
              >
                {project.name}
              </motion.h1>

              {/* Tagline */}
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="text-base md:text-lg text-jarvis-blue/80 mb-6 font-light"
              >
                {project.tagline}
              </motion.p>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="text-sm md:text-base text-gray-300 leading-relaxed mb-6 max-w-3xl"
              >
                {project.description}
              </motion.p>

              {/* Highlights grid */}
              <motion.ul
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6"
              >
                {project.highlights.map((h, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.08 }}
                    className="flex items-start gap-2.5 text-sm text-gray-300"
                  >
                    <span className="text-jarvis-green mt-1 text-[0.6rem]">▶</span>
                    {h}
                  </motion.li>
                ))}
              </motion.ul>

              {/* Stack */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="flex flex-wrap gap-2 mb-6"
              >
                {project.stack.map((tech) => (
                  <span
                    key={tech}
                    className="px-2.5 py-1 text-[0.7rem] rounded bg-jarvis-panel border border-jarvis-border text-jarvis-blue font-mono"
                  >
                    {tech}
                  </span>
                ))}
              </motion.div>

              {/* Links */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="flex gap-3 flex-wrap"
              >
                {project.github && (
                  <a
                    href={project.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-[0.75rem] rounded border border-jarvis-border text-jarvis-blue hover:bg-jarvis-panel transition-colors uppercase tracking-widest font-display"
                  >
                    ↗ GitHub
                  </a>
                )}
                {project.demo && (
                  <a
                    href={project.demo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-[0.75rem] rounded border border-jarvis-green/40 text-jarvis-green hover:bg-jarvis-green/10 transition-colors uppercase tracking-widest font-display"
                  >
                    ↗ Demo Live
                  </a>
                )}
              </motion.div>

              <div className="hud-corner hud-corner--tl absolute top-0 left-0" />
              <div className="hud-corner hud-corner--tr absolute top-0 right-0" />
              <div className="hud-corner hud-corner--bl absolute bottom-0 left-0" />
              <div className="hud-corner hud-corner--br absolute bottom-0 right-0" />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer controls */}
      <div className="absolute bottom-0 left-0 right-0 z-10 px-6 py-4">
        {/* Progress bar */}
        {autoPlay && (
          <div className="w-full h-px bg-jarvis-border/30 mb-3 rounded overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-jarvis-blue to-jarvis-green"
              style={{ width: `${progress * 100}%` }}
              transition={{ ease: 'linear' }}
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-[0.55rem] text-gray-600 tracking-widest uppercase">
            ← → Navigate · P Play/Pause · Esc Exit
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={prev}
              className="pointer-events-auto w-9 h-9 rounded-full bg-jarvis-panel border border-jarvis-border text-jarvis-blue hover:bg-jarvis-blue/10 transition-all flex items-center justify-center"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              onClick={togglePlay}
              className="pointer-events-auto w-11 h-11 rounded-full bg-jarvis-blue/20 border border-jarvis-blue/40 text-jarvis-blue hover:bg-jarvis-blue/30 transition-all flex items-center justify-center"
            >
              {autoPlay ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21" />
                </svg>
              )}
            </button>
            <button
              onClick={next}
              className="pointer-events-auto w-9 h-9 rounded-full bg-jarvis-panel border border-jarvis-border text-jarvis-blue hover:bg-jarvis-blue/10 transition-all flex items-center justify-center"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          {/* Dot indicators */}
          <div className="flex items-center gap-1.5">
            {projects.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  playSound('tap');
                  setIndex(i);
                  startRef.current = Date.now();
                }}
                className={`transition-all rounded-full ${
                  i === index
                    ? 'w-6 h-1.5 bg-jarvis-blue'
                    : 'w-1.5 h-1.5 bg-jarvis-border hover:bg-jarvis-blue/40'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
