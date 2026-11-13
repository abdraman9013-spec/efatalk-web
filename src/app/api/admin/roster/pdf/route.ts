import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/challenge-admin-server";
import { loadAdminRoster } from "@/lib/admin-roster";
import { rosterPdfBytes } from "@/lib/admin-roster-pdf";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!verifyAdminSession(request)) {
    return NextResponse.json({ error: "admin-required" }, { status: 401 });
  }
  try {
    const { students, counts } = await loadAdminRoster();
    const stamp = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Africa/Ndjamena",
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date());
    const pdf = rosterPdfBytes(students, `${stamp}  ·  ${counts.total} eleves`);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="efatalk-whatsapp-numeros.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "pdf-failed" },
      { status: 500 },
    );
  }
}
