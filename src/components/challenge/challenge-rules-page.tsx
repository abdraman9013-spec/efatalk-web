"use client";

import Link from "next/link";
import { useEffect } from "react";
import { LanguageSwitcher } from "@/components/landing/language-switcher";
import { markChallengeOpened } from "@/lib/challenge-gates";
import { useI18n } from "@/i18n/provider";

const CONTENT = {
  fr: {
    title: "Règlement officiel",
    intro: "EfaTalk English Challenge 2026 · 15–29 octobre · heure de N’Djamena",
    back: "Retour au Challenge",
    sections: [
      ["Le principe", "Tous les participants commencent le classement du prix à 0 le 15 octobre. Tes anciens points, rangs et diamants restent dans ton total EfaTalk. Chaque point gagné pendant le Challenge augmente à la fois ton total EfaTalk et ton score Challenge."],
      ["Les prix", "1er : 75 000 FCFA — EfaTalk English Champion 2026. 2e : 50 000 FCFA. 3e : 25 000 FCFA. Total : 150 000 FCFA."],
      ["Éligibilité au prix", "Compte vérifié, profil complété, puis les 3 cases : règlement, TikTok, Facebook. Dès l’inscription avec ces 3 cases, tu es éligible."],
      ["Points", "Plafond 700 pts / jour. Match : 20 pts (max 15 = 300). Flamme +30 aux 5e et 10e matchs (60). Cartes : 100 pts jeu = 15 Challenge (max 200). Clash gagné : 5 pts + 1 éclair (max 100). 5 phrases ou 3 slang : 40 une fois. 15 jours × 700 = 10 500 diamant. Bronze 500 comme d’habitude."],
      ["Réseaux sociaux", "Le suivi TikTok/Facebook est déclaré par l’élève et peut être vérifié manuellement. EfaTalk ne prétend pas disposer d’une vérification API automatique."],
      ["Parrainage", "Le parrainage du Challenge est fermé. Les points se gagnent uniquement par la pratique."],
      ["Classement et égalité", "Le score Challenge décide du rang. Une seule personne par place (1, 2, 3, 4…). En cas d’égalité, on départage par les points d’apprentissage, les jours actifs, les sessions de parole, puis celui qui a atteint le score en premier."],
      ["Fin et vérification", "Le 29 octobre à 23:59:59, les points compétitifs s’arrêtent. Le 30 octobre, EfaTalk recalcule, examine les alertes et vérifie l’éligibilité avant de publier les gagnants."],
      ["Disqualification", "Faux comptes, robots, auto-parrainage, matchs manipulés, falsification d’activité, abus ou exploitation technique peuvent entraîner retrait de points ou disqualification avec preuve et audit."],
      ["Vie privée", "Le classement public affiche seulement le nom public, la photo choisie, les points et les données autorisées. Email, téléphone, IP et signaux de fraude restent privés."],
    ],
  },
  en: {
    title: "Official rules",
    intro: "EfaTalk English Challenge 2026 · 15–29 October · N’Djamena time",
    back: "Back to the Challenge",
    sections: [
      ["Core rule", "Everyone starts the prize leaderboard at 0 on 15 October. Existing points, ranks and diamonds stay in the lifetime EfaTalk total. Every point earned during the Challenge increases both totals."],
      ["Prizes", "1st: 75,000 FCFA — EfaTalk English Champion 2026. 2nd: 50,000 FCFA. 3rd: 25,000 FCFA. Total: 150,000 FCFA."],
      ["Prize eligibility", "Verified account, complete profile, then the 3 boxes: rules, TikTok, Facebook. After joining with those 3 boxes you are eligible."],
      ["Points", "Daily cap 700. Match: 20 pts (max 15 = 300). Flame +30 at the 5th and 10th match (60). Cards: 100 game pts = 15 Challenge (max 200). Clash win: 5 pts + 1 bolt (max 100). 5 phrases or 3 slang: 40 once. 15 × 700 = 10,500 diamond. Bronze 500 as usual."],
      ["Social pages", "TikTok/Facebook follows are self-declared and may be manually reviewed. EfaTalk does not claim automatic API verification."],
      ["Referrals", "Challenge referrals are closed. Points come from practice only."],
      ["Leaderboard and ties", "Challenge score determines rank. One person per place (1, 2, 3, 4…). Ties are broken by learning points, active days, speaking sessions, then who reached the score first."],
      ["Finish and review", "Competitive scoring stops on 29 October at 23:59:59. On 30 October, EfaTalk recalculates, reviews flags and verifies eligibility before announcing winners."],
      ["Disqualification", "Fake accounts, bots, self-referrals, manipulated matches, false activity, abuse or technical exploitation can lead to point removal or disqualification with evidence."],
      ["Privacy", "The public board shows only the public name, chosen photo, points and permitted data. Email, phone, IP and fraud signals stay private."],
    ],
  },
  ar: {
    title: "القواعد الرسمية",
    intro: "EfaTalk English Challenge 2026 · من 15 إلى 29 أكتوبر · توقيت نجامينا",
    back: "العودة إلى التحدي",
    sections: [
      ["المبدأ", "يبدأ الجميع ترتيب الجائزة من صفر يوم 15 أكتوبر. تبقى النقاط والرتب والماس القديمة في مجموع EfaTalk الدائم. كل نقطة خلال التحدي تزيد المجموعين."],
      ["الجوائز", "الأول: 75,000 فرنك — بطل EfaTalk للإنجليزية 2026. الثاني: 50,000. الثالث: 25,000. المجموع: 150,000 فرنك."],
      ["أهلية الجائزة", "حساب موثق وملف مكتمل ثم الخانات الثلاث: القواعد وTikTok وFacebook. بعد التسجيل بهذه الخانات أنت مؤهل. دعوة الأصدقاء تمنح 30 نقطة لكل صديق وليست شرطاً للأهلية."],
      ["النقاط", "معظم النقاط من الممارسة: خمس جمل، غرفة الكلام، البطاقات، الاختبار وتحدي اليوم. يوجد سقف يومي ولا تمنح الإعادة المصطنعة نقاطاً بلا حدود."],
      ["الشبكات الاجتماعية", "متابعة TikTok وFacebook تصريح من الطالب ويمكن مراجعتها يدوياً. لا تدّعي EfaTalk وجود تحقق آلي عبر API."],
      ["الإحالات", "تُقبل الإحالة عند تسجيل الصديق في التحدي. تمنح 30 نقطة ضمن السقف. الحساب الفارغ أو الوهمي أو الإحالة الذاتية لا تُحسب."],
      ["الترتيب والتعادل", "نقاط التحدي تحدد الترتيب. عند التعادل: نقاط التعلم الموثقة، الأيام النشطة، جلسات الكلام، ثم الوصول المبكر للنتيجة النهائية."],
      ["النهاية والتحقق", "يتوقف التسجيل التنافسي يوم 29 أكتوبر الساعة 23:59:59. في 30 أكتوبر تعيد EfaTalk الحساب وتراجع التنبيهات والأهلية قبل إعلان الفائزين."],
      ["الاستبعاد", "الحسابات الوهمية والروبوتات والإحالة الذاتية والتلاعب بالمباريات والنشاط المزيف والاستغلال التقني قد تؤدي إلى حذف النقاط أو الاستبعاد مع الدليل."],
      ["الخصوصية", "يظهر علناً الاسم والصورة المختارة والنقاط والبيانات المسموح بها فقط. البريد والهاتف وIP وإشارات الاحتيال خاصة."],
    ],
  },
} as const;

export function ChallengeRulesPage() {
  const { locale } = useI18n();
  const copy = CONTENT[locale];
  useEffect(() => {
    markChallengeOpened("rules");
  }, []);
  return (
    <div className="challenge-sea">
      <header className="challenge-sea-header sticky top-0 z-20 px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <Link href="/challenge" className="font-display">{copy.back}</Link>
          <LanguageSwitcher />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#8a6a12]">EfaTalk Challenge 2026</p>
        <h1 className="mt-2 font-display text-4xl">{copy.title}</h1>
        <p className="mt-2 text-sm text-[#1e6a80]">{copy.intro}</p>
        <div className="mt-7 space-y-3">
          {copy.sections.map(([title, body], index) => (
            <section key={title} className="challenge-card rounded-[24px] p-5">
              <p className="text-[10px] font-black text-[#8a6a12]">{String(index + 1).padStart(2, "0")}</p>
              <h2 className="mt-1 font-display text-xl">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#134e63]/85">{body}</p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
