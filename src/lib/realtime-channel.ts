import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

const removals = new Map<string, Promise<void>>();

export async function waitForChannelRemoval(topic: string) {
  await removals.get(topic);
}

export function removeRealtimeChannel(
  topic: string,
  supabase: SupabaseClient,
  channel: RealtimeChannel,
) {
  const previous = removals.get(topic) || Promise.resolve();
  const removal = previous
    .catch(() => undefined)
    .then(() => supabase.removeChannel(channel))
    .then(() => undefined)
    .catch(() => undefined);

  removals.set(topic, removal);
  void removal.finally(() => {
    if (removals.get(topic) === removal) removals.delete(topic);
  });
  return removal;
}
