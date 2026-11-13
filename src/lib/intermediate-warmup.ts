export type WarmupCard = {
  id: string;
  promptFr: string;
  promptAr: string;
  words: string[];
};

export const WARMUP_SECONDS = 10;

export const WARMUP_BANK: WarmupCard[] = [
  { id: "w01", promptFr: "Je dois prendre le bus avant huit heures.", promptAr: "يجب أن أركب الحافلة قبل الثامنة.", words: ["I", "need", "to", "catch", "the", "bus", "before", "eight"] },
  { id: "w02", promptFr: "Peux-tu m’aider avec ce problème ?", promptAr: "هل يمكنك مساعدتي في هذه المشكلة؟", words: ["Can", "you", "help", "me", "with", "this", "problem"] },
  { id: "w03", promptFr: "Nous devons parler du plan ce soir.", promptAr: "يجب أن نتحدث عن الخطة الليلة.", words: ["We", "should", "talk", "about", "the", "plan", "tonight"] },
  { id: "w04", promptFr: "Elle veut trouver un meilleur travail.", promptAr: "تريد أن تجد عملاً أفضل.", words: ["She", "wants", "to", "find", "a", "better", "job"] },
  { id: "w05", promptFr: "Ils attendent le professeur.", promptAr: "إنهم ينتظرون الأستاذ.", words: ["They", "are", "waiting", "for", "the", "teacher"] },
  { id: "w06", promptFr: "Ferme la porte derrière toi, s’il te plaît.", promptAr: "أغلق الباب وراءك من فضلك.", words: ["Please", "close", "the", "door", "behind", "you"] },
  { id: "w07", promptFr: "J’ai oublié mon téléphone à la maison.", promptAr: "نسيت هاتفي في البيت.", words: ["I", "forgot", "my", "phone", "at", "home"] },
  { id: "w08", promptFr: "Il cherche un hôtel pas cher.", promptAr: "يبحث عن فندق رخيص.", words: ["He", "is", "looking", "for", "a", "cheap", "hotel"] },
  { id: "w09", promptFr: "Retrouvons-nous devant le marché.", promptAr: "لنلتقِ أمام السوق.", words: ["Let's", "meet", "in", "front", "of", "the", "market"] },
  { id: "w10", promptFr: "Internet ne marche pas aujourd’hui.", promptAr: "الإنترنت لا يعمل اليوم.", words: ["The", "internet", "is", "not", "working", "today"] },
  { id: "w11", promptFr: "J’essaie d’améliorer mon anglais chaque jour.", promptAr: "أحاول تحسين إنجليزيتي كل يوم.", words: ["I", "am", "trying", "to", "improve", "my", "English", "every", "day"] },
  { id: "w12", promptFr: "N’oublie pas d’envoyer le message.", promptAr: "لا تنسَ إرسال الرسالة.", words: ["Do", "not", "forget", "to", "send", "the", "message"] },
  { id: "w13", promptFr: "La réunion commence dans dix minutes.", promptAr: "يبدأ الاجتماع بعد عشر دقائق.", words: ["The", "meeting", "starts", "in", "ten", "minutes"] },
  { id: "w14", promptFr: "Nous avons besoin de plus de temps.", promptAr: "نحتاج إلى مزيد من الوقت.", words: ["We", "need", "more", "time"] },
  { id: "w15", promptFr: "Elle a l’habitude de travailler le soir.", promptAr: "اعتادت أن تعمل في المساء.", words: ["She", "usually", "works", "in", "the", "evening"] },
  { id: "w16", promptFr: "Je ne suis pas d’accord avec cette idée.", promptAr: "أنا لا أتفق مع هذه الفكرة.", words: ["I", "do", "not", "agree", "with", "this", "idea"] },
  { id: "w17", promptFr: "Peux-tu répéter ça plus lentement ?", promptAr: "هل يمكنك إعادة ذلك ببطء؟", words: ["Can", "you", "repeat", "that", "more", "slowly"] },
  { id: "w18", promptFr: "Il a décidé de changer de ville.", promptAr: "قرر أن يغيّر المدينة.", words: ["He", "decided", "to", "move", "to", "another", "city"] },
  { id: "w19", promptFr: "S’il te plaît, explique ton point de vue.", promptAr: "من فضلك اشرح رأيك.", words: ["Please", "explain", "your", "point", "of", "view"] },
  { id: "w20", promptFr: "Ils veulent économiser de l’argent ce mois-ci.", promptAr: "يريدون توفير المال هذا الشهر.", words: ["They", "want", "to", "save", "money", "this", "month"] },
  { id: "w21", promptFr: "Je vais appeler ma famille après le cours.", promptAr: "سأتصل بعائلتي بعد الحصة.", words: ["I", "will", "call", "my", "family", "after", "class"] },
  { id: "w22", promptFr: "Le professeur nous a donné un devoir important.", promptAr: "أعطانا الأستاذ واجباً مهماً.", words: ["The", "teacher", "gave", "us", "important", "homework"] },
  { id: "w23", promptFr: "Nous devons arriver à l’heure demain.", promptAr: "يجب أن نصل في الوقت غداً.", words: ["We", "must", "arrive", "on", "time", "tomorrow"] },
  { id: "w24", promptFr: "Elle a peur de parler devant le groupe.", promptAr: "تخاف أن تتكلم أمام المجموعة.", words: ["She", "is", "afraid", "to", "speak", "in", "front", "of", "the", "group"] },
];

export function pickWarmup(seen: string[], lastId: string | null) {
  let pool = WARMUP_BANK.filter((item) => !seen.includes(item.id));
  if (!pool.length) pool = WARMUP_BANK.filter((item) => item.id !== lastId);
  if (!pool.length) pool = WARMUP_BANK;
  const salt = seen.length * 19 + (lastId ? lastId.charCodeAt(lastId.length - 1) : 7);
  return pool[Math.abs(salt) % pool.length];
}
