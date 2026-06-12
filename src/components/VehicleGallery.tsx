"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Logo from "@/components/Logo";
import type { VehiclePhoto } from "@/types/vehicle";

interface VehicleGalleryProps {
  photos: VehiclePhoto[];
  alt: string;
}

export default function VehicleGallery({ photos, alt }: VehicleGalleryProps) {
  const sorted = [...photos].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    return a.sort_order - b.sort_order;
  });
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const count = sorted.length;

  const go = useCallback(
    (next: number) => {
      if (count === 0) return;
      const i = (next + count) % count;
      setIndex(i);
      const track = trackRef.current;
      if (track) {
        track.scrollTo({ left: i * track.clientWidth, behavior: "smooth" });
      }
    },
    [count]
  );

  // Track scroll-snap position on mobile swipe
  const onTrackScroll = () => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const i = Math.round(track.scrollLeft / track.clientWidth);
    if (i !== index && i >= 0 && i < count) setIndex(i);
  };

  // Lightbox keyboard controls
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, index, go]);

  if (count === 0) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg border border-border-subtle bg-background-card">
        <div className="text-center">
          <Logo variant="dark" className="mx-auto h-14 w-auto opacity-30" />
          <p className="mt-3 text-sm text-text-muted">Photos coming soon</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Main gallery — swipeable scroll-snap track */}
      <div className="relative overflow-hidden rounded-lg border border-border-subtle bg-background-card">
        <div
          ref={trackRef}
          onScroll={onTrackScroll}
          className="flex aspect-[4/3] snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:snap-none md:overflow-x-visible md:transition-transform md:duration-[450ms] md:ease-[cubic-bezier(0.22,1,0.36,1)] md:[transform:translateX(var(--gallery-x,0%))] motion-reduce:transition-none"
          style={{ "--gallery-x": `${index * -100}%` } as React.CSSProperties}
          aria-label={`${alt} photo gallery`}
        >
          {sorted.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setLightbox(true)}
              className="relative h-full w-full flex-shrink-0 cursor-zoom-in snap-center"
              aria-label={`Open photo ${i + 1} of ${count} in fullscreen`}
            >
              <Image
                src={photo.url}
                alt={`${alt} — photo ${i + 1} of ${count}`}
                fill
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover"
                priority={i === 0}
                loading={i === 0 ? "eager" : "lazy"}
              />
            </button>
          ))}
        </div>

        {/* Arrows (desktop) */}
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/70 text-text-primary backdrop-blur transition-colors hover:bg-accent md:flex"
            >
              <ArrowIcon dir="left" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/70 text-text-primary backdrop-blur transition-colors hover:bg-accent md:flex"
            >
              <ArrowIcon dir="right" />
            </button>
          </>
        )}

        {/* Photo count indicator */}
        <div className="tabular absolute bottom-3 right-3 rounded bg-background/70 px-2.5 py-1 text-xs font-medium text-text-primary backdrop-blur">
          {index + 1} / {count}
        </div>
      </div>

      {/* Thumbnails */}
      {count > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {sorted.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => go(i)}
              aria-label={`View photo ${i + 1}`}
              className={`relative h-16 w-24 flex-shrink-0 overflow-hidden rounded border transition-all duration-300 ${
                i === index ? "border-accent opacity-100" : "border-border-subtle opacity-60 hover:opacity-100"
              }`}
            >
              <Image
                src={photo.url}
                alt=""
                fill
                sizes="96px"
                className="object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          role="dialog"
          aria-modal="true"
          aria-label={`${alt} fullscreen photo viewer`}
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            onClick={() => setLightbox(false)}
            aria-label="Close photo viewer"
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-surface text-text-primary hover:bg-accent"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="4" x2="16" y2="16" />
              <line x1="16" y1="4" x2="4" y2="16" />
            </svg>
          </button>
          <div className="relative h-[85vh] w-[92vw]" onClick={(e) => e.stopPropagation()}>
            <Image
              src={sorted[index].url}
              alt={`${alt} — photo ${index + 1} of ${count}`}
              fill
              sizes="92vw"
              className="object-contain"
            />
          </div>
          {count > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); go(index - 1); }}
                aria-label="Previous photo"
                className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface text-text-primary hover:bg-accent"
              >
                <ArrowIcon dir="left" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); go(index + 1); }}
                aria-label="Next photo"
                className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface text-text-primary hover:bg-accent"
              >
                <ArrowIcon dir="right" />
              </button>
            </>
          )}
          <div className="tabular absolute bottom-5 left-1/2 -translate-x-1/2 rounded bg-surface px-3 py-1 text-sm text-text-primary">
            {index + 1} / {count}
          </div>
        </div>
      )}
    </div>
  );
}

function ArrowIcon({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {dir === "left" ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
    </svg>
  );
}
