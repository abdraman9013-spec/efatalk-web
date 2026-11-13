"use client";

const PIECES = Array.from({ length: 18 }, (_, i) => i);

export function StarBurst({ token, label }: { token: number; label: string }) {
  if (!token) return null;

  return (
    <div key={token} className="flash-burst" aria-hidden>
      <span className="flash-burst-label">{label}</span>
      {PIECES.map((i) => (
        <span
          key={i}
          className="flash-confetti"
          style={{
            left: `${6 + (i * 89) % 88}%`,
            animationDelay: `${(i % 6) * 60}ms`,
            background:
              i % 3 === 0 ? "#39ff9f" : i % 3 === 1 ? "#a855f7" : "#f6e7a1",
          }}
        />
      ))}
    </div>
  );
}
