'use client';

import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  type PanInfo,
} from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { Project, GitHubInfo } from '@/data/projects';
import { playSound } from '@/lib/jarvisSound';

interface ProjectCardProps {
  project: Project;
  githubInfo?: GitHubInfo;
  initialX: number;
  initialY: number;
  depth: number;
  isHighlighted: boolean;
  isDimmed: boolean;
  isFocused: boolean;
  isSelected?: boolean;
  zIndex: number;
  clientZoneId?: string;
  onFocus: (id: string) => void;
  onBlur: () => void;
  onHide: (id: string) => void;
  onToggleSelect?: (id: string) => void;
  onOverZoneChange?: (id: string, isOver: boolean) => void;
  onDroppedOnZone?: (id: string) => void;
}

function timeAgo(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const days = Math.floor(d / (1000 * 60 * 60 * 24));
  if (days < 1) return "aujourd'hui";
  if (days < 7) return `${days}j`;
  if (days < 30) return `${Math.floor(days / 7)}sem`;
  if (days < 365) return `${Math.floor(days / 30)}mois`;
  return `${Math.floor(days / 365)}an${Math.floor(days / 365) > 1 ? 's' : ''}`;
}

function rectsOverlap(a: DOMRect, b: DOMRect): boolean {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

const statusClass: Record<string, string> = {
  live: 'status-badge--live',
  development: 'status-badge--dev',
  spec: 'status-badge--spec',
  concept: 'status-badge--concept',
};

const statusColor: Record<string, { fill: string; glow: string }> = {
  live: { fill: '#6DB33F', glow: 'rgba(109,179,63,0.6)' },
  development: { fill: '#4AAFD5', glow: 'rgba(74,175,213,0.6)' },
  spec: { fill: '#FFC107', glow: 'rgba(255,193,7,0.6)' },
  concept: { fill: '#CE93D8', glow: 'rgba(206,147,216,0.6)' },
};

export default function ProjectCard({
  project,
  githubInfo,
  initialX,
  initialY,
  depth,
  isHighlighted,
  isDimmed,
  isFocused,
  isSelected,
  zIndex,
  clientZoneId,
  onFocus,
  onBlur,
  onHide,
  onToggleSelect,
  onOverZoneChange,
  onDroppedOnZone,
}: ProjectCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const x = useMotionValue(initialX);
  const y = useMotionValue(initialY);
  const userScale = useMotionValue(1);
  const scale = userScale;
  const rotateZ = useTransform(x, [-600, 0, 600], [-6, 0, 6]);

  const [isDragging, setIsDragging] = useState(false);
  const [justFocused, setJustFocused] = useState(false);
  const overZoneRef = useRef(false);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressFiredRef = useRef(false);

  // Sync position to constellation target (focused → center, else → initial)
  useEffect(() => {
    if (isDragging) return;
    if (isFocused) {
      animate(x, 0, { type: 'spring', stiffness: 220, damping: 28 });
      animate(y, 0, { type: 'spring', stiffness: 220, damping: 28 });
      animate(userScale, 1.35, { type: 'spring', stiffness: 220, damping: 28 });
    } else {
      animate(x, initialX, { type: 'spring', stiffness: 130, damping: 26 });
      animate(y, initialY, { type: 'spring', stiffness: 130, damping: 26 });
      animate(userScale, 1, { type: 'spring', stiffness: 200, damping: 26 });
    }
  }, [initialX, initialY, isFocused, isDragging, x, y, userScale]);

  // Pinch-to-zoom (touch only — wheel handled separately)
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    let startDist = 0;
    let startScale = 1;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        startDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
        startScale = userScale.get();
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && startDist > 0) {
        e.preventDefault();
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
        const next = Math.max(0.5, Math.min(2.5, (startScale * d) / startDist));
        userScale.set(next);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) startDist = 0;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [userScale]);

  // Wheel zoom on desktop
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!el.matches(':hover')) return;
      e.preventDefault();
      const current = userScale.get();
      const next = Math.max(0.5, Math.min(2.5, current - e.deltaY * 0.0015));
      userScale.set(next);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [userScale]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    setIsDragging(false);

    // Swipe up with velocity → hide
    if (info.velocity.y < -900 || info.offset.y < -280) {
      playSound('whoosh');
      onHide(project.id);
      return;
    }

    // Drop on client zone → generate pitch
    if (clientZoneId && cardRef.current && onDroppedOnZone) {
      const zoneEl = document.getElementById(clientZoneId);
      if (zoneEl) {
        const cardRect = cardRef.current.getBoundingClientRect();
        const zoneRect = zoneEl.getBoundingClientRect();
        if (rectsOverlap(cardRect, zoneRect)) {
          onDroppedOnZone(project.id);
          if (overZoneRef.current) {
            overZoneRef.current = false;
            onOverZoneChange?.(project.id, false);
          }
          return;
        }
      }
    }

    if (overZoneRef.current) {
      overZoneRef.current = false;
      onOverZoneChange?.(project.id, false);
    }
  };

  const handleDrag = () => {
    if (!clientZoneId || !cardRef.current || !onOverZoneChange) return;
    const zoneEl = document.getElementById(clientZoneId);
    if (!zoneEl) return;
    const cardRect = cardRef.current.getBoundingClientRect();
    const zoneRect = zoneEl.getBoundingClientRect();
    const isOver = rectsOverlap(cardRect, zoneRect);
    if (isOver !== overZoneRef.current) {
      overZoneRef.current = isOver;
      onOverZoneChange(project.id, isOver);
    }
  };

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTapStart = () => {
    if (!onToggleSelect) return;
    longPressFiredRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      longPressFiredRef.current = true;
      if (navigator.vibrate) navigator.vibrate(30);
      playSound('tap');
      onToggleSelect(project.id);
    }, 550);
  };

  const handleTapCancel = () => clearLongPress();

  const handleTap = () => {
    clearLongPress();
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }
    if (isDragging) return;
    if (isFocused) {
      playSound('tap');
      onBlur();
    } else {
      playSound('focus');
      onFocus(project.id);
      setJustFocused(true);
      setTimeout(() => setJustFocused(false), 400);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!onToggleSelect) return;
    e.preventDefault();
    e.stopPropagation();
    playSound('tap');
    onToggleSelect(project.id);
  };

  useEffect(() => () => clearLongPress(), []);

  const color = statusColor[project.status] || statusColor.development;

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        zIndex: isFocused ? 200 : zIndex,
      }}
    >
    <motion.div
      ref={cardRef}
      drag
      dragMomentum
      dragElastic={0.25}
      onDragStart={() => {
        setIsDragging(true);
        clearLongPress();
      }}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      onTapStart={handleTapStart}
      onTapCancel={handleTapCancel}
      onTap={handleTap}
      onContextMenu={handleContextMenu}
      style={{
        x,
        y,
        scale,
        rotateZ: isFocused ? 0 : rotateZ,
        touchAction: 'none',
        willChange: 'transform',
        translateX: '-50%',
        translateY: '-50%',
      }}
      animate={{
        opacity: isDimmed ? 0.25 : 1,
        filter: isDimmed ? 'blur(2px)' : 'blur(0px)',
      }}
      initial={{ opacity: 0 }}
      whileHover={{
        boxShadow: '0 10px 40px rgba(74,175,213,0.2)',
      }}
      transition={{
        opacity: { duration: 0.4 },
        filter: { duration: 0.4 },
      }}
      className={`glass-card select-none cursor-grab active:cursor-grabbing ${
        isFocused ? 'w-[min(680px,90vw)] p-6' : 'w-[210px] p-3'
      } ${isSelected ? 'ring-2 ring-jarvis-green/60 shadow-[0_0_25px_rgba(109,179,63,0.35)]' : ''}`}
    >
      {/* Selection badge */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-jarvis-green text-jarvis-darker flex items-center justify-center font-bold text-[0.7rem] z-10 shadow-[0_0_15px_rgba(109,179,63,0.7)]"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </motion.div>
      )}

      {/* Depth halo (only when not dragging/focused) */}
      {!isFocused && isHighlighted && (
        <motion.div
          className="absolute -inset-2 rounded-xl pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${color.glow} 0%, transparent 70%)`,
            opacity: 0.35,
          }}
          animate={{ opacity: [0.25, 0.5, 0.25] }}
          transition={{ duration: 2.4, repeat: Infinity }}
        />
      )}

      {/* Status + category */}
      <div className="flex items-center justify-between mb-2.5">
        <span className={`status-badge ${statusClass[project.status] || ''}`}>
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: color.fill, boxShadow: `0 0 6px ${color.glow}` }}
          />
          {project.statusLabel}
        </span>
        <span className="text-[0.55rem] text-gray-500 uppercase tracking-widest">
          {project.category}
        </span>
      </div>

      {/* Title */}
      <h3
        className={`font-display font-semibold neon-text mb-1 tracking-wide ${
          isFocused ? 'text-xl' : 'text-sm'
        }`}
      >
        {project.name}
      </h3>

      {/* Tagline */}
      <p
        className={`text-gray-400 mb-2.5 leading-relaxed ${
          isFocused ? 'text-sm' : 'text-[0.7rem]'
        }`}
      >
        {project.tagline}
      </p>

      {/* GitHub live badge */}
      {githubInfo && (
        <div className="flex items-center gap-2 mb-2 text-[0.55rem] text-gray-500 font-mono">
          <span className="flex items-center gap-1">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" className="text-jarvis-green/80">
              <path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279L12 19.771l-7.416 3.642 1.48-8.279L.001 9.306l8.332-1.151z" />
            </svg>
            <span>{githubInfo.stars}</span>
          </span>
          <span className="text-gray-700">•</span>
          <span>push {timeAgo(githubInfo.pushedAt)}</span>
          {githubInfo.language && (
            <>
              <span className="text-gray-700">•</span>
              <span className="text-jarvis-blue/70">{githubInfo.language}</span>
            </>
          )}
          <span
            className="ml-auto w-1 h-1 rounded-full bg-jarvis-green"
            style={{ boxShadow: '0 0 5px rgba(109,179,63,0.7)' }}
            title="Synced with GitHub live"
          />
        </div>
      )}

      {/* Stack */}
      <div className="flex flex-wrap gap-1 mb-2">
        {project.stack.slice(0, isFocused ? 20 : 3).map((tech) => (
          <span
            key={tech}
            className="px-1.5 py-0.5 text-[0.55rem] rounded bg-jarvis-panel border border-jarvis-border text-jarvis-blue"
          >
            {tech}
          </span>
        ))}
        {!isFocused && project.stack.length > 3 && (
          <span className="px-1.5 py-0.5 text-[0.55rem] text-gray-600">
            +{project.stack.length - 3}
          </span>
        )}
      </div>

      {/* Expanded content */}
      {isFocused && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <p className="text-xs text-gray-400 mb-3 leading-relaxed">
            {project.description}
          </p>

          <ul className="space-y-1.5 mb-4">
            {project.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                <span className="text-jarvis-green mt-0.5 text-[0.5rem]">&#9654;</span>
                {h}
              </li>
            ))}
          </ul>

          <div className="flex gap-2 flex-wrap">
            {project.github && (
              <a
                href={project.github}
                target="_blank"
                rel="noopener noreferrer"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="px-3 py-1.5 text-[0.65rem] rounded border border-jarvis-border text-jarvis-blue hover:bg-jarvis-panel transition-colors uppercase tracking-wider"
              >
                GitHub
              </a>
            )}
            {project.demo && (
              <a
                href={project.demo}
                target="_blank"
                rel="noopener noreferrer"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="px-3 py-1.5 text-[0.65rem] rounded border border-green-900/30 text-jarvis-green hover:bg-green-900/10 transition-colors uppercase tracking-wider"
              >
                Demo Live
              </a>
            )}
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onHide(project.id);
              }}
              className="px-3 py-1.5 text-[0.65rem] rounded border border-red-900/30 text-red-400 hover:bg-red-900/10 transition-colors uppercase tracking-wider ml-auto"
            >
              Masquer
            </button>
          </div>
        </motion.div>
      )}

      {/* HUD corners */}
      <div className="hud-corner hud-corner--tl absolute top-0 left-0" />
      <div className="hud-corner hud-corner--tr absolute top-0 right-0" />
      <div className="hud-corner hud-corner--bl absolute bottom-0 left-0" />
      <div className="hud-corner hud-corner--br absolute bottom-0 right-0" />

      {/* Depth indicator light (top-right tiny) */}
      {!isFocused && (
        <div
          className="absolute top-1.5 right-1.5 w-1 h-1 rounded-full pointer-events-none"
          style={{
            background: color.fill,
            boxShadow: `0 0 8px ${color.glow}`,
            opacity: 0.4 + depth * 0.5,
          }}
        />
      )}

      {/* Focus flash */}
      {justFocused && (
        <motion.div
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{ background: 'rgba(74,175,213,0.35)', mixBlendMode: 'overlay' }}
          initial={{ opacity: 0.8 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        />
      )}
    </motion.div>
    </div>
  );
}
