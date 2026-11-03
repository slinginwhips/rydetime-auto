"use client";

/**
 * SpinViewer — drag-to-spin 360 viewer for a walk-around shot in the DMS.
 *
 * Ported from the DMS's spin-viewer (same feel: one container-width drag is
 * one full turn, a flick coasts, auto-rotate once every frame is in and
 * stops at the first touch) without its framer-motion/lucide dependencies.
 * Frames preload coarse-first so the car is spinnable after a few frames;
 * drawing goes through a canvas so frame changes never wait on an <img>.
 */

import { useCallback, useEffect, useReducer, useRef, useState } from "react";

const FRICTION = 0.94;
const MIN_VELOCITY = 0.02; // frames per 16ms

function wrapFrame(index: number, count: number): number {
  if (count <= 0) return 0;
  return ((Math.round(index) % count) + count) % count;
}

/** Every 4th frame first, then the gaps. */
function preloadOrder(count: number, stride = 4): number[] {
  const order: number[] = [];
  for (let phase = 0; phase < stride; phase++) {
    for (let i = phase; i < count; i += stride) order.push(i);
  }
  return order;
}

/** Closest loaded frame to `target`, going around the circle. */
function nearestLoaded(target: number, loaded: ReadonlySet<number>, count: number): number | null {
  if (count <= 0 || loaded.size === 0) return null;
  const t = wrapFrame(target, count);
  if (loaded.has(t)) return t;
  let best: number | null = null;
  let bestDist = Infinity;
  for (const i of loaded) {
    const raw = Math.abs(i - t);
    const dist = Math.min(raw, count - raw);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

/** One turn every ~5s, clamped so small sets don't strobe. */
function autoRotateMs(count: number): number {
  return Math.min(200, Math.max(66, Math.round(5000 / Math.max(1, count))));
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export default function SpinViewer({
  frames,
  aspect,
  alt,
}: {
  frames: { url: string }[];
  aspect: number | null;
  alt: string;
}) {
  const count = frames.length;
  const reducedMotion = usePrefersReducedMotion();
  // Portrait frames would crop badly in the 4:3 box — letterbox them instead.
  const contain = aspect !== null && aspect < 1;

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<(HTMLImageElement | null)[]>([]);
  const loadedRef = useRef<Set<number>>(new Set());
  const [loadedCount, setLoadedCount] = useState(0);
  const indexRef = useRef(0);
  const [, forceRender] = useReducer((n: number) => n + 1, 0);
  const [interacted, setInteracted] = useState(false);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const autoTimerRef = useRef<number | null>(null);
  const inertiaRef = useRef<number | null>(null);
  const framesKey = frames.map((f) => f.url).join("|");
  const allLoaded = count > 0 && loadedCount >= count;

  useEffect(() => {
    let cancelled = false;
    imagesRef.current = new Array<HTMLImageElement | null>(count).fill(null);
    loadedRef.current = new Set();
    indexRef.current = 0;
    setLoadedCount(0);
    for (const i of preloadOrder(count)) {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        if (cancelled) return;
        imagesRef.current[i] = img;
        loadedRef.current.add(i);
        setLoadedCount(loadedRef.current.size);
      };
      img.src = frames[i].url;
    }
    return () => {
      cancelled = true;
    };
    // Reload only when the frame list itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [framesKey]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const shown = nearestLoaded(indexRef.current, loadedRef.current, count);
    const img = shown === null ? null : imagesRef.current[shown];
    if (!img) return;
    const dpr = window.devicePixelRatio || 1;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (cw === 0 || ch === 0) return;
    if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const fit = contain ? Math.min : Math.max;
    const scale = fit((cw * dpr) / img.naturalWidth, (ch * dpr) / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
  }, [count, contain]);

  useEffect(() => {
    draw();
  });
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => draw());
    observer.observe(container);
    return () => observer.disconnect();
  }, [draw]);

  const setIndex = useCallback(
    (next: number) => {
      indexRef.current = wrapFrame(next, count);
      forceRender();
    },
    [count]
  );

  const stopAuto = useCallback(() => {
    if (autoTimerRef.current !== null) {
      window.clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }
    setAutoPlaying(false);
  }, []);

  const startAuto = useCallback(() => {
    if (count < 2 || autoTimerRef.current !== null) return;
    autoTimerRef.current = window.setInterval(() => setIndex(indexRef.current + 1), autoRotateMs(count));
    setAutoPlaying(true);
  }, [count, setIndex]);

  useEffect(() => {
    if (allLoaded && !interacted && !reducedMotion) startAuto();
    return stopAuto;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allLoaded]);

  const stopInertia = useCallback(() => {
    if (inertiaRef.current !== null) {
      window.cancelAnimationFrame(inertiaRef.current);
      inertiaRef.current = null;
    }
  }, []);
  useEffect(() => () => stopInertia(), [stopInertia]);

  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startIndex: number;
    lastX: number;
    lastT: number;
    velocity: number;
  } | null>(null);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (count < 2) return;
    stopAuto();
    stopInertia();
    setInteracted(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startIndex: indexRef.current,
      lastX: e.clientX,
      lastT: performance.now(),
      velocity: 0,
    };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const container = containerRef.current;
    if (!drag || drag.pointerId !== e.pointerId || !container) return;
    const width = container.clientWidth || 1;
    // A full-width drag is one full turn; dragging right rewinds.
    setIndex(drag.startIndex - ((e.clientX - drag.startX) / width) * count);
    const now = performance.now();
    const dt = now - drag.lastT;
    if (dt > 0) {
      drag.velocity = ((-(e.clientX - drag.lastX) / width) * count * 16) / dt;
      drag.lastX = e.clientX;
      drag.lastT = now;
    }
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    if (reducedMotion) return;
    let velocity = drag.velocity;
    let position = indexRef.current;
    if (Math.abs(velocity) < MIN_VELOCITY * 4) return;
    const tick = () => {
      velocity *= FRICTION;
      position += velocity;
      setIndex(position);
      inertiaRef.current = Math.abs(velocity) > MIN_VELOCITY ? window.requestAnimationFrame(tick) : null;
    };
    inertiaRef.current = window.requestAnimationFrame(tick);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    stopAuto();
    stopInertia();
    setInteracted(true);
    setIndex(indexRef.current + (e.key === "ArrowRight" ? 1 : -1));
  }

  if (count === 0) return null;
  const firstReady = loadedCount > 0;
  const pct = Math.round((loadedCount / count) * 100);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={`${alt} — 360° spin. Drag or use the arrow keys to turn the vehicle.`}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      className="relative aspect-[4/3] w-full cursor-grab touch-pan-y select-none overflow-hidden bg-background-card outline-none focus-visible:ring-2 focus-visible:ring-accent active:cursor-grabbing"
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {firstReady && !interacted && (
        <span className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-background/70 px-3 py-1.5 text-xs font-medium text-text-primary backdrop-blur">
          Drag to spin
        </span>
      )}

      {allLoaded && count > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setInteracted(true);
            stopInertia();
            if (autoPlaying) stopAuto();
            else startAuto();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={autoPlaying ? "Pause auto-rotate" : "Auto-rotate"}
          className="absolute bottom-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-background/70 text-text-primary backdrop-blur transition-colors hover:bg-accent"
        >
          {autoPlaying ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
            </svg>
          )}
        </button>
      )}

      {!firstReady ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-text-muted">
          Loading 360° view…
        </div>
      ) : !allLoaded ? (
        <div
          className="absolute inset-x-0 bottom-0 z-10 h-0.5 bg-black/20"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Loading 360° view"
        >
          <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
      ) : null}
    </div>
  );
}
