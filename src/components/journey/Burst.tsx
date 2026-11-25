// A quiet burst of mango and ink shards behind a celebrated thing.
// Pure CSS, plays once, and stays still for people who prefer less motion.
const SHARDS = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2 + (i % 2 ? 0.2 : -0.1);
  const dist = 62 + (i % 3) * 12;
  return {
    x: Math.round(Math.cos(angle) * dist),
    y: Math.round(Math.sin(angle) * dist),
    r: (i * 47) % 180,
    kind: i % 3, // 0 square, 1 strip, 2 dot
    ink: i % 4 === 1,
    delay: (i % 4) * 25,
  };
});

/** spread: how far the shards fly, 1 = about 70px from the middle. */
export function Burst({ spread = 1 }: { spread?: number }) {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      {SHARDS.map((s, i) => (
        <span key={i}
          className={[
            "absolute left-1/2 top-1/2 border-ink motion-safe:animate-shard motion-reduce:opacity-0",
            s.kind === 0 ? "h-2.5 w-2.5 rounded-[2px] border-[1.5px]" : s.kind === 1 ? "h-1.5 w-4 rounded-pill border-[1.5px]" : "h-2 w-2 rounded-pill",
            s.ink ? "bg-ink" : "bg-mango",
          ].join(" ")}
          style={{
            // read by the shard keyframes
            ["--x" as string]: `${Math.round(s.x * spread)}px`, ["--y" as string]: `${Math.round(s.y * spread)}px`, ["--r" as string]: `${s.r}deg`,
            animationDelay: `${s.delay}ms`,
          }} />
      ))}
    </span>
  );
}
