'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  projects as allProjects,
  extractRepoName,
  type GitHubInfo,
} from '@/data/projects';
import ProjectCard from '@/components/ProjectCard';
import ChatInterface, { type ChatHandle } from '@/components/ChatInterface';
import HUDOverlay from '@/components/HUDOverlay';
import ParticleField from '@/components/ParticleField';
import PresentationMode from '@/components/PresentationMode';
import { initSound, playSound } from '@/lib/jarvisSound';

const AIOrb = dynamic(() => import('@/components/AIOrb'), {
  ssr: false,
  loading: () => (
    <div className="w-[200px] h-[200px] mx-auto flex items-center justify-center">
      <div className="w-24 h-24 rounded-full bg-jarvis-blue/10 animate-pulse" />
    </div>
  ),
});

const CLIENT_ZONE_ID = 'jarvis-client-zone';
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

interface Vec2 {
  x: number;
  y: number;
}

function constellationPos(
  i: number,
  total: number,
  maxW: number,
  maxH: number,
): Vec2 {
  if (total === 0) return { x: 0, y: 0 };
  const t = (i + 1) / (total + 0.5);
  const maxRadius = Math.min(maxW * 0.42, maxH * 0.46);
  const radius = Math.sqrt(t) * maxRadius;
  const angle = i * GOLDEN_ANGLE - Math.PI / 2;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius * 0.8,
  };
}

export default function JarvisPortal() {
  const [aiActivity, setAiActivity] = useState(0);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(
    new Set(allProjects.filter((p) => p.visible).map((p) => p.id)),
  );
  const [shownIds, setShownIds] = useState<Set<string>>(new Set());
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [introStep, setIntroStep] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);

  const [githubData, setGithubData] = useState<Record<string, GitHubInfo>>({});
  const [githubSyncedAt, setGithubSyncedAt] = useState<string | null>(null);
  const [githubTotal, setGithubTotal] = useState<number | null>(null);
  const [hoveringZoneIds, setHoveringZoneIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [presentationOn, setPresentationOn] = useState(false);
  const [clientTitle, setClientTitle] = useState<string | undefined>(undefined);
  const [shareCopied, setShareCopied] = useState(false);
  const [hydratedFromUrl, setHydratedFromUrl] = useState(false);

  const zoneRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<ChatHandle>(null);
  const [zone, setZone] = useState({ w: 800, h: 600 });

  // Boot
  useEffect(() => {
    initSound();
    const timers = [
      setTimeout(() => setIntroStep(1), 500),
      setTimeout(() => setIntroStep(2), 1500),
      setTimeout(() => setIntroStep(3), 2800),
      setTimeout(() => {
        setIntroStep(4);
        playSound('boot');
      }, 4000),
      setTimeout(() => setShowIntro(false), 5200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Hydrate from URL params once
  useEffect(() => {
    if (hydratedFromUrl || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const p = params.get('p');
    const h = params.get('h');
    const t = params.get('t');
    const validIds = (s: string) =>
      s
        .split(',')
        .map((x) => x.trim())
        .filter((id) => allProjects.some((proj) => proj.id === id));

    if (p) {
      const ids = validIds(p);
      if (ids.length > 0) {
        setShownIds(new Set(ids));
        setVisibleIds(new Set(ids));
      }
    }
    if (h) {
      const ids = validIds(h);
      if (ids.length > 0) setHighlightedIds(new Set(ids));
    }
    if (t) setClientTitle(t);
    setHydratedFromUrl(true);
  }, [hydratedFromUrl]);

  // GitHub live audit
  useEffect(() => {
    let cancelled = false;
    fetch('/api/github')
      .then((r) => r.json())
      .then((data: { repos?: GitHubInfo[]; syncedAt?: string }) => {
        if (cancelled || !data.repos) return;
        const byName: Record<string, GitHubInfo> = {};
        for (const r of data.repos) byName[r.name.toLowerCase()] = r;

        const matched: Record<string, GitHubInfo> = {};
        for (const p of allProjects) {
          const repo = extractRepoName(p.github);
          if (repo && byName[repo]) matched[p.id] = byName[repo];
        }
        setGithubData(matched);
        setGithubTotal(data.repos.length);
        if (data.syncedAt) setGithubSyncedAt(data.syncedAt);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Resize observer
  useEffect(() => {
    if (!zoneRef.current) return;
    const el = zoneRef.current;
    const ro = new ResizeObserver(() => {
      setZone({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setZone({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [showIntro]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFocusedId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const displayedProjects = useMemo(() => {
    if (shownIds.size === 0) return [];
    let list = allProjects.filter(
      (p) => visibleIds.has(p.id) && shownIds.has(p.id),
    );
    if (highlightedIds.size > 0) {
      list = [
        ...list.filter((p) => highlightedIds.has(p.id)),
        ...list.filter((p) => !highlightedIds.has(p.id)),
      ];
    }
    return list;
  }, [visibleIds, shownIds, highlightedIds]);

  const positions = useMemo(
    () =>
      displayedProjects.map((_, i) =>
        constellationPos(i, displayedProjects.length, zone.w, zone.h),
      ),
    [displayedProjects, zone.w, zone.h],
  );

  const handleAIResponse = useCallback(
    (_response: string, projectIds: string[], hideIds: string[] = []) => {
      if (hideIds.length > 0) {
        setShownIds((prev) => {
          const next = new Set(prev);
          hideIds.forEach((id) => next.delete(id));
          return next;
        });
        setVisibleIds((prev) => {
          const next = new Set(prev);
          hideIds.forEach((id) => next.delete(id));
          return next;
        });
      }
      if (projectIds.length > 0) {
        setShownIds((prev) => {
          const next = new Set(prev);
          projectIds.forEach((id) => next.add(id));
          return next;
        });
        setHighlightedIds(new Set(projectIds));
        if (window.innerWidth < 768) setChatOpen(false);
      }
    },
    [],
  );

  const handleHideProject = useCallback((id: string) => {
    setShownIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setVisibleIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setFocusedId((prev) => (prev === id ? null : prev));
  }, []);

  const handleFocus = useCallback((id: string) => {
    setFocusedId(id);
  }, []);

  const handleBlur = useCallback(() => {
    setFocusedId(null);
  }, []);

  const handleActivityChange = useCallback((active: boolean) => {
    setAiActivity(active ? 1 : 0);
  }, []);

  const handleOverZoneChange = useCallback((id: string, isOver: boolean) => {
    setHoveringZoneIds((prev) => {
      const wasEmpty = prev.size === 0;
      const next = new Set(prev);
      if (isOver) next.add(id);
      else next.delete(id);
      if (isOver && wasEmpty) playSound('dropzone-enter');
      return next;
    });
  }, []);

  const handleDroppedOnZone = useCallback((id: string) => {
    const project = allProjects.find((p) => p.id === id);
    if (!project) return;
    playSound('drop');
    setHighlightedIds(new Set([id]));
    setChatOpen(true);
    setHoveringZoneIds(new Set());
    if (navigator.vibrate) navigator.vibrate([20, 40, 60]);
    chatRef.current?.ask(
      `Prépare un pitch client percutant (3 phrases max) pour ${project.name}. Contexte : ${project.tagline}. Mets l'accent sur le ROI et le différenciateur. Renvoie aussi son ID dans projectIds.`,
    );
  }, []);

  const handleChatOpenRequest = useCallback(() => setChatOpen(true), []);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    playSound('tap');
  }, []);

  const handleStartPresentation = useCallback(() => {
    if (displayedProjects.length === 0) return;
    playSound('whoosh');
    setFocusedId(null);
    setPresentationOn(true);
  }, [displayedProjects.length]);

  const handleExitPresentation = useCallback(() => {
    setPresentationOn(false);
  }, []);

  const handleShare = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const existingTitle = clientTitle || '';
    const title = window.prompt(
      'Nom du prospect (optionnel) — affiché en haut de la vue.',
      existingTitle,
    );
    if (title === null) return;
    const trimmedTitle = title.trim();
    if (trimmedTitle) setClientTitle(trimmedTitle);
    else setClientTitle(undefined);

    const url = new URL(window.location.href);
    url.search = '';
    const shown = Array.from(shownIds);
    const highlighted = Array.from(highlightedIds);
    if (shown.length > 0) url.searchParams.set('p', shown.join(','));
    if (highlighted.length > 0)
      url.searchParams.set('h', highlighted.join(','));
    if (trimmedTitle) url.searchParams.set('t', trimmedTitle);

    try {
      await navigator.clipboard.writeText(url.toString());
      playSound('message');
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    } catch {
      playSound('error');
      // Fallback: open in new tab so user can copy manually
      window.prompt('Copiez ce lien :', url.toString());
    }
  }, [clientTitle, shownIds, highlightedIds]);

  const composeNarrative = useCallback(() => {
    if (selectedIds.size < 2) return;
    const names = allProjects
      .filter((p) => selectedIds.has(p.id))
      .map((p) => `${p.name} (${p.category})`)
      .join(', ');
    playSound('whoosh');
    setChatOpen(true);
    setHighlightedIds(new Set(selectedIds));
    chatRef.current?.ask(
      `Compose un narratif transversal pour ces projets : ${names}. Trouve le fil conducteur, propose un ordre de présentation et identifie l'angle commun pour raconter une histoire cohérente à un prospect. 4 phrases max. Renvoie leurs IDs dans projectIds.`,
    );
    setSelectedIds(new Set());
  }, [selectedIds]);

  const showAllProjects = useCallback(() => {
    const all = new Set(allProjects.filter((p) => p.visible).map((p) => p.id));
    setVisibleIds(all);
    setShownIds(all);
    setHighlightedIds(new Set());
  }, []);

  const clearAll = useCallback(() => {
    setShownIds(new Set());
    setHighlightedIds(new Set());
    setFocusedId(null);
  }, []);

  const resetLayout = useCallback(() => {
    setFocusedId(null);
    setZone((z) => ({ w: z.w, h: z.h + 0.001 }));
    requestAnimationFrame(() =>
      setZone((z) => ({ w: z.w, h: Math.round(z.h) })),
    );
  }, []);

  if (showIntro) {
    return (
      <div className="fixed inset-0 bg-jarvis-darker flex items-center justify-center z-[200]">
        <div className="text-center space-y-4">
          <AnimatePresence>
            {introStep >= 1 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="font-display text-3xl md:text-5xl font-bold tracking-[0.4em] neon-text"
              >
                J.A.R.V.I.S
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {introStep >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-gray-600 tracking-[0.2em] uppercase"
              >
                Initializing Neural Interface...
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {introStep >= 3 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center gap-3"
              >
                <div className="h-px w-16 bg-gradient-to-r from-transparent to-jarvis-blue/50" />
                <div className="w-2 h-2 rounded-full bg-jarvis-green animate-pulse" />
                <span className="text-xs text-jarvis-green tracking-widest">
                  SYSTEMS ONLINE
                </span>
                <div className="w-2 h-2 rounded-full bg-jarvis-green animate-pulse" />
                <div className="h-px w-16 bg-gradient-to-l from-transparent to-jarvis-blue/50" />
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {introStep >= 4 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[0.6rem] text-gray-700 tracking-wider"
              >
                Marouane Oulabass — Full-Stack Developer &amp; Data Engineer
              </motion.div>
            )}
          </AnimatePresence>
          <div className="w-48 mx-auto h-px bg-jarvis-border/20 mt-6 overflow-hidden rounded">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: `${(introStep / 4) * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-jarvis-blue to-jarvis-green"
            />
          </div>
        </div>
      </div>
    );
  }

  const hasProjects = displayedProjects.length > 0;
  const zoneActive = hoveringZoneIds.size > 0;

  return (
    <div className="fixed inset-0 overflow-hidden bg-jarvis-darker">
      <ParticleField activity={aiActivity} />
      <HUDOverlay />

      <AnimatePresence>
        {focusedId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleBlur}
            className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Client title banner */}
      {clientTitle && !presentationOn && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-12 left-1/2 -translate-x-1/2 z-[140] pointer-events-none"
        >
          <div className="px-4 py-1 rounded-full bg-jarvis-panel/80 border border-jarvis-blue/30 backdrop-blur-sm flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-jarvis-blue animate-pulse" />
            <span className="text-[0.6rem] text-gray-400 uppercase tracking-widest">
              Vue préparée pour
            </span>
            <span className="text-[0.65rem] text-jarvis-blue font-display tracking-wider">
              {clientTitle}
            </span>
          </div>
        </motion.div>
      )}

      {/* Presentation mode */}
      <AnimatePresence>
        {presentationOn && displayedProjects.length > 0 && (
          <PresentationMode
            projects={displayedProjects}
            githubData={githubData}
            clientTitle={clientTitle}
            onExit={handleExitPresentation}
          />
        )}
      </AnimatePresence>

      {/* Share copied toast */}
      <AnimatePresence>
        {shareCopied && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[250] pointer-events-none"
          >
            <div className="glass-card px-4 py-2 flex items-center gap-2 shadow-[0_0_25px_rgba(74,175,213,0.3)]">
              <span className="w-1.5 h-1.5 rounded-full bg-jarvis-green animate-pulse" />
              <span className="text-[0.65rem] font-display text-jarvis-blue uppercase tracking-widest">
                Lien copié dans le presse-papiers
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Multi-select toolbar */}
      <AnimatePresence>
        {selectedIds.size > 0 && !focusedId && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 250, damping: 25 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-[170]"
          >
            <div className="glass-card px-4 py-2 flex items-center gap-3 shadow-[0_0_30px_rgba(109,179,63,0.2)] border-jarvis-green/40">
              <span className="w-2 h-2 rounded-full bg-jarvis-green animate-pulse" />
              <span className="text-[0.65rem] font-display text-jarvis-green uppercase tracking-widest">
                {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}
              </span>
              <div className="h-4 w-px bg-jarvis-border/40" />
              <button
                onClick={composeNarrative}
                disabled={selectedIds.size < 2}
                className="px-3 py-1 text-[0.6rem] font-display uppercase tracking-wider rounded-md bg-jarvis-green/15 text-jarvis-green border border-jarvis-green/30 hover:bg-jarvis-green/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ↗ Composer narratif
              </button>
              <button
                onClick={clearSelection}
                className="w-6 h-6 rounded-md flex items-center justify-center text-gray-500 hover:text-jarvis-blue hover:bg-jarvis-panel transition-all"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 h-full flex flex-col pt-14 pb-10">
        {/* ---- TOP ZONE ---- */}
        <motion.div
          layout
          className={`flex-shrink-0 flex flex-col items-center transition-all duration-700 ${
            hasProjects ? 'py-1' : 'py-4 md:py-8'
          }`}
        >
          <motion.div layout transition={{ type: 'spring', stiffness: 200, damping: 30 }}>
            <AIOrb activity={aiActivity} size={hasProjects ? '110px' : '220px'} />
          </motion.div>

          {!hasProjects && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: 0.3 }}
              className="text-center mt-4 space-y-2"
            >
              <h2 className="font-display text-lg md:text-xl font-semibold tracking-[0.15em] neon-text">
                Bonjour, je suis Jarvis
              </h2>
              <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
                Parlez-moi de votre prospect ou dites &quot;montre-moi tout&quot;.
                Glissez une card vers la zone CLIENT pour un pitch.
              </p>

              <div className="flex items-center justify-center gap-6 pt-3">
                {[
                  { label: 'Projets', value: allProjects.length },
                  { label: 'Ans XP', value: '~20' },
                  {
                    label: 'Live',
                    value: allProjects.filter((p) => p.status === 'live').length,
                  },
                  ...(githubTotal !== null
                    ? [{ label: 'Repos GH', value: githubTotal }]
                    : []),
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-base font-display font-bold neon-text">
                      {stat.value}
                    </div>
                    <div className="text-[0.5rem] text-gray-600 uppercase tracking-widest">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={showAllProjects}
                className="mt-3 px-4 py-1.5 text-[0.6rem] font-display uppercase tracking-wider rounded-lg bg-jarvis-blue/10 text-jarvis-blue/70 border border-jarvis-blue/20 hover:bg-jarvis-blue/20 hover:text-jarvis-blue transition-all"
              >
                Déployer la constellation
              </button>
            </motion.div>
          )}

          {hasProjects && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 mt-1 flex-wrap justify-center px-4"
            >
              <span className="text-[0.55rem] text-gray-600 uppercase tracking-widest font-display">
                {displayedProjects.length} projet
                {displayedProjects.length > 1 ? 's' : ''}
                {highlightedIds.size > 0 &&
                  ` — ${highlightedIds.size} recommandé${highlightedIds.size > 1 ? 's' : ''}`}
              </span>
              <button
                onClick={clearAll}
                className="text-[0.55rem] text-gray-700 hover:text-jarvis-blue transition-colors uppercase tracking-wider"
              >
                Masquer tout
              </button>
              {highlightedIds.size > 0 && (
                <button
                  onClick={() => setHighlightedIds(new Set())}
                  className="text-[0.55rem] text-gray-700 hover:text-jarvis-blue transition-colors uppercase tracking-wider"
                >
                  Effacer filtre
                </button>
              )}
              <button
                onClick={showAllProjects}
                className="text-[0.55rem] text-gray-700 hover:text-jarvis-blue transition-colors uppercase tracking-wider"
              >
                Tout afficher
              </button>
              <button
                onClick={resetLayout}
                className="text-[0.55rem] text-gray-700 hover:text-jarvis-blue transition-colors uppercase tracking-wider"
              >
                ↻ Layout
              </button>
              <div className="h-3 w-px bg-jarvis-border/40" />
              <button
                onClick={handleStartPresentation}
                className="text-[0.55rem] font-display text-jarvis-green hover:text-jarvis-green/80 transition-colors uppercase tracking-[0.15em] px-2 py-1 rounded border border-jarvis-green/30 hover:bg-jarvis-green/10"
              >
                ▶ Présentation
              </button>
              <button
                onClick={handleShare}
                className="text-[0.55rem] font-display text-jarvis-blue hover:text-jarvis-blue/80 transition-colors uppercase tracking-[0.15em] px-2 py-1 rounded border border-jarvis-blue/30 hover:bg-jarvis-blue/10"
                title="Copier un lien de cette vue pour la partager"
              >
                {shareCopied ? '✓ Copié' : '↗ Partager'}
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* ---- CONSTELLATION ---- */}
        <div
          ref={zoneRef}
          className="flex-1 min-h-0 relative overflow-hidden"
        >
          <AnimatePresence>
            {displayedProjects.map((project, i) => {
              const pos = positions[i] || { x: 0, y: 0 };
              const depth =
                highlightedIds.size === 0
                  ? 1 - i / Math.max(1, displayedProjects.length)
                  : highlightedIds.has(project.id)
                  ? 1
                  : 0.3;
              return (
                <ProjectCard
                  key={project.id}
                  project={project}
                  githubInfo={githubData[project.id]}
                  initialX={pos.x}
                  initialY={pos.y}
                  depth={depth}
                  isHighlighted={highlightedIds.has(project.id)}
                  isDimmed={
                    highlightedIds.size > 0 &&
                    !highlightedIds.has(project.id) &&
                    focusedId !== project.id
                  }
                  isFocused={focusedId === project.id}
                  zIndex={
                    focusedId === project.id
                      ? 200
                      : highlightedIds.has(project.id)
                      ? 50 + (displayedProjects.length - i)
                      : 10 + (displayedProjects.length - i)
                  }
                  isSelected={selectedIds.has(project.id)}
                  clientZoneId={CLIENT_ZONE_ID}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  onHide={handleHideProject}
                  onToggleSelect={handleToggleSelect}
                  onOverZoneChange={handleOverZoneChange}
                  onDroppedOnZone={handleDroppedOnZone}
                />
              );
            })}
          </AnimatePresence>

          {/* ---- CLIENT DROP ZONE ---- */}
          {hasProjects && (
            <motion.div
              id={CLIENT_ZONE_ID}
              initial={{ opacity: 0, x: 40 }}
              animate={{
                opacity: zoneActive ? 1 : 0.5,
                x: 0,
                scale: zoneActive ? 1.05 : 1,
              }}
              transition={{ type: 'spring', stiffness: 200, damping: 22 }}
              className="pointer-events-none absolute right-4 bottom-4 md:right-6 md:bottom-6 w-[160px] md:w-[200px] h-[110px] md:h-[130px] rounded-xl overflow-hidden"
              style={{
                zIndex: 40,
                background: zoneActive
                  ? 'radial-gradient(circle, rgba(109,179,63,0.25) 0%, rgba(74,175,213,0.1) 80%)'
                  : 'radial-gradient(circle, rgba(74,175,213,0.1) 0%, rgba(74,175,213,0.02) 80%)',
                border: `1.5px dashed ${zoneActive ? 'rgba(109,179,63,0.7)' : 'rgba(74,175,213,0.35)'}`,
                boxShadow: zoneActive
                  ? '0 0 30px rgba(109,179,63,0.5), inset 0 0 25px rgba(109,179,63,0.2)'
                  : '0 0 12px rgba(74,175,213,0.15), inset 0 0 12px rgba(74,175,213,0.08)',
              }}
            >
              <div className="flex flex-col items-center justify-center h-full gap-1 p-2">
                {/* Crosshair */}
                <motion.svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  animate={{ rotate: zoneActive ? 360 : 0 }}
                  transition={{
                    duration: zoneActive ? 4 : 0.5,
                    repeat: zoneActive ? Infinity : 0,
                    ease: 'linear',
                  }}
                  className={zoneActive ? 'text-jarvis-green' : 'text-jarvis-blue/70'}
                >
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="12" cy="12" r="1" fill="currentColor" />
                  <line x1="12" y1="2" x2="12" y2="6" />
                  <line x1="12" y1="18" x2="12" y2="22" />
                  <line x1="2" y1="12" x2="6" y2="12" />
                  <line x1="18" y1="12" x2="22" y2="12" />
                </motion.svg>
                <span
                  className={`text-[0.55rem] font-display tracking-[0.2em] uppercase ${
                    zoneActive ? 'text-jarvis-green' : 'text-jarvis-blue/70'
                  }`}
                >
                  {zoneActive ? 'Relâcher ici' : 'Zone client'}
                </span>
                <span className="text-[0.5rem] text-gray-600 tracking-wider text-center leading-tight">
                  {zoneActive ? 'Pitch en cours…' : 'Glissez une card pour générer un pitch'}
                </span>
              </div>
              <div className="hud-corner hud-corner--tl absolute top-0 left-0" />
              <div className="hud-corner hud-corner--tr absolute top-0 right-0" />
              <div className="hud-corner hud-corner--bl absolute bottom-0 left-0" />
              <div className="hud-corner hud-corner--br absolute bottom-0 right-0" />
            </motion.div>
          )}

          {/* GitHub sync badge */}
          {githubSyncedAt && (
            <div className="absolute left-3 bottom-3 pointer-events-none text-[0.5rem] tracking-widest uppercase font-display flex items-center gap-1.5 text-gray-700">
              <span
                className="w-1 h-1 rounded-full bg-jarvis-green"
                style={{ boxShadow: '0 0 6px rgba(109,179,63,0.8)' }}
              />
              GitHub Sync ·{' '}
              {new Date(githubSyncedAt).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
              {githubTotal !== null && ` · ${githubTotal} repos`}
            </div>
          )}

          {!hasProjects && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-gray-700 text-[0.65rem] tracking-[0.2em] uppercase font-display opacity-70">
                — Constellation vide —
                <br />
                <span className="text-gray-800 text-[0.55rem]">
                  Parlez à Jarvis pour déployer les projets
                </span>
              </div>
            </div>
          )}

          {hasProjects && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.7, 0.7, 0] }}
              transition={{ duration: 5, times: [0, 0.1, 0.7, 1] }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none"
            >
              <div className="flex gap-4 text-[0.55rem] text-gray-600 uppercase tracking-widest flex-wrap justify-center">
                <span>Glisser</span>
                <span className="text-gray-800">•</span>
                <span>Pincer</span>
                <span className="text-gray-800">•</span>
                <span>Balayer ↑ masquer</span>
                <span className="text-gray-800">•</span>
                <span>Glisser sur cible → pitch</span>
                <span className="text-gray-800">•</span>
                <span>Maintenir → sélectionner</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* ---- CHAT DOCK ---- */}
        <div className="flex-shrink-0 px-3 md:px-8 relative z-[180]">
          <motion.div
            layout
            className={`glass-card overflow-hidden transition-all duration-300 ${
              chatOpen ? 'max-h-[50vh]' : 'max-h-[56px]'
            }`}
          >
            <button
              onClick={() => setChatOpen((o) => !o)}
              className="w-full px-4 py-2 flex items-center justify-between border-b border-jarvis-border/20"
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    aiActivity > 0.5
                      ? 'bg-jarvis-blue animate-pulse'
                      : 'bg-jarvis-green animate-pulse-slow'
                  }`}
                />
                <span className="text-[0.6rem] font-display text-jarvis-blue uppercase tracking-[0.15em]">
                  {aiActivity > 0.5 ? 'Jarvis analyse...' : 'Parler à Jarvis'}
                </span>
              </div>
              <motion.svg
                animate={{ rotate: chatOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-gray-600"
              >
                <polyline points="18 15 12 9 6 15" />
              </motion.svg>
            </button>

            <div
              className={`transition-all duration-300 ${
                chatOpen ? 'h-[calc(50vh-40px)]' : 'h-0'
              } overflow-hidden`}
            >
              <ChatInterface
                ref={chatRef}
                onAIResponse={handleAIResponse}
                onActivityChange={handleActivityChange}
                onOpenRequest={handleChatOpenRequest}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
