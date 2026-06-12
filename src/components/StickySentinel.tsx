"use client";

import { useEffect, useRef } from "react";

interface StickySentinelProps {
  /** id of the element that receives the `.is-stuck` class */
  targetId: string;
  /** Sticky top offset in px (matches e.g. lg:top-24 = 96px) */
  topOffset?: number;
}

/**
 * Invisible sentinel placed just above a sticky container. When the sentinel
 * scrolls out of view (past the sticky offset), it toggles `.is-stuck` on the
 * target so `.sticky-shadow` can fade its shadow in/out smoothly.
 */
export default function StickySentinel({ targetId, topOffset = 96 }: StickySentinelProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const target = document.getElementById(targetId);
        if (!target) return;
        target.classList.toggle("is-stuck", !entry.isIntersecting);
      },
      { rootMargin: `-${topOffset + 1}px 0px 0px 0px`, threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [targetId, topOffset]);

  return <div ref={ref} aria-hidden="true" className="pointer-events-none h-px w-full" />;
}
