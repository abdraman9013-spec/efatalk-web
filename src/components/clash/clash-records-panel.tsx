"use client";

import { useI18n } from "@/i18n/provider";
import { RivalRecordsPanel } from "@/components/play/rival-records-panel";

export function ClashRecordsPanel({ userId, meName }: { userId: string; meName: string }) {
  const { t } = useI18n();
  return (
    <RivalRecordsPanel
      userId={userId}
      meName={meName}
      rpc="efaa_clash_h2h_for_user"
      title={t.clash.recordsTitle}
      empty={t.clash.recordsEmpty}
      line={t.clash.recordLine}
    />
  );
}
