"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { fetchDoorsOpen, fetchOpenHours, isOpenNow, type OpenHourRow } from "@/lib/open-hours";
import { getSupabase } from "@/lib/supabase";

export function useOpenHours() {
  const channelId = useId();
  const [rows, setRows] = useState<OpenHourRow[]>([]);
  const [forceOpen, setForceOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const load = useCallback(() => {
    return Promise.all([
      fetchOpenHours().catch(() => null),
      fetchDoorsOpen().catch(() => null),
    ]).then(([nextRows, nextForce]) => {
      if (nextRows) setRows(nextRows);
      if (typeof nextForce === "boolean") setForceOpen(nextForce);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    let live = true;
    const refresh = () => {
      if (live) void load();
    };
    refresh();
    const supabase = getSupabase();
    const channel = supabase
      .channel(`efaa-open-hours-${channelId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "efaa_open_hours" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "efaa_doors" }, refresh)
      .subscribe();
    const interval = window.setInterval(refresh, 30000);
    const clock = window.setInterval(() => setTick((n) => n + 1), 15000);
    return () => {
      live = false;
      window.clearInterval(interval);
      window.clearInterval(clock);
      void supabase.removeChannel(channel);
    };
  }, [channelId, load]);

  void tick;
  const open = rows.length ? isOpenNow(rows) : false;
  return { rows, open, forceOpen, loading, refresh: load };
}
