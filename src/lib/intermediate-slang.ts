export type SlangKind = "contraction" | "slang" | "phrasal";

export type SlangItem = {
  id: string;
  kind: SlangKind;
  phrase: string;
  example: string;
  fr: string;
  ar: string;
  aliases: string[];
};

export const SLANG_BANK: SlangItem[] = [
  { id: "s001", kind: "contraction", phrase: "gonna", example: "I'm gonna call you later.", fr: "je vais (à l’oral)", ar: "سـ / راح (كلام يومي)", aliases: ["going to", "im gonna", "i am gonna"] },
  { id: "s002", kind: "contraction", phrase: "gotta go", example: "Sorry, I gotta go now.", fr: "je dois y aller", ar: "لازم أمشي", aliases: ["got to go", "i gotta go", "gotta"] },
  { id: "s003", kind: "phrasal", phrase: "speak up", example: "Please speak up a little.", fr: "parle plus fort", ar: "ارفع صوتك", aliases: ["speak louder"] },
  { id: "s004", kind: "phrasal", phrase: "go ahead", example: "Go ahead, I'm listening.", fr: "vas-y", ar: "تفضل", aliases: ["go on"] },
  { id: "s005", kind: "phrasal", phrase: "hang out", example: "Let's hang out this weekend.", fr: "traîner ensemble", ar: "نقضي وقت سوا", aliases: ["hanging out"] },
  { id: "s006", kind: "slang", phrase: "what's up", example: "Hey, what's up?", fr: "quoi de neuf", ar: "شنو كاين / كيفك", aliases: ["whats up", "what is up", "wassup", "sup"] },
  { id: "s007", kind: "contraction", phrase: "wanna", example: "Do you wanna grab food?", fr: "tu veux", ar: "تبغي / ودك", aliases: ["want to", "you wanna"] },
  { id: "s008", kind: "contraction", phrase: "kinda", example: "I'm kinda tired tonight.", fr: "un peu", ar: "شوي", aliases: ["kind of"] },
  { id: "s009", kind: "contraction", phrase: "sorta", example: "It's sorta complicated.", fr: "en quelque sorte", ar: "نوعاً ما", aliases: ["sort of"] },
  { id: "s010", kind: "contraction", phrase: "dunno", example: "I dunno what to say.", fr: "je sais pas", ar: "ما نعرف", aliases: ["don't know", "do not know", "i dunno"] },
  { id: "s011", kind: "slang", phrase: "my bad", example: "My bad, I missed your call.", fr: "c’est ma faute", ar: "غلطي", aliases: ["my fault"] },
  { id: "s012", kind: "slang", phrase: "no worries", example: "No worries, we can wait.", fr: "t’inquiète", ar: "ما تخافش", aliases: ["no problem"] },
  { id: "s013", kind: "slang", phrase: "for real", example: "For real, that was crazy.", fr: "pour de vrai", ar: "بصح", aliases: ["for real though"] },
  { id: "s014", kind: "phrasal", phrase: "hold on", example: "Hold on, I’ll be right back.", fr: "attends", ar: "استنى", aliases: ["hang on", "wait"] },
  { id: "s015", kind: "phrasal", phrase: "check it out", example: "Check it out, this song slaps.", fr: "regarde ça", ar: "شوف هذا", aliases: ["check this out"] },
  { id: "s016", kind: "phrasal", phrase: "figure out", example: "I need to figure out the answer.", fr: "trouver / comprendre", ar: "نفهمها / نحلها", aliases: ["figured out"] },
  { id: "s017", kind: "phrasal", phrase: "catch up", example: "Let's catch up after class.", fr: "prendre des nouvelles", ar: "نتلحقو / نحكيو", aliases: ["catching up"] },
  { id: "s018", kind: "phrasal", phrase: "show up", example: "Please show up on time.", fr: "venir / arriver", ar: "تحضر", aliases: ["showed up"] },
  { id: "s019", kind: "phrasal", phrase: "give up", example: "Don't give up on English.", fr: "abandonner", ar: "تستسلم", aliases: ["gave up"] },
  { id: "s020", kind: "phrasal", phrase: "pick up", example: "Can you pick up the pace?", fr: "accélérer / récupérer", ar: "تزيد السرعة", aliases: ["picked up"] },
  { id: "s021", kind: "slang", phrase: "I'm down", example: "I'm down to practice now.", fr: "je suis partant", ar: "أنا موافق", aliases: ["im down", "i am down"] },
  { id: "s022", kind: "slang", phrase: "hit me up", example: "Hit me up when you arrive.", fr: "écris-moi", ar: "كلّمني", aliases: ["hit me up later"] },
  { id: "s023", kind: "slang", phrase: "no cap", example: "No cap, your English is fire.", fr: "sans mentir", ar: "بلا كذب", aliases: ["no capping"] },
  { id: "s024", kind: "slang", phrase: "that's fire", example: "That's fire, I love it.", fr: "c’est trop stylé", ar: "هذا نار", aliases: ["that is fire", "its fire"] },
  { id: "s025", kind: "slang", phrase: "low-key", example: "I low-key need a break.", fr: "un peu / discrètement", ar: "بصراحة شوي", aliases: ["lowkey", "low key"] },
  { id: "s026", kind: "slang", phrase: "high-key", example: "I high-key want pizza.", fr: "carrément", ar: "بصراحة بزاف", aliases: ["highkey", "high key"] },
  { id: "s027", kind: "slang", phrase: "bet", example: "Bet, see you at nine.", fr: "ok / c’est noté", ar: "تم / أوكي", aliases: ["you bet"] },
  { id: "s028", kind: "slang", phrase: "I feel you", example: "I feel you, that exam was hard.", fr: "je te comprends", ar: "حاسي بيك", aliases: ["i feel you", "feel you"] },
  { id: "s029", kind: "phrasal", phrase: "come on", example: "Come on, you can do it.", fr: "allez", ar: "يا الله", aliases: ["cmon"] },
  { id: "s030", kind: "phrasal", phrase: "calm down", example: "Calm down, we still have time.", fr: "détends-toi", ar: "تهدى", aliases: ["calm yourself"] },
  { id: "s031", kind: "phrasal", phrase: "hurry up", example: "Hurry up, the match is starting.", fr: "dépêche-toi", ar: "أسرع", aliases: ["hurry"] },
  { id: "s032", kind: "phrasal", phrase: "slow down", example: "Slow down, I missed that word.", fr: "ralentis", ar: "تمهل", aliases: ["go slower"] },
  { id: "s033", kind: "phrasal", phrase: "turn on", example: "Turn on your microphone please.", fr: "allume", ar: "شغّل", aliases: ["switch on"] },
  { id: "s034", kind: "phrasal", phrase: "turn off", example: "Turn off the TV and talk.", fr: "éteins", ar: "اطفي", aliases: ["switch off"] },
  { id: "s035", kind: "phrasal", phrase: "wake up", example: "I wake up at six every day.", fr: "se réveiller", ar: "نفيق", aliases: ["woke up"] },
  { id: "s036", kind: "phrasal", phrase: "get up", example: "Get up and join the room.", fr: "lève-toi", ar: "قوم", aliases: ["got up"] },
  { id: "s037", kind: "phrasal", phrase: "head out", example: "I'm about to head out.", fr: "je sors", ar: "خارج دابا", aliases: ["heading out"] },
  { id: "s038", kind: "phrasal", phrase: "wrap up", example: "Let's wrap up this topic.", fr: "conclure", ar: "نكمّلو", aliases: ["wrap it up"] },
  { id: "s039", kind: "phrasal", phrase: "find out", example: "I just found out the truth.", fr: "découvrir", ar: "اكتشفت", aliases: ["found out"] },
  { id: "s040", kind: "phrasal", phrase: "run into", example: "I ran into my teacher today.", fr: "croiser par hasard", ar: "تصادفت", aliases: ["ran into"] },
  { id: "s041", kind: "phrasal", phrase: "look after", example: "Can you look after my bag?", fr: "surveiller / s’occuper de", ar: "تعتني بـ", aliases: ["take care of"] },
  { id: "s042", kind: "phrasal", phrase: "look up", example: "Look up this word later.", fr: "chercher (un mot)", ar: "فتّش على الكلمة", aliases: ["look it up"] },
  { id: "s043", kind: "phrasal", phrase: "write down", example: "Write down three new words.", fr: "noter", ar: "اكتب", aliases: ["write it down"] },
  { id: "s044", kind: "phrasal", phrase: "put on", example: "Put on your headphones.", fr: "mettre (un vêtement)", ar: "البس", aliases: ["put it on"] },
  { id: "s045", kind: "phrasal", phrase: "take off", example: "The plane will take off soon.", fr: "décoller / enlever", ar: "تقلع / انزع", aliases: ["took off"] },
  { id: "s046", kind: "slang", phrase: "that's wild", example: "That's wild, tell me more.", fr: "c’est dingue", ar: "هذا جنون", aliases: ["that is wild"] },
  { id: "s047", kind: "slang", phrase: "big deal", example: "It's not a big deal.", fr: "pas grave / pas si important", ar: "ماشي مشكلة كبيرة", aliases: ["not a big deal"] },
  { id: "s048", kind: "slang", phrase: "long story short", example: "Long story short, we won.", fr: "en gros", ar: "باختصار", aliases: ["long story short"] },
  { id: "s049", kind: "slang", phrase: "by the way", example: "By the way, nice jacket.", fr: "au fait", ar: "بالمناسبة", aliases: ["btw"] },
  { id: "s050", kind: "slang", phrase: "right now", example: "I need help right now.", fr: "tout de suite", ar: "دابا", aliases: ["right away"] },
  { id: "s051", kind: "slang", phrase: "see ya", example: "See ya after the match.", fr: "à plus", ar: "نتلاقاو", aliases: ["see you", "see you later"] },
  { id: "s052", kind: "slang", phrase: "take care", example: "Take care, talk tomorrow.", fr: "prends soin de toi", ar: "تتهلا فراسك", aliases: ["take care now"] },
  { id: "s053", kind: "slang", phrase: "no way", example: "No way, that's impossible.", fr: "pas possible", ar: "ما يمكنش", aliases: ["no way"] },
  { id: "s054", kind: "slang", phrase: "for sure", example: "For sure, I'll be there.", fr: "carrément", ar: "أكيد", aliases: ["sure"] },
  { id: "s055", kind: "slang", phrase: "of course", example: "Of course I can help you.", fr: "bien sûr", ar: "طبعاً", aliases: ["of course"] },
  { id: "s056", kind: "contraction", phrase: "ain't", example: "This ain't easy, but we try.", fr: "n’est pas (oral)", ar: "ماشي (كلام شارع)", aliases: ["is not", "are not"] },
  { id: "s057", kind: "contraction", phrase: "y'all", example: "Y'all ready for tonight?", fr: "vous tous", ar: "كلكم", aliases: ["you all", "ya all"] },
  { id: "s058", kind: "slang", phrase: "hows it going", example: "How's it going today?", fr: "comment ça va", ar: "كيف الحال", aliases: ["how is it going", "how's it going"] },
  { id: "s059", kind: "phrasal", phrase: "drop by", example: "Drop by my place later.", fr: "passer (vite)", ar: "فوت عليا", aliases: ["drop in"] },
  { id: "s060", kind: "phrasal", phrase: "chill out", example: "Chill out, we got this.", fr: "détends-toi", ar: "ارتخي", aliases: ["chill"] },
  { id: "s061", kind: "phrasal", phrase: "work out", example: "I work out in the morning.", fr: "faire du sport / marcher", ar: "نتمرن", aliases: ["workout"] },
  { id: "s062", kind: "phrasal", phrase: "eat out", example: "Let's eat out tonight.", fr: "manger au resto", ar: "نأكلو برا", aliases: ["eating out"] },
  { id: "s063", kind: "phrasal", phrase: "stay in", example: "I want to stay in and rest.", fr: "rester à la maison", ar: "نبقى في الدار", aliases: ["staying in"] },
  { id: "s064", kind: "slang", phrase: "I'm beat", example: "I'm beat after that class.", fr: "je suis crevé", ar: "عييت", aliases: ["im beat", "i am beat"] },
  { id: "s065", kind: "slang", phrase: "that's dope", example: "That's dope, play it again.", fr: "c’est trop bien", ar: "هذا زوين", aliases: ["dope", "that is dope"] },
  { id: "s066", kind: "slang", phrase: "it's lit", example: "This room is lit tonight.", fr: "c’est en feu", ar: "الحلقة نار", aliases: ["its lit", "it is lit"] },
  { id: "s067", kind: "slang", phrase: "on point", example: "Your answer was on point.", fr: "pile / impeccable", ar: "مضبوط", aliases: ["on point"] },
  { id: "s068", kind: "slang", phrase: "keep going", example: "Keep going, you're close.", fr: "continue", ar: "كمّل", aliases: ["keep it up"] },
  { id: "s069", kind: "phrasal", phrase: "sit down", example: "Sit down and get comfortable.", fr: "assieds-toi", ar: "جلس", aliases: ["have a seat"] },
  { id: "s070", kind: "phrasal", phrase: "stand up", example: "Stand up and stretch a bit.", fr: "lève-toi", ar: "وقف", aliases: ["stand up"] },
  { id: "s071", kind: "phrasal", phrase: "come back", example: "Come back after two minutes.", fr: "reviens", ar: "ارجع", aliases: ["came back"] },
  { id: "s072", kind: "phrasal", phrase: "wait up", example: "Wait up, I'm right behind you.", fr: "attends-moi", ar: "استنى عليا", aliases: ["wait for me"] },
  { id: "s073", kind: "slang", phrase: "good luck", example: "Good luck on your match.", fr: "bonne chance", ar: "بالتوفيق", aliases: ["best of luck"] },
  { id: "s074", kind: "slang", phrase: "as soon as", example: "Call me as soon as you can.", fr: "dès que", ar: "حالا ما", aliases: ["as soon as"] },
  { id: "s075", kind: "phrasal", phrase: "cheer up", example: "Cheer up, tomorrow is better.", fr: "remontes-toi", ar: "افرح", aliases: ["cheer up"] },
  { id: "s076", kind: "phrasal", phrase: "dress up", example: "We should dress up tonight.", fr: "s’habiller bien", ar: "نتلباو مزيان", aliases: ["dressed up"] },
  { id: "s077", kind: "slang", phrase: "spill", example: "Spill, what happened?", fr: "raconte tout", ar: "احكي", aliases: ["spill the tea", "spill it"] },
  { id: "s078", kind: "slang", phrase: "bounce", example: "I have to bounce, class starts.", fr: "je me casse", ar: "نمشي", aliases: ["i bounce", "gotta bounce"] },
  { id: "s079", kind: "slang", phrase: "flex", example: "Don't flex too hard, bro.", fr: "frimer", ar: "تتفاخر", aliases: ["flexing"] },
  { id: "s080", kind: "slang", phrase: "vibe", example: "I like the vibe in here.", fr: "l’ambiance", ar: "الأجواء", aliases: ["the vibe", "vibes"] },
  { id: "s081", kind: "contraction", phrase: "lemme", example: "Lemme try that sentence.", fr: "laisse-moi", ar: "خليني", aliases: ["let me", "let me"] },
  { id: "s082", kind: "contraction", phrase: "gimme", example: "Gimme one more second.", fr: "donne-moi", ar: "عطيني", aliases: ["give me"] },
  { id: "s083", kind: "contraction", phrase: "outta", example: "I'm outta time tonight.", fr: "à court de", ar: "سالات", aliases: ["out of"] },
  { id: "s084", kind: "contraction", phrase: "hafta", example: "I hafta finish this first.", fr: "je dois", ar: "خصني", aliases: ["have to", "gotta"] },
  { id: "s085", kind: "phrasal", phrase: "break it down", example: "Break it down in simple words.", fr: "explique simplement", ar: "فسّرها ببساطة", aliases: ["break it down"] },
  { id: "s086", kind: "phrasal", phrase: "call back", example: "I'll call back in five minutes.", fr: "rappeler", ar: "نعيط ناني", aliases: ["call you back"] },
  { id: "s087", kind: "slang", phrase: "you got this", example: "You got this, just speak.", fr: "tu vas y arriver", ar: "تقدر", aliases: ["you got this", "youve got this"] },
  { id: "s088", kind: "slang", phrase: "say less", example: "Say less, I'm already coming.", fr: "t’as pas besoin d’en dire plus", ar: "يكفي", aliases: ["say less"] },
  { id: "s089", kind: "slang", phrase: "it's whatever", example: "It's whatever, let's move on.", fr: "c’est pas grave", ar: "عادي", aliases: ["its whatever", "whatever"] },
  { id: "s090", kind: "phrasal", phrase: "bring up", example: "Don't bring up that fight again.", fr: "mentionner", ar: "تهضر على", aliases: ["brought up"] },
];

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffledBank(cycle: number) {
  const items = [...SLANG_BANK];
  const rand = mulberry32(cycle * 9973 + 41);
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const swap = items[i];
    items[i] = items[j];
    items[j] = swap;
  }
  return items;
}

/** Progressive 3-card batch. dayIndex only grows; cycles reshuffle, they never rewind to week 1. */
export function slangBatchForDay(dayIndex: number): SlangItem[] {
  const perDay = 3;
  const daysPerCycle = Math.floor(SLANG_BANK.length / perDay);
  const safe = Math.max(0, Math.floor(dayIndex));
  const cycle = Math.floor(safe / daysPerCycle);
  const offset = (safe % daysPerCycle) * perDay;
  return shuffledBank(cycle).slice(offset, offset + perDay);
}

export function slangKindLabel(kind: SlangKind, locale: "en" | "fr" | "ar") {
  const map = {
    en: { contraction: "Contraction", slang: "Street slang", phrasal: "Phrasal verb" },
    fr: { contraction: "Contraction", slang: "Slang de rue", phrasal: "Verbe à particule" },
    ar: { contraction: "اختصار", slang: "كلام شارع", phrasal: "فعل مركب" },
  } as const;
  return map[locale][kind];
}
