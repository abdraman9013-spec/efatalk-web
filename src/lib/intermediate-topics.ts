export type DebateTopic = {
  id: string;
  title: { en: string; fr: string; ar: string };
  questions: { en: string; fr: string; ar: string }[];
};

export const DEBATE_TOPICS: DebateTopic[] = [
  {
    id: "tiktok-facebook",
    title: { en: "TikTok vs Facebook", fr: "TikTok contre Facebook", ar: "تيك توك ضد فيسبوك" },
    questions: [
      { en: "Which app wastes more time, and why?", fr: "Quelle appli fait perdre plus de temps, et pourquoi ?", ar: "أي تطبيق يضيّع وقت أكثر ولماذا؟" },
      { en: "Where do you see more real friends?", fr: "Où vois-tu plus de vrais amis ?", ar: "وين كتشوف أصحاب حقيقيين أكثر؟" },
      { en: "If you could keep only one, which one?", fr: "Si tu n’en gardes qu’une, laquelle ?", ar: "إلا بقيتي غير واحد، شنو تختار؟" },
    ],
  },
  {
    id: "madrid-barca",
    title: { en: "Real Madrid vs Barcelona", fr: "Real Madrid contre Barcelone", ar: "ريال مدريد ضد برشلونة" },
    questions: [
      { en: "Who is the GOAT: Messi or Ronaldo?", fr: "Qui est le GOAT : Messi ou Ronaldo ?", ar: "من الأعظم: ميسي ولا رونالدو؟" },
      { en: "Which team has the best stadium?", fr: "Quelle équipe a le plus beau stade ?", ar: "شنو الفريق اللي عندو أحسن ملعب؟" },
      { en: "Would you rather win the league or the Champions League?", fr: "Tu préfères gagner le championnat ou la Ligue des champions ?", ar: "تفضل الدوري ولا دوري الأبطال؟" },
    ],
  },
  {
    id: "iphone-android",
    title: { en: "iPhone vs Android", fr: "iPhone contre Android", ar: "آيفون ضد أندرويد" },
    questions: [
      { en: "What matters more: camera or battery?", fr: "C’est quoi le plus important : caméra ou batterie ?", ar: "شنو أهم: الكاميرا ولا البطارية؟" },
      { en: "Is paying more for a phone worth it?", fr: "Est-ce que payer plus cher pour un téléphone vaut le coup ?", ar: "واش كيسوى تزيد فلوس على تليفون؟" },
      { en: "Can you survive one week without your phone?", fr: "Tu tiens une semaine sans téléphone ?", ar: "تقدر أسبوع بلا تليفون؟" },
    ],
  },
  {
    id: "street-resto",
    title: { en: "Street food vs restaurant", fr: "Street food contre restaurant", ar: "أكل الشارع ضد المطعم" },
    questions: [
      { en: "What is the best street food in your city?", fr: "C’est quoi le meilleur street food de ta ville ?", ar: "شنو أحسن أكل شارع في مدينتك؟" },
      { en: "Do you care more about price or taste?", fr: "Tu regardes plus le prix ou le goût ?", ar: "تهتم بالثمن ولا الذوق أكثر؟" },
      { en: "Would you take a date to a street stall?", fr: "Tu emmènes un date au stand de rue ?", ar: "تاخذ موعد في كشك الشارع؟" },
    ],
  },
  {
    id: "city-village",
    title: { en: "Big city vs small town", fr: "Grande ville contre petit village", ar: "مدينة كبيرة ضد بلدة صغيرة" },
    questions: [
      { en: "Where is life less stressful?", fr: "Où la vie est moins stressante ?", ar: "وين الحياة أقل توتر؟" },
      { en: "Where can you make money faster?", fr: "Où gagne-t-on de l’argent plus vite ?", ar: "وين تقدر تربح فلوس أسرع؟" },
      { en: "Where would you raise a family?", fr: "Où ferais-tu grandir une famille ?", ar: "وين تربي عائلة؟" },
    ],
  },
  {
    id: "online-school",
    title: { en: "Online class vs classroom", fr: "Cours en ligne contre salle de classe", ar: "درس أونلاين ضد القسم" },
    questions: [
      { en: "Where do you speak more English?", fr: "Où parles-tu plus anglais ?", ar: "وين كتهضر إنجليزية أكثر؟" },
      { en: "Is the camera a help or a fear?", fr: "La caméra, ça aide ou ça fait peur ?", ar: "الكاميرا مساعدة ولا خوف؟" },
      { en: "What is harder: homework or speaking live?", fr: "C’est plus dur : les devoirs ou parler en direct ?", ar: "شنو أصعب: الواجبات ولا الهضرة لايف؟" },
    ],
  },
  {
    id: "tea-coffee",
    title: { en: "Tea vs coffee", fr: "Thé contre café", ar: "أتي ضد قهوة" },
    questions: [
      { en: "What do you drink before a long night?", fr: "Tu bois quoi avant une longue soirée ?", ar: "شنو تشرب قبل ليلة طويلة؟" },
      { en: "Can you work without caffeine?", fr: "Tu travailles sans caféine ?", ar: "تقدر تخدم بلا كافيين؟" },
      { en: "Sweet tea or black coffee — pick one.", fr: "Thé sucré ou café noir — un seul choix.", ar: "أتي حلو ولا قهوة كحلة؟" },
    ],
  },
  {
    id: "football-basket",
    title: { en: "Football vs basketball", fr: "Football contre basketball", ar: "كرة القدم ضد كرة السلة" },
    questions: [
      { en: "Which sport is more fun to watch?", fr: "Quel sport est plus fun à regarder ?", ar: "شنو الرياضة اللي أمتع للفرجة؟" },
      { en: "Which one is harder to play well?", fr: "Lequel est plus dur à bien jouer ?", ar: "شنو أصعب تلعب مزيان؟" },
      { en: "Who is more famous: a football star or a rapper?", fr: "Qui est plus célèbre : une star du foot ou un rappeur ?", ar: "شنو أشهر: نجم كورة ولا رابر؟" },
    ],
  },
  {
    id: "save-spend",
    title: { en: "Save money vs enjoy now", fr: "Épargner contre profiter maintenant", ar: "وفر ضد استمتع دابا" },
    questions: [
      { en: "What was your last useless purchase?", fr: "C’était quoi ton dernier achat inutile ?", ar: "شنو آخر حاجة شريتيها بلا فايدة؟" },
      { en: "Is sending money home a duty or a choice?", fr: "Envoyer de l’argent à la maison, devoir ou choix ?", ar: "تصيفط الفلوس للدار واجب ولا اختيار؟" },
      { en: "Would you skip a party to save cash?", fr: "Tu rates une soirée pour économiser ?", ar: "تفوت حفلة باش توفر؟" },
    ],
  },
  {
    id: "love-focus",
    title: { en: "Relationship vs self-focus", fr: "Relation contre focus sur soi", ar: "علاقة ضد التركيز على راسك" },
    questions: [
      { en: "Can love wait while you build your future?", fr: "L’amour peut attendre pendant que tu construis ton futur ?", ar: "الحب يقدر يستنى وأنت تبني مستقبلك؟" },
      { en: "What is a red flag on a first call?", fr: "C’est quoi un red flag au premier appel ?", ar: "شنو علامة حمرا في أول مكالمة؟" },
      { en: "Would you date someone who speaks no English?", fr: "Tu sortirais avec quelqu’un qui ne parle pas anglais ?", ar: "تخرج مع واحد ما كيهضرش إنجليزية؟" },
    ],
  },
  {
    id: "travel-stay",
    title: { en: "Travel abroad vs stay home", fr: "Voyager à l’étranger contre rester au pays", ar: "سفر برا ضد البقاء في البلاد" },
    questions: [
      { en: "Which country is your number one target?", fr: "C’est quel pays ton numéro un ?", ar: "شنو أول دولة في راسك؟" },
      { en: "Is leaving family the hardest part?", fr: "Partir de la famille, c’est le plus dur ?", ar: "مغادرة العائلة هي أصعب حاجة؟" },
      { en: "Would you go with no job waiting?", fr: "Tu partirais sans job qui t’attend ?", ar: "تمشي بلا خدمة كاتسناك؟" },
    ],
  },
  {
    id: "movies-series",
    title: { en: "Movies vs series", fr: "Films contre séries", ar: "أفلام ضد مسلسلات" },
    questions: [
      { en: "What did you binge last week?", fr: "T’as binge quoi la semaine dernière ?", ar: "شنو شفتي بزاف الأسبوع اللي فات؟" },
      { en: "Subtitles: English, French, or Arabic?", fr: "Sous-titres : anglais, français ou arabe ?", ar: "الترجمة: إنجليزية، فرنسية ولا عربية؟" },
      { en: "Can a two-hour movie beat a whole season?", fr: "Un film de deux heures peut battre une saison entière ?", ar: "فيلم ساعتين يقدر يغلب موسم كامل؟" },
    ],
  },
  {
    id: "student-hustle",
    title: {
      en: "How can a student make money in Chad?",
      fr: "Comment un étudiant gagne de l’argent au Tchad ?",
      ar: "الطالب في تشاد يقدر يربح فلوس كيف؟",
    },
    questions: [
      {
        en: "Would you sell airtime, drive a clando, or teach English after class?",
        fr: "Tu vends du crédit, tu fais le clando, ou tu donnes des cours d’anglais après les cours ?",
        ar: "تبيع رصيد، تسوق كلاندو، ولا تدرّس إنجليزية بعد الدراسة؟",
      },
      {
        en: "Is hustling at Dembé market smarter than waiting for an NGO internship?",
        fr: "Le hustle au marché de Dembé, c’est plus malin que d’attendre un stage ONG ?",
        ar: "الشغل في سوق دمبي أذكى من انتظار تدريب منظمة؟",
      },
      {
        en: "Would you skip university if gold in the north paid this month?",
        fr: "Tu lâches l’université si l’or du nord paie ce mois-ci ?",
        ar: "تسيب الجامعة لو ذهب الشمال يدفع هالشهر؟",
      },
    ],
  },
  {
    id: "poor-rich-dream",
    title: {
      en: "The poor dream to be rich. What do the rich dream to be?",
      fr: "Le pauvre rêve d’être riche. Le riche rêve d’être quoi ?",
      ar: "الفقير يحلم يغنى. الغني يحلم يكون شنو؟",
    },
    questions: [
      {
        en: "If money is not the last dream, what is — peace, a visa, or respect?",
        fr: "Si l’argent n’est pas le dernier rêve, c’est quoi : la paix, un visa, ou le respect ?",
        ar: "لو الفلوس مو آخر حلم، شنو الباقي: سلام، فيزا، ولا احترام؟",
      },
      {
        en: "Can a rich man in N'Djamena still feel poor if his brother is hungry in the village?",
        fr: "Un riche à N'Djaména peut-il se sentir pauvre si son frère a faim au village ?",
        ar: "غني في نجامينا يقدر يحس فقير وأخوه جعان في القرية؟",
      },
      {
        en: "Would you rather be rich and hated, or poor but free in your quartier?",
        fr: "Tu préfères riche et détesté, ou pauvre mais libre dans ton quartier ?",
        ar: "تفضل غني ومكروه، ولا فقير وحر في حيك؟",
      },
    ],
  },
  {
    id: "friends-vs-family",
    title: {
      en: "Is friendship more important than family?",
      fr: "L’amitié est-elle plus importante que la famille ?",
      ar: "الصداقة أهم من العائلة؟",
    },
    questions: [
      {
        en: "When you have 5,000 FCFA, do you send it home or share it with friends?",
        fr: "Avec 5 000 FCFA, tu envoies à la maison ou tu partages avec tes amis ?",
        ar: "لو عندك 5000 فرنك، تصيفط للدار ولا تقاسم أصحابك؟",
      },
      {
        en: "Can a friend tell you the truth that your uncle will hide?",
        fr: "Un ami peut te dire la vérité que ton oncle va cacher ?",
        ar: "صاحب يقدر يقولك الحقيقة اللي عمك يخبيها؟",
      },
      {
        en: "If your family blocks your marriage or your studies, do friends still come first?",
        fr: "Si ta famille bloque ton mariage ou tes études, les amis passent encore avant ?",
        ar: "لو أهلك يوقفوا زواجك أو دراستك، الأصحاب يبقوا الأول؟",
      },
    ],
  },
  {
    id: "social-media-chad",
    title: {
      en: "Social media: power or poison for Chadian youth?",
      fr: "Les réseaux : pouvoir ou poison pour la jeunesse tchadienne ?",
      ar: "السوشيال ميديا قوة ولا سم لشباب تشاد؟",
    },
    questions: [
      {
        en: "Does TikTok teach you English, or only eat your Airtel data?",
        fr: "TikTok t’apprend l’anglais, ou il mange juste ton forfait Airtel ?",
        ar: "تيك توك يعلّمك إنجليزية، ولا بس ياكل باقة أيرتل؟",
      },
      {
        en: "Has a WhatsApp rumor ever destroyed someone in your quartier?",
        fr: "Une rumeur WhatsApp a déjà détruit quelqu’un dans ton quartier ?",
        ar: "إشاعة واتساب خرّبت حد في حيك؟",
      },
      {
        en: "Would you delete Instagram for one month to save your mind and your money?",
        fr: "Tu supprimes Instagram un mois pour sauver ta tête et tes sous ?",
        ar: "تمسح إنستغرام شهر كامل عشان راسك وفلوسك؟",
      },
    ],
  },
  {
    id: "overthinking-youth",
    title: {
      en: "How does overthinking destroy a person?",
      fr: "Comment trop penser détruit une personne ?",
      ar: "التفكير الزايد يخرّب الإنسان كيف؟",
    },
    questions: [
      {
        en: "Do you lose sleep over the visa, the exam, or what people say in the street?",
        fr: "Tu perds le sommeil pour le visa, l’examen, ou ce que les gens disent dans la rue ?",
        ar: "تسهر عشان الفيزا، الامتحان، ولا كلام الناس في الشارع؟",
      },
      {
        en: "When your mind won’t stop, who do you talk to — God, a friend, or nobody?",
        fr: "Quand ta tête ne s’arrête pas, tu parles à qui : Dieu, un ami, ou personne ?",
        ar: "لما راسك ما يوقف، تحكي لمنو: الله، صاحب، ولا ما حد؟",
      },
      {
        en: "What is one small action you can take today instead of thinking all night?",
        fr: "C’est quoi une petite action aujourd’hui, au lieu de penser toute la nuit ?",
        ar: "شنو حركة صغيرة تسويها اليوم بدل التفكير طول الليل؟",
      },
    ],
  },
];

export function topicByOffset(offset: number) {
  const index = ((offset % DEBATE_TOPICS.length) + DEBATE_TOPICS.length) % DEBATE_TOPICS.length;
  return DEBATE_TOPICS[index];
}
