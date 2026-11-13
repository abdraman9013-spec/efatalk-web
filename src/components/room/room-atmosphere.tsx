export function RoomAtmosphere() {
  return (
    <div className="salon-atmosphere" aria-hidden>
      <span className="salon-window" />
      <span className="salon-lamp salon-lamp-left" />
      <span className="salon-lamp salon-lamp-right" />
      <span className="salon-dust gold-dust" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="https://flagcdn.com/w320/us.png" alt="" className="salon-flag salon-flag-us" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="https://flagcdn.com/w320/gb.png" alt="" className="salon-flag salon-flag-uk" />
      <span className="salon-wood" />
    </div>
  );
}
