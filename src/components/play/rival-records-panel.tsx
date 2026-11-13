"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { visibleBoardName } from "@/lib/session";

type Row = { rival_id: string; rival_name: string; my_wins: number; rival_wins: number };

export function RivalRecordsPanel({
  userId,
  meName,
  rpc,
  title,
  empty,
  line,
}: {
  userId: string;
  meName: string;
  rpc: "efaa_clash_h2h_for_user" | "efaa_card_h2h_for_user";
  title: string;
  empty: string;
  line: string;
}) {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!userId) return;
    void getSupabase()
      .rpc(rpc, { p_user: userId })
      .then(({ data, error }) => setRows(error ? [] : ((data as Row[]) || [])));
  }, [rpc, userId]);

  if (!rows.length) {
    return (
      <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-[12px] text-white/55">
        {empty}
      </p>
    );
  }

  const displayMe = visibleBoardName(meName) || meName;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#f0d78c]/80">{title}</p>
      <ul className="mt-3 space-y-2">
        {rows.slice(0, 8).map((row) => (
          <li
            key={row.rival_id}
            className="rounded-xl bg-black/25 px-3 py-2 text-[13px] font-bold text-white"
          >
            {line
              .replace("{me}", displayMe)
              .replace("{myWins}", String(row.my_wins))
              .replace("{theirWins}", String(row.rival_wins))
              .replace("{rival}", visibleBoardName(row.rival_name) || row.rival_name)}
          </li>
        ))}
      </ul>
    </div>
  );
}
