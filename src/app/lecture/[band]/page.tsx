import { Suspense } from "react";
import { LectureHall } from "@/components/lecture/lecture-hall";

export default async function LecturePage({
  params,
}: {
  params: Promise<{ band: string }>;
}) {
  const { band } = await params;
  const safe = band === "1" ? "1" : "0";
  return (
    <Suspense fallback={<div className="min-h-dvh bg-slate-950" />}>
      <LectureHall band={safe} />
    </Suspense>
  );
}
