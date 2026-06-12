"use client";

import { useEffect, useRef, type ReactNode, type ElementType } from "react";

interface RevealProps {
  children: ReactNode;
  /** Animation direction/style */
  variant?: "up" | "left" | "right" | "pop" | "fade" | "tracking";
  /** Stagger delay in ms */
  delay?: number;
  className?: string;
  as?: ElementType;
}

/**
 * Scroll-reveal wrapper. Adds .visible when the element enters the viewport.
 * Pure IntersectionObserver — no animation libraries. Pairs with the .reveal
 * classes in globals.css; respects prefers-reduced-motion via CSS.
 */
export default function Reveal({
  children,
  variant = "up",
  delay = 0,
  className = "",
  as: Tag = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const variantClass = variant === "fade" ? "" : `reveal-${variant}`;

  return (
    <Tag
      ref={ref}
      className={`reveal ${variantClass} ${className}`.trim()}
      style={delay ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}
