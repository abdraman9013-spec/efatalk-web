"use client";

export type PosterPerson = {
  rank: number;
  name: string;
  points: number;
  line?: string;
};

const RANK_LINES = [
  "Champion du moment. La ligne diamant t’attend.",
  "Tu colles le leader. Un match de plus et tu montes.",
  "Le podium est à toi. Continue — la fierté se gagne.",
];

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fillBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#072833");
  bg.addColorStop(0.45, "#0e5a6e");
  bg.addColorStop(1, "#c9a227");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(255,248,228,0.08)";
  ctx.beginPath();
  ctx.arc(w * 0.85, h * 0.12, 220, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(w * 0.1, h * 0.88, 260, 0, Math.PI * 2);
  ctx.fill();
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function blobToPngFile(blob: Blob, filename: string) {
  return new File([blob], filename, { type: "image/png" });
}

export async function renderStudentPoster(input: {
  name: string;
  rank: number | null;
  pointsToday: number;
  total: number;
  cap: number;
}): Promise<Blob> {
  const w = 1080;
  const h = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  fillBackground(ctx, w, h);

  ctx.fillStyle = "rgba(255,248,228,0.92)";
  ctx.font = "700 28px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("EFATALK ENGLISH CHALLENGE 2026", w / 2, 120);

  ctx.fillStyle = "#f0d78c";
  ctx.font = "italic 36px Georgia, serif";
  ctx.fillText("Ma journée", w / 2, 190);

  roundRect(ctx, 90, 250, 900, 820, 40);
  ctx.fillStyle = "rgba(7, 32, 41, 0.72)";
  ctx.fill();

  ctx.fillStyle = "#fff8e4";
  ctx.font = "700 54px Georgia, serif";
  ctx.fillText(input.name || "Élève EfaTalk", w / 2, 370);

  ctx.fillStyle = "#f0d78c";
  ctx.font = "700 42px Georgia, serif";
  ctx.fillText(input.rank ? `Rang #${input.rank}` : "Classement en cours", w / 2, 460);

  ctx.fillStyle = "#fff8e4";
  ctx.font = "800 120px Georgia, serif";
  ctx.fillText(`${input.pointsToday}`, w / 2, 640);
  ctx.font = "600 32px Georgia, serif";
  ctx.fillStyle = "#f0d78c";
  ctx.fillText(`points aujourd’hui / ${input.cap}`, w / 2, 700);

  ctx.fillStyle = "#fff8e4";
  ctx.font = "700 40px Georgia, serif";
  ctx.fillText(`Total Challenge  ${input.total}`, w / 2, 820);

  ctx.font = "600 28px Georgia, serif";
  ctx.fillStyle = "#f0d78c";
  ctx.fillText("Ligne diamant · 10 500   ·   Bronze 500", w / 2, 910);

  ctx.fillStyle = "#fff8e4";
  ctx.font = "italic 30px Georgia, serif";
  ctx.fillText("15 jours. Une mission. Parler anglais.", w / 2, 1000);

  ctx.font = "600 24px Georgia, serif";
  ctx.fillStyle = "rgba(255,248,228,0.8)";
  ctx.fillText("efatalk.fyi/challenge", w / 2, 1260);

  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("png"))), "image/png");
  });
}

export async function renderDayPoster(input: {
  dayLabel: string;
  people: PosterPerson[];
}): Promise<Blob> {
  const w = 1080;
  const h = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  fillBackground(ctx, w, h);

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,248,228,0.92)";
  ctx.font = "700 28px Georgia, serif";
  ctx.fillText("EFATALK ENGLISH CHALLENGE 2026", w / 2, 110);

  ctx.fillStyle = "#f0d78c";
  ctx.font = "italic 48px Georgia, serif";
  ctx.fillText("Challenge du jour", w / 2, 180);

  ctx.fillStyle = "#fff8e4";
  ctx.font = "600 26px Georgia, serif";
  ctx.fillText(input.dayLabel, w / 2, 230);

  const medals = ["🥇", "🥈", "🥉"];
  const rows = input.people.slice(0, 3);
  rows.forEach((person, index) => {
    const y = 280 + index * 250;
    roundRect(ctx, 90, y, 900, 226, 32);
    ctx.fillStyle = index === 0 ? "rgba(201,162,39,0.28)" : "rgba(7,32,41,0.72)";
    ctx.fill();
    ctx.textAlign = "left";
    ctx.font = "48px Georgia, serif";
    ctx.fillStyle = "#fff8e4";
    ctx.fillText(`${medals[index] || `#${person.rank}`}`, 130, y + 70);
    ctx.font = "700 36px Georgia, serif";
    ctx.fillText(person.name.slice(0, 28), 230, y + 72);
    ctx.font = "700 28px Georgia, serif";
    ctx.fillStyle = "#f0d78c";
    ctx.fillText(`#${person.rank}  ·  ${person.points} pts Challenge`, 230, y + 122);
    ctx.font = "italic 24px Georgia, serif";
    ctx.fillStyle = "#fff8e4";
    ctx.fillText(person.line || RANK_LINES[index] || "", 230, y + 168);
  });

  ctx.textAlign = "center";
  ctx.fillStyle = "#fff8e4";
  ctx.font = "italic 30px Georgia, serif";
  ctx.fillText("La fierté se gagne match après match.", w / 2, 1080);
  ctx.font = "600 26px Georgia, serif";
  ctx.fillStyle = "#f0d78c";
  ctx.fillText("700 pts / jour  ·  10 500 diamant", w / 2, 1140);
  ctx.fillStyle = "rgba(255,248,228,0.8)";
  ctx.font = "600 24px Georgia, serif";
  ctx.fillText("efatalk.fyi/challenge", w / 2, 1260);

  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("png"))), "image/png");
  });
}

export async function shareOrDownload(blob: Blob, filename: string, title: string) {
  const file = await blobToPngFile(blob, filename);
  const payload = { files: [file], title, text: title };
  const nav = navigator as Navigator & {
    canShare?: (data: { files: File[] }) => boolean;
    share?: (data: { files: File[]; title?: string; text?: string }) => Promise<void>;
  };
  if (nav.canShare?.(payload) && nav.share) {
    await nav.share(payload);
    return;
  }
  downloadBlob(blob, filename);
}

export function downloadPng(blob: Blob, filename: string) {
  downloadBlob(blob, filename);
}
