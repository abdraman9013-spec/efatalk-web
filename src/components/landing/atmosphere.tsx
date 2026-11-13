/** Vitrine academy: ivory · navy · gold — clean showcase light. */
export function Atmosphere() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#faf8f4]">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 50% -5%, rgba(212, 175, 55, 0.14), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 0%, rgba(12, 27, 77, 0.06), transparent 50%), linear-gradient(180deg, #faf8f4 0%, #f7f4ee 48%, #f3efe6 100%)",
        }}
      />
      <div
        className="absolute left-1/2 top-24 h-[22rem] w-[22rem] -translate-x-1/2 rounded-full opacity-50 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(240, 215, 140, 0.28), transparent 70%)" }}
        aria-hidden
      />
      <div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/45 to-transparent"
        aria-hidden
      />
    </div>
  );
}
