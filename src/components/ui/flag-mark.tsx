import { countryByCode } from "@/lib/countries";

export function FlagMark({ code, className }: { code?: string; className?: string }) {
  const country = code && code.length === 2 ? countryByCode(code.toUpperCase()) : undefined;
  if (!country) return <span aria-hidden>🌍</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png`}
      alt=""
      className={
        className ||
        "inline-block h-3 w-[18px] rounded-[2px] object-cover align-middle"
      }
    />
  );
}
