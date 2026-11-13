import { NextResponse } from "next/server";
import { formationDb, formationSeats } from "@/lib/formation-server";
import { FORMATION_DEFAULT_DISCOUNT_MS } from "@/lib/formation-settings";
import type { FormationLevel } from "@/lib/formation-pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_CODE = process.env.EFAA_ADMIN_CODE || "0680";

export async function GET() {
  try {
    const db = formationDb();
    const [{ data: settings }, { data: caisse }, seats] = await Promise.all([
      db.from("efaa_formation_settings").select("*").eq("id", 1).maybeSingle(),
      db.from("efaa_formation_caisse").select("balance_fcfa").eq("id", 1).maybeSingle(),
      formationSeats(db),
    ]);

    const discountEndsAt =
      settings?.discount_ends_at || new Date(FORMATION_DEFAULT_DISCOUNT_MS).toISOString();

    return NextResponse.json({
      discountEndsAt,
      discountActive: settings?.discount_active ?? true,
      seats: seats.map((s) => ({ level: s.level, seatsTotal: s.seatsTotal, remaining: s.remaining })),
      caisseBalance: Number(caisse?.balance_fcfa) || 0,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "settings-failed" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      adminCode?: string;
      discountEndsAt?: string;
      discountActive?: boolean;
      level0Seats?: number;
      level1Seats?: number;
    };
    if (String(body.adminCode || "").trim() !== ADMIN_CODE) {
      return NextResponse.json({ error: "admin-required" }, { status: 401 });
    }

    const db = formationDb();

    if (body.discountEndsAt || typeof body.discountActive === "boolean") {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (body.discountEndsAt) patch.discount_ends_at = body.discountEndsAt;
      if (typeof body.discountActive === "boolean") patch.discount_active = body.discountActive;
      await db.from("efaa_formation_settings").upsert({ id: 1, ...patch });
    }

    const levels: FormationLevel[] = ["level0", "level1"];
    for (const level of levels) {
      const cap = level === "level0" ? body.level0Seats : body.level1Seats;
      if (typeof cap === "number" && cap >= 0 && cap <= 99) {
        await db
          .from("efaa_formation_seats")
          .upsert({ level, seats_total: Math.round(cap) });
      }
    }

    return GET();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "save-failed" },
      { status: 500 },
    );
  }
}
