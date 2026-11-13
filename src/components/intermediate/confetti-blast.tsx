"use client";

const PIECES = Array.from({ length: 42 }, (_, i) => i);

export function ConfettiBlast({ token, label }: { token: number; label: string }) {
  if (!token) return null;

  return (
    <div key={token} className="mid-blast" aria-hidden>
      <span className="mid-blast-label">{label}</span>
      {PIECES.map((i) => (
        <span
          key={i}
          className="mid-confetti"
          style={{
            left: `${(i * 97) % 100}%`,
            animationDelay: `${(i % 8) * 28}ms`,
            background: i % 4 === 0 ? "#39ff9f" : i % 4 === 1 ? "#c084fc" : i % 4 === 2 ? "#38bdf8" : "#facc15",
          }}
        />
      ))}
    </div>
  );
}
