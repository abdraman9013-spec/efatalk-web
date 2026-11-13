"use client";

import {
  Clock3,
  Flame,
  Gift,
  Medal,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LanguageSwitcher } from "@/components/landing/language-switcher";
import {
  fetchChallengeMe,
  fetchChallengePublic,
  joinChallenge,
  rememberedChallengeReferral,
  rememberChallengeIntent,
} from "@/lib/challenge-api";
import type {
  ChallengeMe,
  ChallengePublicPayload,
} from "@/lib/challenge-types";
import { useI18n } from "@/i18n/provider";
import {
  markChallengeOpened,
  readChallengeOpened,
  type ChallengeGate,
  type OpenedGates,
} from "@/lib/challenge-gates";
import { openTikTokProfile, TIKTOK_PROFILE } from "@/lib/social-links";

const FACEBOOK = "https://www.facebook.com/share/19kRFNnujW/";
const RULES = "/challenge/rules";
const INITIAL_NOW = Date.now();

const COPY = {
  fr: {
    participate: "Participer à la compétition",
    login: "Créer mon compte et participer",
    prize: "150 000 FCFA À GAGNER",
    mission: "15 JOURS. UNE MISSION. PARLER ANGLAIS.",
    simple: "Comment ça marche ?",
    equation: "Tes anciens points restent. Du 15 au 29, chaque nouveau point compte aussi pour le Challenge.",
    steps: ["Pratique l’anglais", "Gagne des points EfaTalk", "Monte au classement"],
    requirements: "Pour être éligible au prix",
    rules: "J’accepte le règlement officiel",
    tiktok: "Je confirme suivre EfaTalk sur TikTok",
    facebook: "Je confirme suivre EfaTalk sur Facebook",
    readRules: "Lire le règlement",
    followTiktok: "Suivre sur TikTok",
    followFacebook: "Suivre sur Facebook",
    openFirst: "Ouvre ce lien d’abord. Ensuite la case se coche.",
    selfDeclared: "Déclaration de l’élève — vérifiable par l’administration",
    friends: "Le parrainage est fermé. Les points se gagnent en pratiquant.",
    join: "Confirmer ma participation",
    joining: "Inscription…",
    progress: "Mon Challenge",
    challengePoints: "Points Challenge",
    lifetime: "Total EfaTalk",
    rank: "Rang actuel",
    streak: "Flamme",
    referrals: "Amis inscrits",
    daily: "Points aujourd’hui",
    eligibility: "Éligibilité au prix",
    eligible: "Éligible",
    pending: "À compléter",
    invite: "Inviter mes amis",
    copy: "Copier le lien",
    copied: "Lien copié",
    leaderboard: "Classement en direct",
    allBoard: "Voir tout le classement",
    today: "Défi du jour",
    dailyHow: "Réalise ce thème pendant ta pratique orale pour valider le défi.",
    practice: "Pratiquer maintenant",
    emptyBoard: "Le classement commence le 15 octobre.",
    before: "LE CHALLENGE COMMENCE DANS",
    left: "TEMPS RESTANT",
    verification: "VÉRIFICATION DES GAGNANTS",
    final: "CLASSEMENT FINAL",
    days: "J",
    hours: "H",
    minutes: "MIN",
    accountNeeded: "Connecte-toi avec Gmail, complète ton profil, puis reviens ici.",
    error: "Impossible de charger le Challenge. Réessaie.",
    rulesLink: "Règlement",
    winners: "Gagnants",
  },
  en: {
    participate: "Join the competition",
    login: "Create my account and join",
    prize: "150,000 FCFA IN PRIZES",
    mission: "15 DAYS. ONE MISSION. SPEAK ENGLISH.",
    simple: "How does it work?",
    equation: "Your old points stay. From 15–29 October, every new point also counts for the Challenge.",
    steps: ["Practice English", "Earn EfaTalk points", "Climb the leaderboard"],
    requirements: "To qualify for a prize",
    rules: "I accept the official rules",
    tiktok: "I confirm that I follow EfaTalk on TikTok",
    facebook: "I confirm that I follow EfaTalk on Facebook",
    readRules: "Read the rules",
    followTiktok: "Follow on TikTok",
    followFacebook: "Follow on Facebook",
    openFirst: "Open this link first. Then the box can be ticked.",
    selfDeclared: "Student declaration — auditable by administration",
    friends: "Referrals are closed. Points come from practice.",
    join: "Confirm my participation",
    joining: "Joining…",
    progress: "My Challenge",
    challengePoints: "Challenge points",
    lifetime: "EfaTalk total",
    rank: "Current rank",
    streak: "Streak",
    referrals: "Signed-up friends",
    daily: "Points today",
    eligibility: "Prize eligibility",
    eligible: "Eligible",
    pending: "Incomplete",
    invite: "Invite my friends",
    copy: "Copy link",
    copied: "Link copied",
    leaderboard: "Live leaderboard",
    allBoard: "See full leaderboard",
    today: "Today's challenge",
    dailyHow: "Use this topic during speaking practice to complete today’s challenge.",
    practice: "Practice now",
    emptyBoard: "The leaderboard starts on 15 October.",
    before: "CHALLENGE STARTS IN",
    left: "TIME LEFT",
    verification: "WINNER VERIFICATION",
    final: "FINAL LEADERBOARD",
    days: "D",
    hours: "H",
    minutes: "MIN",
    accountNeeded: "Continue with Gmail, complete your profile, then return here.",
    error: "The Challenge could not load. Try again.",
    rulesLink: "Rules",
    winners: "Winners",
  },
  ar: {
    participate: "شارك في المسابقة",
    login: "أنشئ حسابي وأشارك",
    prize: "150,000 فرنك أفريقي جوائز",
    mission: "15 يوماً. مهمة واحدة. تكلم الإنجليزية.",
    simple: "كيف يعمل؟",
    equation: "نقاطك القديمة تبقى. من 15 إلى 29 أكتوبر، كل نقطة جديدة تُحسب أيضاً في التحدي.",
    steps: ["تدرّب على الإنجليزية", "اكسب نقاط EfaTalk", "تقدّم في الترتيب"],
    requirements: "للتأهل للجائزة",
    rules: "أوافق على القواعد الرسمية",
    tiktok: "أؤكد أنني أتابع EfaTalk على TikTok",
    facebook: "أؤكد أنني أتابع EfaTalk على Facebook",
    readRules: "اقرأ القواعد",
    followTiktok: "تابع على TikTok",
    followFacebook: "تابع على Facebook",
    openFirst: "افتح الرابط أولاً. بعدها يمكن وضع العلامة.",
    selfDeclared: "تصريح الطالب — يمكن للإدارة مراجعته",
    friends: "الإحالات مغلقة. النقاط من الممارسة.",
    join: "تأكيد مشاركتي",
    joining: "جارٍ التسجيل…",
    progress: "تحديي",
    challengePoints: "نقاط التحدي",
    lifetime: "مجموع EfaTalk",
    rank: "ترتيبي الحالي",
    streak: "الشعلة",
    referrals: "أصدقاء نشطون",
    daily: "نقاط اليوم",
    eligibility: "أهلية الجائزة",
    eligible: "مؤهل",
    pending: "غير مكتمل",
    invite: "دعوة أصدقائي",
    copy: "نسخ الرابط",
    copied: "تم نسخ الرابط",
    leaderboard: "الترتيب المباشر",
    allBoard: "عرض الترتيب كاملاً",
    today: "تحدي اليوم",
    dailyHow: "استخدم هذا الموضوع أثناء التدريب الشفهي لإكمال تحدي اليوم.",
    practice: "تدرّب الآن",
    emptyBoard: "يبدأ الترتيب في 15 أكتوبر.",
    before: "يبدأ التحدي خلال",
    left: "الوقت المتبقي",
    verification: "التحقق من الفائزين",
    final: "الترتيب النهائي",
    days: "ي",
    hours: "س",
    minutes: "د",
    accountNeeded: "سجّل عبر Gmail وأكمل ملفك ثم عد إلى هنا.",
    error: "تعذر تحميل التحدي. حاول مجدداً.",
    rulesLink: "القواعد",
    winners: "الفائزون",
  },
} as const;

export function ChallengePage() {
  const { locale } = useI18n();
  const c = COPY[locale];
  const router = useRouter();
  const search = useSearchParams();
  const [publicData, setPublicData] = useState<ChallengePublicPayload | null>(null);
  const [me, setMe] = useState<ChallengeMe | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [rules, setRules] = useState(false);
  const [tiktok, setTiktok] = useState(false);
  const [facebook, setFacebook] = useState(false);
  const [opened, setOpened] = useState<OpenedGates>({ rules: false, tiktok: false, facebook: false });
  const [now, setNow] = useState(INITIAL_NOW);

  const load = useCallback(async () => {
    try {
      const [campaign, profile] = await Promise.all([
        fetchChallengePublic(),
        fetchChallengeMe().catch(() => null),
      ]);
      setPublicData(campaign);
      setMe(profile);
    } catch {
      setError(c.error);
    } finally {
      setLoaded(true);
    }
  }, [c.error]);

  useEffect(() => {
    const referral = search.get("ref")?.trim().toUpperCase();
    if (referral) rememberChallengeIntent(referral);
    queueMicrotask(() => void load());
  }, [load, search]);

  useEffect(() => {
    const sync = () => setOpened(readChallengeOpened());
    sync();
    const onShow = () => sync();
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    window.addEventListener("pageshow", onShow);
    window.addEventListener("focus", onShow);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("pageshow", onShow);
      window.removeEventListener("focus", onShow);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  function markOpened(key: ChallengeGate) {
    setOpened(markChallengeOpened(key));
  }

  const gatesReady = rules && tiktok && facebook && opened.rules && opened.tiktok && opened.facebook;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const countdown = useMemo(() => {
    if (!publicData) return null;
    const phase = publicData.challenge.phase;
    const target =
      phase === "upcoming"
        ? new Date(publicData.challenge.startsAt).getTime()
        : new Date(publicData.challenge.endsAt).getTime();
    const value = Math.max(target - now, 0);
    return {
      label:
        phase === "upcoming"
          ? c.before
          : phase === "active"
            ? c.left
            : phase === "final"
              ? c.final
              : c.verification,
      days: Math.floor(value / 86400000),
      hours: Math.floor((value % 86400000) / 3600000),
      minutes: Math.floor((value % 3600000) / 60000),
    };
  }, [c, now, publicData]);

  async function participate() {
    const ref = search.get("ref") || rememberedChallengeReferral();
    if (!gatesReady || joining) return;
    if (!me) {
      rememberChallengeIntent(ref || undefined);
      router.push(`/auth?next=/challenge${ref ? `&ref=${encodeURIComponent(ref)}` : ""}`);
      return;
    }
    setJoining(true);
    setError("");
    try {
      await joinChallenge({
        acceptRules: rules,
        tiktok,
        facebook,
        referralToken: ref || undefined,
      });
      await load();
    } catch (joinError) {
      const code = joinError instanceof Error ? joinError.message : "";
      if (code === "verified-account-required") {
        rememberChallengeIntent(ref || undefined);
        router.push("/auth?next=/challenge");
      } else {
        setError(c.error);
      }
    } finally {
      setJoining(false);
    }
  }

  const daily = publicData?.dailyChallenge;
  const dailyTitle = daily
    ? locale === "ar"
      ? daily.titleAr
      : locale === "en"
        ? daily.titleEn
        : daily.titleFr
    : "";
  const dailyPrompt = daily
    ? locale === "ar"
      ? daily.promptAr
      : locale === "en"
        ? daily.promptEn
        : daily.promptFr
    : "";

  return (
    <div className="challenge-sea">
      <header className="challenge-sea-header sticky top-0 z-40 px-4 py-2">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Link href="/" className="flex min-w-0 flex-1 items-center gap-2">
            <Image src="/brand/efaa-logo-v6.png" alt="EfaTalk" width={40} height={40} className="h-9 w-9" />
            <span className="truncate font-display text-sm">EfaTalk Challenge 2026</span>
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      <main>
        <section className="challenge-sea-hero px-4 pb-10 pt-8 text-center">
          <div className="mx-auto max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#8a6a12]">
              {c.mission}
            </p>
            <h1 className="mt-4 font-display text-4xl leading-tight md:text-6xl">
              EfaTalk English Challenge <span className="text-[#8a6a12]">2026</span>
            </h1>
            <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-[#c9a227]/55 bg-[#fff8e4]/70 px-5 py-2 text-sm font-black text-[#8a6a12]">
              <Gift className="h-4 w-4" /> {c.prize}
            </div>
            {countdown ? (
              <div className="mx-auto mt-7 max-w-md rounded-3xl border border-white/55 bg-white/45 p-4 backdrop-blur-sm">
                <p className="text-[10px] font-black tracking-[0.25em] text-[#8a6a12]">{countdown.label}</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Count value={countdown.days} label={c.days} />
                  <Count value={countdown.hours} label={c.hours} />
                  <Count value={countdown.minutes} label={c.minutes} />
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <div className="mx-auto max-w-5xl space-y-5 px-4 py-6">
          <section className="challenge-card rounded-[28px] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#8a6a12]">{c.simple}</p>
            <p className="mt-2 text-lg font-bold leading-snug">{c.equation}</p>
            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
              {c.steps.map((step, index) => (
                <SimpleStep key={step} n={String(index + 1)} text={step} />
              ))}
            </div>
          </section>

          {!loaded ? (
            <div className="challenge-card rounded-[28px] p-8 text-center">…</div>
          ) : me?.joined ? (
            <ParticipantPanel me={me} copy={c} />
          ) : (
            <section className="challenge-card rounded-[28px] p-5">
              <h2 className="font-display text-2xl">{c.participate}</h2>
              {!me ? (
                <>
                  <p className="mt-2 text-sm text-[#1e6a80]/80">{c.accountNeeded}</p>
                  <EligibilityGates
                    copy={c}
                    opened={opened}
                    rules={rules}
                    tiktok={tiktok}
                    facebook={facebook}
                    onOpen={markOpened}
                    onRules={setRules}
                    onTiktok={setTiktok}
                    onFacebook={setFacebook}
                  />
                  <button
                    type="button"
                    disabled={!gatesReady}
                    onClick={() => void participate()}
                    className="challenge-gold-btn mt-5 min-h-14 w-full rounded-2xl px-5 font-black disabled:opacity-35"
                  >
                    {c.login}
                  </button>
                </>
              ) : (
                <>
                  <EligibilityGates
                    copy={c}
                    opened={opened}
                    rules={rules}
                    tiktok={tiktok}
                    facebook={facebook}
                    onOpen={markOpened}
                    onRules={setRules}
                    onTiktok={setTiktok}
                    onFacebook={setFacebook}
                  />
                  <button
                    type="button"
                    disabled={!gatesReady || joining}
                    onClick={() => void participate()}
                    className="challenge-gold-btn mt-5 min-h-14 w-full rounded-2xl px-5 font-black disabled:opacity-35"
                  >
                    {joining ? c.joining : c.join}
                  </button>
                </>
              )}
            </section>
          )}

          {error ? <p className="rounded-2xl bg-red-50 p-4 text-center text-sm font-bold text-red-700">{error}</p> : null}

          {daily ? (
            <section className="rounded-[28px] bg-gradient-to-br from-[#f1d36b] to-[#c9a227] p-5 text-[#3f2e08]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em]">{c.today} · DAY {daily.dayNumber}</p>
                  <h2 className="mt-2 font-display text-2xl">{dailyTitle}</h2>
                </div>
                <span className="rounded-full bg-[#8a6a12] px-3 py-1 text-xs font-black text-[#fff8e4]">+{daily.points}</span>
              </div>
              <p className="mt-3 text-sm font-semibold">{dailyPrompt}</p>
              <p className="mt-3 text-xs font-semibold opacity-75">{c.dailyHow}</p>
              <Link
                href="/auth"
                className="mt-4 flex min-h-12 items-center justify-center rounded-2xl bg-[#1e7a96] px-4 text-sm font-black text-[#fff8e4]"
              >
                {c.practice}
              </Link>
            </section>
          ) : null}

          <DayPodium
            title="Challenge du jour"
            people={publicData?.todayBoard || []}
            empty={c.emptyBoard}
          />

          <section className="challenge-card rounded-[28px] p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-2xl">{c.leaderboard}</h2>
              <Medal className="h-6 w-6 text-[#8a6a12]" />
            </div>
            <ol className="mt-4 space-y-2">
              {(publicData?.leaderboard || []).slice(0, 10).map((leader) => (
                <li key={leader.userId} className="flex items-center gap-3 rounded-2xl bg-[#e8f6fb] p-3">
                  <span className="w-7 text-center font-black">#{leader.rank}</span>
                  <span className="min-w-0 flex-1 truncate font-bold">{leader.displayName}</span>
                  <span className="shrink-0 font-black text-[#8a6a12]">{leader.points} pts</span>
                </li>
              ))}
              {!publicData?.leaderboard.length ? (
                <li className="rounded-2xl bg-[#e8f6fb] p-5 text-center text-sm text-[#1e6a80]/70">
                  {c.emptyBoard}
                </li>
              ) : null}
            </ol>
            <Link href="/challenge/leaderboard" className="mt-4 block text-center text-sm font-black text-[#1e7a96]">
              {c.allBoard} →
            </Link>
          </section>

          <nav className="grid grid-cols-2 gap-2 text-center text-sm font-bold">
            <Link href="/challenge/rules" className="challenge-card rounded-2xl p-4">{c.rulesLink}</Link>
            <Link href="/challenge/winners" className="challenge-card rounded-2xl p-4">{c.winners}</Link>
          </nav>
        </div>
      </main>
    </div>
  );
}

function Count({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-white/55 py-3">
      <p className="text-2xl font-black tabular-nums">{String(value).padStart(2, "0")}</p>
      <p className="text-[9px] font-bold tracking-[0.2em] text-[#1e6a80]/70">{label}</p>
    </div>
  );
}

function SimpleStep({ n, text }: { n: string; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[#e8f6fb] p-3 font-bold">
      <span className="challenge-gold-btn grid h-8 w-8 shrink-0 place-items-center rounded-full">{n}</span>
      {text}
    </div>
  );
}

function EligibilityGates({
  copy,
  opened,
  rules,
  tiktok,
  facebook,
  onOpen,
  onRules,
  onTiktok,
  onFacebook,
}: {
  copy: (typeof COPY)[keyof typeof COPY];
  opened: OpenedGates;
  rules: boolean;
  tiktok: boolean;
  facebook: boolean;
  onOpen: (key: ChallengeGate) => void;
  onRules: (checked: boolean) => void;
  onTiktok: (checked: boolean) => void;
  onFacebook: (checked: boolean) => void;
}) {
  return (
    <div className="mt-3 space-y-3">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8a6a12]">{copy.requirements}</p>
      <GateRow
        href={RULES}
        openLabel={copy.readRules}
        locked={!opened.rules}
        hint={copy.openFirst}
        checked={rules}
        label={copy.rules}
        onOpen={() => onOpen("rules")}
        onChange={onRules}
      />
      <GateRow
        href={TIKTOK_PROFILE}
        openLabel={copy.followTiktok}
        locked={!opened.tiktok}
        hint={copy.openFirst}
        checked={tiktok}
        label={copy.tiktok}
        onOpen={() => onOpen("tiktok")}
        onNavigate={openTikTokProfile}
        onChange={onTiktok}
      />
      <GateRow
        href={FACEBOOK}
        openLabel={copy.followFacebook}
        locked={!opened.facebook}
        hint={copy.openFirst}
        checked={facebook}
        label={copy.facebook}
        onOpen={() => onOpen("facebook")}
        onChange={onFacebook}
      />
      <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-amber-900">{copy.selfDeclared}</p>
    </div>
  );
}

function GateRow({
  href,
  openLabel,
  locked,
  hint,
  checked,
  label,
  onOpen,
  onChange,
  onNavigate,
}: {
  href: string;
  openLabel: string;
  locked: boolean;
  hint: string;
  checked: boolean;
  label: string;
  onOpen: () => void;
  onChange: (checked: boolean) => void;
  onNavigate?: (event: { preventDefault(): void }) => void;
}) {
  return (
    <div className="rounded-2xl border border-[#1e7a96]/15 p-3">
      <a
        href={href}
        target={href.startsWith("/") ? undefined : "_blank"}
        rel={href.startsWith("/") ? undefined : "noreferrer"}
        onClick={(event) => {
          onOpen();
          onNavigate?.(event);
        }}
        className="inline-flex min-h-10 items-center text-sm font-black text-[#1e7a96] underline"
      >
        {openLabel}
      </a>
      <label
        className={`mt-2 flex items-start gap-3 text-sm font-semibold ${locked ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
      >
        <input
          type="checkbox"
          checked={checked && !locked}
          disabled={locked}
          onChange={(event) => {
            if (locked) return;
            onChange(event.target.checked);
          }}
          className="mt-0.5 h-5 w-5 accent-[#8a6a12]"
        />
        <span>{label}</span>
      </label>
      {locked ? <p className="mt-1 text-[11px] font-semibold text-[#8a6a12]">{hint}</p> : null}
    </div>
  );
}

function coachLines(me: ChallengeMe) {
  const cap = me.dailyPointsCap || 700;
  const done = me.matchesToday || 0;
  const nextFlame = done < 5 ? 5 - done : done < 10 ? 10 - done : 0;
  const cardPts = me.cardCorrectsToday || 0;
  const cardChallenge = Math.min(200, Math.floor(cardPts / 100) * 15);
  const daysLeft = Math.max(0, Number(me.daysLeft) || 0);
  const pts = me.challengePoints || 0;
  const lowStack = pts < 4000 || (me.rank != null && me.rank > 10);
  const lines: string[] = [];
  if (daysLeft > 0 && daysLeft <= 5) {
    lines.push(
      daysLeft === 1
        ? "Dernier jour. Chaque match = 20 pts. Ne lâche rien — ouvre le lobby maintenant."
        : `Plus que ${daysLeft} jours. Chaque soir = jusqu’à 360 pts. La ligne diamant 10 500 est encore jouable.`,
    );
    if (lowStack) {
      lines.unshift(
        pts < 1500
          ? `Tu as ${pts} pts. Ce n’est pas fini : 1 soir intense = 360 pts. Commence par 1 match, maintenant.`
          : pts < 3000
            ? `Tu as ${pts} pts. En ${daysLeft} soirs × 360 pts tu peux encore doubler. Le lobby t’attend.`
            : `Tu as ${pts} pts. Plus que ${daysLeft} jours — un sprint ce soir change ton classement.`,
      );
      lines.push(
        me.rank
          ? `Tu es #${me.rank}. 15 matchs = 300 pts + flammes. Remonte ce soir, pas demain.`
          : "Tu peux encore grimper. 15 matchs = 300 pts + flammes. Ouvre le lobby tout de suite.",
      );
      if (me.gapToNext > 0) {
        lines.push(`Seulement ${me.gapToNext} pts te séparent de la place juste au-dessus. C’est 1–2 matchs.`);
      }
      if (me.gapToTop10 > 0) {
        lines.push(`Top 10 à ${me.gapToTop10} pts. Rattrapable en 1–2 soirs intenses. Fonce.`);
      }
      if (done < 5) {
        lines.push(
          done <= 0
            ? "Zéro match aujourd’hui. Le premier match = +20. Lance-le en 10 secondes."
            : `${done}/15 — encore ${5 - done} matchs pour la flamme +30. Ne t’arrête pas.`,
        );
      }
    } else {
      lines.push("Tu es dans la course. Protège ta place : 15 matchs + cartes + clash ce soir.");
    }
  }
  lines.push(`Aujourd’hui ${me.pointsToday}/${cap}. Ligne diamant : 10 500.`);
  lines.push(
    done <= 0
      ? "Tu n’as pas encore matché. Un match = 20 points. Lance le premier maintenant."
      : `Tu as ${done}/15 matchs. Chaque match = 20 pts, plafond 300.`,
  );
  if (nextFlame > 0) {
    lines.push(`Encore ${nextFlame} match${nextFlame > 1 ? "s" : ""} pour le bonus flamme +30.`);
  } else {
    lines.push("Tes deux flammes du jour sont lancées. Finis tes 15 matchs pour les 300.");
  }
  lines.push(
    cardPts <= 0
      ? "Cartes : 100 pts sur le jeu = 15 pts Challenge. Plafond 200."
      : `Cartes : ${cardPts} pts jeu → ${cardChallenge}/200 Challenge.`,
  );
  lines.push("Clash : Sign un rival en ligne. Un win = 1 éclair + 5 pts, plafond 100.");
  lines.push("5 phrases ou 3 slang : +40, une seule fois aujourd’hui.");
  const left = Math.max(cap - me.pointsToday, 0);
  if (left > 0) lines.push(`Encore ${left} points pour remplir la journée. Chaque clic compte.`);
  else lines.push("Journée pleine. Tu vises le diamant.");
  return lines;
}

function CoachTicker({ me }: { me: ChallengeMe }) {
  const lines = coachLines(me);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setIndex((n) => (n + 1) % lines.length), 5000);
    return () => window.clearInterval(timer);
  }, [lines.length, me.pointsToday, me.matchesToday, me.cardCorrectsToday, me.daysLeft, me.challengePoints, me.rank]);
  const daysLeft = Math.max(0, Number(me.daysLeft) || 0);
  return (
    <div className="mt-4 min-h-24 rounded-2xl bg-[#e8f6fb] p-4">
      {daysLeft > 0 && daysLeft <= 5 ? (
        <p className="mb-2 rounded-xl bg-[#fff1c2] px-3 py-2 text-center text-xs font-black uppercase tracking-[0.14em] text-[#8a6a12]">
          {daysLeft === 1 ? "Dernier jour — fonce" : `${daysLeft} jours restants — chaque match compte`}
        </p>
      ) : null}
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8a6a12]">Coach</p>
      <p key={index} className="mt-2 text-sm font-semibold text-[#1e4a5c]">
        {lines[index]}
      </p>
      <div className="mt-3 flex gap-1">
        {lines.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i === index ? "bg-[#c9a227]" : "bg-[#1e7a96]/20"}`}
          />
        ))}
      </div>
    </div>
  );
}

function DayPodium({
  title,
  people,
  empty,
}: {
  title: string;
  people: { rank: number; displayName: string; points: number }[];
  empty: string;
}) {
  const top = people.slice(0, 3);
  const order = [top[1], top[0], top[2]].filter(Boolean);
  return (
    <section className="challenge-card rounded-[28px] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8a6a12]">EfaTalk English Challenge 2026</p>
      <h2 className="mt-1 font-display text-2xl">{title}</h2>
      {top.length ? (
        <div className="mt-5 grid grid-cols-3 items-end gap-2">
          {order.map((person) => {
            const first = person.rank === 1;
            return (
              <article
                key={`${person.rank}-${person.displayName}`}
                className={`rounded-2xl px-2 py-4 text-center ${
                  first ? "bg-[#fff1c2] py-6" : "bg-[#e8f6fb]"
                }`}
              >
                <p className="text-2xl">{person.rank === 1 ? "🥇" : person.rank === 2 ? "🥈" : "🥉"}</p>
                <p className="mt-1 text-[11px] font-black uppercase tracking-[0.12em] text-[#8a6a12]">#{person.rank}</p>
                <p className="mt-1 line-clamp-2 text-xs font-black leading-tight">{person.displayName}</p>
                <p className="mt-1 text-xs font-bold text-[#8a6a12]">{person.points} pts</p>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 rounded-2xl bg-[#e8f6fb] p-5 text-center text-sm text-[#1e6a80]/70">{empty}</p>
      )}
    </section>
  );
}

function ParticipantPanel({
  me,
  copy,
}: {
  me: ChallengeMe;
  copy: (typeof COPY)[keyof typeof COPY];
}) {
  return (
    <section className="challenge-card rounded-[28px] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#8a6a12]">{copy.progress}</p>
          <h2 className="mt-1 font-display text-2xl">{me.displayName}</h2>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${me.eligible ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
          {me.eligible ? copy.eligible : copy.pending}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat icon={<Medal />} label={copy.rank} value={me.rank ? `#${me.rank}` : "—"} />
        <Stat icon={<Flame />} label={copy.challengePoints} value={`${me.challengePoints}`} />
        <Stat icon={<Clock3 />} label={copy.daily} value={`${me.pointsToday}/${me.dailyPointsCap}`} />
        <Stat icon={<ShieldCheck />} label={copy.lifetime} value={`${me.lifetimePoints}`} />
      </div>
      <CoachTicker me={me} />
      <button
        type="button"
        className="mt-3 flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#1e7a96] px-3 text-sm font-black text-[#fff8e4]"
        onClick={() => {
          void import("@/lib/challenge-poster").then(async ({ renderStudentPoster, shareOrDownload }) => {
            const blob = await renderStudentPoster({
              name: me.displayName || "Élève EfaTalk",
              rank: me.rank,
              pointsToday: me.pointsToday,
              total: me.challengePoints,
              cap: me.dailyPointsCap || 700,
            });
            await shareOrDownload(blob, "efatalk-ma-journee.png", "EfaTalk English Challenge 2026");
          });
        }}
      >
        Partager la carte de ma journée
      </button>
    </section>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#e8f6fb] p-3">
      <div className="h-4 w-4 text-[#8a6a12] [&>svg]:h-4 [&>svg]:w-4">{icon}</div>
      <p className="mt-2 text-xl font-black">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#1e6a80]/70">{label}</p>
    </div>
  );
}
