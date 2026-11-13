import type { RosterRow } from "@/lib/admin-roster";

function latin(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrap(text: string, width: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (next.length > width) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines.length ? lines : ["—"];
}

export function rosterPdfBytes(rows: RosterRow[], generatedAt: string) {
  const pages: string[][] = [];
  const maxLines = 42;
  let current: string[] = ["EFA Talk — numeros WhatsApp", generatedAt, ""];

  (["beginner", "intermediate", "advanced"] as const).forEach((level) => {
    const group = rows.filter((row) => row.level === level);
    const title =
      level === "beginner"
        ? `BEGINNERS (${group.length})`
        : level === "intermediate"
          ? `INTERMEDIATE (${group.length})`
          : `ADVANCED (${group.length})`;
    if (current.length + 3 > maxLines) {
      pages.push(current);
      current = [];
    }
    current.push(title);
    current.push("-".repeat(48));
    group.forEach((row, index) => {
      const line = `${String(index + 1).padStart(3, " ")}. ${row.name}  ${row.whatsapp || "—"}`;
      wrap(line, 88).forEach((piece) => {
        if (current.length >= maxLines) {
          pages.push(current);
          current = [`${title} (suite)`];
        }
        current.push(piece);
      });
    });
    current.push("");
  });
  pages.push(current);

  const objects: string[] = [
    "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj",
    `2 0 obj<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, i) => `${3 + i * 2} 0 R`).join(" ")}] >>endobj`,
  ];
  pages.forEach((lines, i) => {
    const pageId = 3 + i * 2;
    const contentId = pageId + 1;
    objects.push(
      `${pageId} 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${3 + pages.length * 2} 0 R >> >> >>endobj`,
    );
    const stream = ["BT", "/F1 10 Tf", "32 812 Td", "14 TL"]
      .concat(lines.map((line, idx) => `${idx ? "T*" : ""}(${latin(line)}) Tj`))
      .concat(["ET"])
      .join("\n");
    objects.push(`${contentId} 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream endobj`);
  });
  objects.push(
    `${3 + pages.length * 2} 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj`,
  );

  let raw = "%PDF-1.4\n";
  const xref = [0];
  objects.forEach((obj) => {
    xref.push(Buffer.byteLength(raw, "utf8"));
    raw += `${obj}\n`;
  });
  const startXref = Buffer.byteLength(raw, "utf8");
  raw += `xref\n0 ${xref.length}\n`;
  xref.forEach((pos, i) => {
    raw += i === 0 ? "0000000000 65535 f \n" : `${String(pos).padStart(10, "0")} 00000 n \n`;
  });
  raw += `trailer<< /Size ${xref.length} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`;
  return Buffer.from(raw, "utf8");
}
