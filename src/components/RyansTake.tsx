interface RyansTakeProps {
  text: string;
}

export default function RyansTake({ text }: RyansTakeProps) {
  return (
    <div className="border-pulse-red rounded-r-lg border-l-4 border-accent bg-background-card p-5">
      <p className="text-xs font-bold uppercase tracking-widest2 text-accent">
        Ryan&apos;s Take
      </p>
      <blockquote className="mt-2 text-base italic leading-relaxed text-text-primary">
        &ldquo;{text}&rdquo;
      </blockquote>
      <p className="mt-3 text-sm text-text-muted">— Ryan, RydeTime Auto</p>
    </div>
  );
}
