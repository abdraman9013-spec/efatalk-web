import type { Locale } from "@/i18n/translations";
import { ACADEMY_TZ } from "@/lib/schedule";

export type PhraseSlots = {
  name?: string;
  age?: string;
  color?: string;
  city?: string;
  country?: string;
  status?: string;
};

export type CurriculumPhrase = {
  id: string;
  foundation?: boolean;
  en: string;
  fr: string;
  ar: string;
  needs?: Array<keyof PhraseSlots>;
};

export type DailyPack = {
  id: string;
  title: Record<Locale, string>;
  phrases: CurriculumPhrase[];
};

export const COLORS = [
  { id: "red", hex: "#ef4444" },
  { id: "blue", hex: "#3b82f6" },
  { id: "green", hex: "#22c55e" },
  { id: "yellow", hex: "#eab308" },
  { id: "black", hex: "#111827" },
  { id: "white", hex: "#f8fafc" },
  { id: "orange", hex: "#f97316" },
  { id: "pink", hex: "#ec4899" },
] as const;

export const AGES = [14, 16, 18, 20, 22, 25, 28, 32, 36, 40, 45, 50];

const STATUS_EN: Record<string, string> = {
  student: "a student",
  worker: "a worker",
  entrepreneur: "an entrepreneur",
  other: "here to grow",
};

function p(id: string, en: string, fr: string, ar: string): CurriculumPhrase {
  return { id, en, fr, ar };
}

function pack(id: string, title: Record<Locale, string>, phrases: CurriculumPhrase[]): DailyPack {
  return { id, title, phrases };
}

/** 5 ultra-short everyday phrases per day. Never recycle the old long intros. */
export const DAILY_PHRASE_PACKS: DailyPack[] = [
  pack("class-1", { en: "In class", fr: "En classe", ar: "في الصف" }, [
    p("c1-question", "I have a question.", "J'ai une question.", "لدي سؤال."),
    p("c1-understand", "I don't understand.", "Je ne comprends pas.", "لا أفهم."),
    p("c1-repeat", "Can you repeat?", "Tu peux répéter ?", "هل يمكنك الإعادة؟"),
    p("c1-help", "I need help.", "J'ai besoin d'aide.", "أحتاج مساعدة."),
    p("c1-slowly", "Please speak slowly.", "Parle lentement s'il te plaît.", "تكلم ببطء من فضلك."),
  ]),
  pack("class-2", { en: "In class", fr: "En classe", ar: "في الصف" }, [
    p("c2-say", "How do you say this?", "Comment on dit ça ?", "كيف نقول هذا؟"),
    p("c2-mean", "What does it mean?", "Qu'est-ce que ça veut dire ?", "ماذا يعني؟"),
    p("c2-help-me", "Can you help me?", "Tu peux m'aider ?", "هل يمكنك مساعدتي؟"),
    p("c2-ready", "I am ready.", "Je suis prêt.", "أنا جاهز."),
    p("c2-thanks", "Thank you, teacher.", "Merci, professeur.", "شكراً يا أستاذ."),
  ]),
  pack("study-wh", { en: "At school", fr: "À l'école", ar: "في المدرسة" }, [
    p("s-what-study", "What do you study?", "Tu étudies quoi ?", "ماذا تدرس؟"),
    p("s-where-study", "Where do you study?", "Tu étudies où ?", "أين تدرس؟"),
    p("s-who-teacher", "Who is your teacher?", "Qui est ton professeur ?", "من هو أستاذك؟"),
    p("s-i-study", "I study English.", "J'étudie l'anglais.", "أدرس الإنجليزية."),
    p("s-student", "I am a student.", "Je suis étudiant.", "أنا طالب."),
  ]),
  pack("wh-life", { en: "Ask someone", fr: "Demander", ar: "اسأل" }, [
    p("w-name", "What is your name?", "Comment tu t'appelles ?", "ما اسمك؟"),
    p("w-live", "Where do you live?", "Tu habites où ?", "أين تسكن؟"),
    p("w-how-today", "How are you today?", "Comment vas-tu aujourd'hui ?", "كيف حالك اليوم؟"),
    p("w-why-english", "Why do you study English?", "Pourquoi tu étudies l'anglais ?", "لماذا تدرس الإنجليزية؟"),
    p("w-when-wake", "When do you wake up?", "Tu te réveilles à quelle heure ?", "متى تستيقظ؟"),
  ]),
  pack("hello", { en: "Hello", fr: "Bonjour", ar: "مرحبا" }, [
    p("h-hello", "Hello.", "Bonjour.", "مرحبا."),
    p("h-morning", "Good morning.", "Bonjour.", "صباح الخير."),
    p("h-evening", "Good evening.", "Bonsoir.", "مساء الخير."),
    p("h-how", "How are you?", "Comment vas-tu ?", "كيف حالك؟"),
    p("h-fine", "I am fine.", "Je vais bien.", "أنا بخير."),
  ]),
  pack("meet", { en: "Meet people", fr: "Se rencontrer", ar: "التعارف" }, [
    p("m-nice", "Nice to meet you.", "Enchanté.", "تشرفت بمعرفتك."),
    p("m-welcome", "Welcome.", "Bienvenue.", "أهلاً وسهلاً."),
    p("m-goodbye", "Goodbye.", "Au revoir.", "مع السلامة."),
    p("m-see-you", "See you tomorrow.", "À demain.", "أراك غداً."),
    p("m-good-day", "Have a good day.", "Bonne journée.", "يوم سعيد."),
  ]),
  pack("ask", { en: "Ask politely", fr: "Demander poliment", ar: "اطلب بأدب" }, [
    p("a-come-in", "Can I come in?", "Je peux entrer ?", "هل يمكنني الدخول؟"),
    p("a-sit", "May I sit here?", "Je peux m'asseoir ici ?", "هل يمكنني الجلوس هنا؟"),
    p("a-correct", "Is this correct?", "C'est correct ?", "هل هذا صحيح؟"),
    p("a-try", "Can I try?", "Je peux essayer ?", "هل يمكنني أن أجرب؟"),
    p("a-page", "What page?", "Quelle page ?", "أي صفحة؟"),
  ]),
  pack("time", { en: "Time", fr: "L'heure", ar: "الوقت" }, [
    p("t-what-time", "What time is it?", "Quelle heure est-il ?", "كم الساعة؟"),
    p("t-two", "It is two o'clock.", "Il est deux heures.", "الساعة الثانية."),
    p("t-late", "I am late.", "Je suis en retard.", "أنا متأخر."),
    p("t-wait", "Wait a minute.", "Attends une minute.", "انتظر دقيقة."),
    p("t-later", "See you later.", "À plus tard.", "أراك لاحقاً."),
  ]),
  pack("yes-no", { en: "Yes and no", fr: "Oui et non", ar: "نعم ولا" }, [
    p("y-yes", "Yes, I do.", "Oui.", "نعم."),
    p("y-no", "No, I don't.", "Non.", "لا."),
    p("y-please", "Yes, please.", "Oui, s'il te plaît.", "نعم من فضلك."),
    p("y-thanks", "No, thank you.", "Non, merci.", "لا شكراً."),
    p("y-ok", "Okay.", "D'accord.", "حسناً."),
  ]),
  pack("family", { en: "Family", fr: "Famille", ar: "العائلة" }, [
    p("f-mother", "This is my mother.", "C'est ma mère.", "هذه أمي."),
    p("f-father", "This is my father.", "C'est mon père.", "هذا أبي."),
    p("f-brother", "I have a brother.", "J'ai un frère.", "لدي أخ."),
    p("f-sister", "I have a sister.", "J'ai une sœur.", "لدي أخت."),
    p("f-family", "I love my family.", "J'aime ma famille.", "أحب عائلتي."),
  ]),
  pack("home", { en: "At home", fr: "À la maison", ar: "في البيت" }, [
    p("ho-home", "I am at home.", "Je suis à la maison.", "أنا في البيت."),
    p("ho-live", "I live here.", "J'habite ici.", "أسكن هنا."),
    p("ho-room", "This is my room.", "C'est ma chambre.", "هذه غرفتي."),
    p("ho-door", "Please close the door.", "Ferme la porte s'il te plaît.", "أغلق الباب من فضلك."),
    p("ho-sit", "Please sit down.", "Assieds-toi s'il te plaît.", "اجلس من فضلك."),
  ]),
  pack("routine", { en: "My day", fr: "Ma journée", ar: "يومي" }, [
    p("r-wake", "I wake up early.", "Je me réveille tôt.", "أستيقظ باكراً."),
    p("r-eat", "I eat breakfast.", "Je prends le petit-déjeuner.", "أتناول الفطور."),
    p("r-go", "I go to school.", "Je vais à l'école.", "أذهب إلى المدرسة."),
    p("r-work", "I work every day.", "Je travaille tous les jours.", "أعمل كل يوم."),
    p("r-sleep", "I go to bed.", "Je vais me coucher.", "أذهب للنوم."),
  ]),
  pack("food", { en: "Food", fr: "Nourriture", ar: "الطعام" }, [
    p("fo-hungry", "I am hungry.", "J'ai faim.", "أنا جائع."),
    p("fo-thirsty", "I am thirsty.", "J'ai soif.", "أنا عطشان."),
    p("fo-water", "I want water.", "Je veux de l'eau.", "أريد ماء."),
    p("fo-like", "I like rice.", "J'aime le riz.", "أحب الأرز."),
    p("fo-delicious", "It is delicious.", "C'est délicieux.", "إنه لذيذ."),
  ]),
  pack("cafe", { en: "At the cafe", fr: "Au café", ar: "في المقهى" }, [
    p("ca-menu", "The menu, please.", "Le menu, s'il vous plaît.", "القائمة من فضلك."),
    p("ca-coffee", "I want coffee.", "Je veux un café.", "أريد قهوة."),
    p("ca-tea", "I want tea.", "Je veux du thé.", "أريد شاياً."),
    p("ca-bill", "The bill, please.", "L'addition, s'il vous plaît.", "الحساب من فضلك."),
    p("ca-thanks", "Thank you very much.", "Merci beaucoup.", "شكراً جزيلاً."),
  ]),
  pack("places", { en: "Places", fr: "Lieux", ar: "الأماكن" }, [
    p("pl-where", "Where is the school?", "Où est l'école ?", "أين المدرسة؟"),
    p("pl-market", "Where is the market?", "Où est le marché ?", "أين السوق؟"),
    p("pl-here", "It is here.", "C'est ici.", "إنه هنا."),
    p("pl-there", "It is there.", "C'est là-bas.", "إنه هناك."),
    p("pl-near", "It is near.", "C'est près.", "إنه قريب."),
  ]),
  pack("go", { en: "Go somewhere", fr: "Y aller", ar: "الذهاب" }, [
    p("g-left", "Turn left.", "Tourne à gauche.", "انعطف يساراً."),
    p("g-right", "Turn right.", "Tourne à droite.", "انعطف يميناً."),
    p("g-straight", "Go straight.", "Va tout droit.", "امشِ مباشرة."),
    p("g-stop", "Stop here.", "Arrête-toi ici.", "قف هنا."),
    p("g-lost", "I am lost.", "Je suis perdu.", "أنا ضائع."),
  ]),
  pack("move", { en: "Getting around", fr: "Se déplacer", ar: "التنقل" }, [
    p("mv-bus", "I take the bus.", "Je prends le bus.", "آخذ الحافلة."),
    p("mv-walk", "I walk to school.", "Je vais à l'école à pied.", "أمشي إلى المدرسة."),
    p("mv-taxi", "I need a taxi.", "J'ai besoin d'un taxi.", "أحتاج سيارة أجرة."),
    p("mv-wait-bus", "Wait for me.", "Attends-moi.", "انتظرني."),
    p("mv-hurry", "Hurry up.", "Dépêche-toi.", "أسرع."),
  ]),
  pack("shop", { en: "Shopping", fr: "Shopping", ar: "التسوق" }, [
    p("sh-how-much", "How much is this?", "C'est combien ?", "بكم هذا؟"),
    p("sh-expensive", "It is expensive.", "C'est cher.", "إنه غالي."),
    p("sh-cheap", "It is cheap.", "C'est bon marché.", "إنه رخيص."),
    p("sh-buy", "I want to buy this.", "Je veux acheter ça.", "أريد شراء هذا."),
    p("sh-cash", "Do you take cash?", "Vous prenez du cash ?", "هل تقبلون نقداً؟"),
  ]),
  pack("clothes", { en: "Clothes", fr: "Vêtements", ar: "الملابس" }, [
    p("cl-size", "What size is this?", "C'est quelle taille ?", "ما هو المقاس؟"),
    p("cl-like", "I like this shirt.", "J'aime cette chemise.", "أحب هذا القميص."),
    p("cl-wear", "I wear a jacket.", "Je porte une veste.", "أرتدي سترة."),
    p("cl-new", "This is new.", "C'est neuf.", "هذا جديد."),
    p("cl-look", "It looks good.", "Ça va bien.", "يبدو جيداً."),
  ]),
  pack("feel", { en: "Feelings", fr: "Sentiments", ar: "المشاعر" }, [
    p("fe-happy", "I am happy.", "Je suis heureux.", "أنا سعيد."),
    p("fe-tired", "I am tired.", "Je suis fatigué.", "أنا متعب."),
    p("fe-sad", "I am sad.", "Je suis triste.", "أنا حزين."),
    p("fe-busy", "I am busy.", "Je suis occupé.", "أنا مشغول."),
    p("fe-ok", "I am okay.", "Je vais bien.", "أنا بخير."),
  ]),
  pack("health", { en: "Health", fr: "Santé", ar: "الصحة" }, [
    p("he-sick", "I am sick.", "Je suis malade.", "أنا مريض."),
    p("he-hurt", "My head hurts.", "J'ai mal à la tête.", "رأسي يؤلمني."),
    p("he-doctor", "I need a doctor.", "J'ai besoin d'un médecin.", "أحتاج طبيباً."),
    p("he-rest", "I need rest.", "J'ai besoin de repos.", "أحتاج راحة."),
    p("he-better", "I feel better.", "Je me sens mieux.", "أشعر بتحسن."),
  ]),
  pack("weather", { en: "Weather", fr: "Météo", ar: "الطقس" }, [
    p("we-hot", "It is hot today.", "Il fait chaud aujourd'hui.", "الجو حار اليوم."),
    p("we-cold", "It is cold today.", "Il fait froid aujourd'hui.", "الجو بارد اليوم."),
    p("we-rain", "It is raining.", "Il pleut.", "إنها تمطر."),
    p("we-sun", "The sun is out.", "Le soleil brille.", "الشمس مشرقة."),
    p("we-nice", "The weather is nice.", "Il fait beau.", "الجو جميل."),
  ]),
  pack("phone", { en: "On the phone", fr: "Au téléphone", ar: "على الهاتف" }, [
    p("ph-hello", "Hello, it's me.", "Allô, c'est moi.", "آلو، أنا."),
    p("ph-call", "Can I call you?", "Je peux t'appeler ?", "هل يمكنني الاتصال بك؟"),
    p("ph-busy", "I am on the phone.", "Je suis au téléphone.", "أنا على الهاتف."),
    p("ph-message", "Send me a message.", "Envoie-moi un message.", "أرسل لي رسالة."),
    p("ph-later-call", "Call me later.", "Rappelle-moi plus tard.", "اتصل بي لاحقاً."),
  ]),
  pack("online", { en: "Online", fr: "En ligne", ar: "على الإنترنت" }, [
    p("on-wifi", "Is there wifi?", "Il y a le wifi ?", "هل يوجد واي فاي؟"),
    p("on-password", "What is the password?", "C'est quoi le mot de passe ?", "ما هي كلمة السر؟"),
    p("on-send", "I will send it.", "Je vais l'envoyer.", "سأرسله."),
    p("on-open", "Open the link.", "Ouvre le lien.", "افتح الرابط."),
    p("on-wait", "Please wait.", "Attends s'il te plaît.", "انتظر من فضلك."),
  ]),
  pack("work", { en: "At work", fr: "Au travail", ar: "في العمل" }, [
    p("wk-work", "I work here.", "Je travaille ici.", "أعمل هنا."),
    p("wk-job", "What is your job?", "Tu fais quel métier ?", "ما هي مهنتك؟"),
    p("wk-meeting", "I have a meeting.", "J'ai une réunion.", "لدي اجتماع."),
    p("wk-break", "I need a break.", "J'ai besoin d'une pause.", "أحتاج استراحة."),
    p("wk-done", "I am done.", "J'ai fini.", "لقد انتهيت."),
  ]),
  pack("school", { en: "School talk", fr: "À l'école", ar: "كلام المدرسة" }, [
    p("sc-class", "I have class now.", "J'ai cours maintenant.", "لدي حصة الآن."),
    p("sc-homework", "I have homework.", "J'ai des devoirs.", "لدي واجب."),
    p("sc-test", "We have a test.", "On a un test.", "لدينا اختبار."),
    p("sc-book", "Open your book.", "Ouvre ton livre.", "افتح كتابك."),
    p("sc-listen", "Please listen.", "Écoute s'il te plaît.", "استمع من فضلك."),
  ]),
  pack("friends", { en: "Friends", fr: "Amis", ar: "الأصدقاء" }, [
    p("fr-friend", "This is my friend.", "C'est mon ami.", "هذا صديقي."),
    p("fr-come", "Come with me.", "Viens avec moi.", "تعال معي."),
    p("fr-play", "Let's play.", "On joue ?", "هيا نلعب."),
    p("fr-fun", "This is fun.", "C'est amusant.", "هذا ممتع."),
    p("fr-miss", "I miss you.", "Tu me manques.", "أفتقدك."),
  ]),
  pack("help", { en: "Need help", fr: "Besoin d'aide", ar: "مساعدة" }, [
    p("hp-sorry", "I am sorry.", "Je suis désolé.", "أنا آسف."),
    p("hp-excuse", "Excuse me.", "Excuse-moi.", "اعذرني."),
    p("hp-problem", "I have a problem.", "J'ai un problème.", "لدي مشكلة."),
    p("hp-know", "I don't know.", "Je ne sais pas.", "لا أعرف."),
    p("hp-sure", "Are you sure?", "Tu es sûr ?", "هل أنت متأكد؟"),
  ]),
  pack("polite", { en: "Be polite", fr: "Politesse", ar: "الأدب" }, [
    p("po-please", "Please.", "S'il te plaît.", "من فضلك."),
    p("po-thanks", "Thank you.", "Merci.", "شكراً."),
    p("po-welcome", "You are welcome.", "De rien.", "على الرحب."),
    p("po-sorry-late", "Sorry I am late.", "Désolé je suis en retard.", "آسف لقد تأخرت."),
    p("po-after-you", "After you.", "Après vous.", "تفضل."),
  ]),
  pack("weekend", { en: "Weekend", fr: "Week-end", ar: "عطلة الأسبوع" }, [
    p("we-plans", "What are your plans?", "Tu as des projets ?", "ما هي خططك؟"),
    p("we-free", "Are you free?", "Tu es libre ?", "هل أنت متفرغ؟"),
    p("we-tonight", "See you tonight.", "À ce soir.", "أراك الليلة."),
    p("we-rest", "I want to rest.", "Je veux me reposer.", "أريد أن أرتاح."),
    p("we-football", "I like football.", "J'aime le football.", "أحب كرة القدم."),
  ]),
  pack("travel", { en: "Travel", fr: "Voyage", ar: "السفر" }, [
    p("tr-go", "I want to travel.", "Je veux voyager.", "أريد أن أسافر."),
    p("tr-ticket", "I need a ticket.", "J'ai besoin d'un billet.", "أحتاج تذكرة."),
    p("tr-where-from", "Where are you from?", "Tu viens d'où ?", "من أين أنت؟"),
    p("tr-from", "I am from Chad.", "Je viens du Tchad.", "أنا من تشاد."),
    p("tr-passport", "Here is my passport.", "Voici mon passeport.", "هذا جواز سفري."),
  ]),
  pack("house", { en: "In the house", fr: "Dans la maison", ar: "في المنزل" }, [
    p("hs-kitchen", "I am in the kitchen.", "Je suis dans la cuisine.", "أنا في المطبخ."),
    p("hs-open", "Open the window.", "Ouvre la fenêtre.", "افتح النافذة."),
    p("hs-light", "Turn on the light.", "Allume la lumière.", "أشعل الضوء."),
    p("hs-clean", "It is clean.", "C'est propre.", "إنه نظيف."),
    p("hs-help-cook", "Can you cook?", "Tu sais cuisiner ?", "هل تعرف الطبخ؟"),
  ]),
  pack("sport", { en: "Sport", fr: "Sport", ar: "رياضة" }, [
    p("sp-play", "I play football.", "Je joue au football.", "ألعب كرة القدم."),
    p("sp-run", "I like to run.", "J'aime courir.", "أحب الجري."),
    p("sp-win", "We can win.", "On peut gagner.", "يمكننا الفوز."),
    p("sp-team", "This is my team.", "C'est mon équipe.", "هذا فريقي."),
    p("sp-good-job", "Good job.", "Bien joué.", "أحسنت."),
  ]),
  pack("plans", { en: "Plans", fr: "Projets", ar: "خطط" }, [
    p("pn-want", "I want to learn.", "Je veux apprendre.", "أريد أن أتعلم."),
    p("pn-can", "I can do it.", "Je peux le faire.", "أستطيع فعل ذلك."),
    p("pn-tomorrow", "See you tomorrow.", "À demain.", "أراك غداً."),
    p("pn-start", "Let's start.", "Commençons.", "لنبدأ."),
    p("pn-together", "Let's practice together.", "Entraînons-nous ensemble.", "لنتدرب معاً."),
  ]),
  pack("need", { en: "I need this", fr: "J'ai besoin", ar: "أحتاج هذا" }, [
    p("nd-pen", "I need a pen.", "J'ai besoin d'un stylo.", "أحتاج قلماً."),
    p("nd-paper", "I need paper.", "J'ai besoin de papier.", "أحتاج ورقاً."),
    p("nd-phone", "Where is my phone?", "Où est mon téléphone ?", "أين هاتفي؟"),
    p("nd-key", "I lost my key.", "J'ai perdu ma clé.", "فقدت مفتاحي."),
    p("nd-bag", "This is my bag.", "C'est mon sac.", "هذه حقيبتي."),
  ]),
  pack("talk", { en: "Keep talking", fr: "Continuer", ar: "واصل الكلام" }, [
    p("tk-again", "Say it again.", "Dis-le encore.", "قلها مرة أخرى."),
    p("tk-louder", "Speak louder.", "Parle plus fort.", "تكلم بصوت أعلى."),
    p("tk-clear", "I get it.", "Je comprends.", "فهمت."),
    p("tk-example", "Give me an example.", "Donne-moi un exemple.", "أعطني مثالاً."),
    p("tk-english", "Let's speak English.", "Parlons anglais.", "لنتكلم الإنجليزية."),
  ]),
  pack("airtel", { en: "Airtel Money", fr: "Airtel Money", ar: "أيرتل موني" }, [
    p("am-send", "I send money.", "J'envoie de l'argent.", "أرسل فلوس."),
    p("am-airtime", "I need airtime.", "J'ai besoin de crédit.", "أحتاج رصيد."),
    p("am-network", "The network is down.", "Le réseau est coupé.", "الشبكة مقطوعة."),
    p("am-pay", "I pay with Airtel Money.", "Je paie avec Airtel Money.", "أدفع بأيرتل موني."),
    p("am-code", "What is the code?", "C'est quoi le code ?", "شنو الكود؟"),
  ]),
  pack("market", { en: "At the market", fr: "Au marché", ar: "في السوق" }, [
    p("mk-price", "How much is this?", "C'est combien ?", "بكم هذا؟"),
    p("mk-reduce", "Please reduce the price.", "Baisse un peu, s'il te plaît.", "نقص السعر من فضلك."),
    p("mk-ok", "Okay, I take it.", "D'accord, je prends.", "تمام، آخذه."),
    p("mk-fresh", "Is it fresh?", "C'est frais ?", "طازج؟"),
    p("mk-later", "I come back later.", "Je reviens plus tard.", "أرجع بعدين."),
  ]),
  pack("clando", { en: "On the road", fr: "Sur la route", ar: "في الطريق" }, [
    p("rd-taxi", "I need a taxi.", "J'ai besoin d'un taxi.", "أحتاج تاكسي."),
    p("rd-stop", "Stop here, please.", "Arrête ici, s'il te plaît.", "قف هنا من فضلك."),
    p("rd-far", "Is it far?", "C'est loin ?", "بعيد؟"),
    p("rd-wait", "Please wait for me.", "Attends-moi s'il te plaît.", "استناني من فضلك."),
    p("rd-traffic", "There is too much traffic.", "Il y a trop de circulation.", "الزحمة كثيرة."),
  ]),
  pack("heat-power", { en: "Heat and light", fr: "Chaleur et lumière", ar: "الحر والضوء" }, [
    p("ht-hot", "It is too hot.", "Il fait trop chaud.", "الجو حر جداً."),
    p("ht-fan", "I need a fan.", "J'ai besoin d'un ventilateur.", "أحتاج مروحة."),
    p("ht-light", "There is no light.", "Il n'y a pas de courant.", "ما في كهربا."),
    p("ht-charge", "My phone is dead.", "Mon téléphone est mort.", "تليفوني طافي."),
    p("ht-water", "I need cold water.", "J'ai besoin d'eau froide.", "أحتاج مي بارد."),
  ]),
  pack("whatsapp", { en: "WhatsApp", fr: "WhatsApp", ar: "واتساب" }, [
    p("wa-msg", "Send me a message.", "Envoie-moi un message.", "أرسل لي رسالة."),
    p("wa-voice", "Send a voice note.", "Envoie un vocal.", "أرسل مسجلة."),
    p("wa-data", "I have no data.", "Je n'ai plus de data.", "ما عندي نت."),
    p("wa-call", "Call me on WhatsApp.", "Appelle-moi sur WhatsApp.", "كلمني على واتساب."),
    p("wa-seen", "I saw your message.", "J'ai vu ton message.", "شفت رسالتك."),
  ]),
  pack("tea-street", { en: "Tea in the street", fr: "Thé dans la rue", ar: "شاي الشارع" }, [
    p("ts-tea", "I want tea, please.", "Je veux du thé, s'il te plaît.", "أريد شاي من فضلك."),
    p("ts-sugar", "Not too much sugar.", "Pas trop de sucre.", "سكر شوية بس."),
    p("ts-sit", "Can I sit here?", "Je peux m'asseoir ici ?", "أقدر أقعد هنا؟"),
    p("ts-small", "A small one, please.", "Un petit, s'il te plaît.", "صغير من فضلك."),
    p("ts-thanks", "Thank you, sister.", "Merci, ma sœur.", "شكراً يا أختي."),
  ]),
  pack("money-home", { en: "Family money", fr: "Argent de la famille", ar: "فلوس الأهل" }, [
    p("mh-send", "I send money home.", "J'envoie de l'argent à la maison.", "أصيفط فلوس للدار."),
    p("mh-help", "I help my family.", "J'aide ma famille.", "أساعد أهلي."),
    p("mh-broke", "I have no money today.", "Je n'ai pas d'argent aujourd'hui.", "ما عندي فلوس اليوم."),
    p("mh-later-pay", "I pay you later.", "Je te paie plus tard.", "أدفع لك بعدين."),
    p("mh-save", "I want to save money.", "Je veux économiser.", "أريد أوفر فلوس."),
  ]),
  pack("neighbors", { en: "With people", fr: "Avec les gens", ar: "مع الناس" }, [
    p("nb-peace", "Peace be with you.", "La paix sur toi.", "السلام عليكم."),
    p("nb-elder", "How is your family?", "Comment va ta famille ?", "كيف الأهل؟"),
    p("nb-come", "Come and eat.", "Viens manger.", "تعال كل."),
    p("nb-sorry", "Sorry for the noise.", "Désolé pour le bruit.", "آسف على الضجيج."),
    p("nb-help-him", "Can you help him?", "Tu peux l'aider ?", "تقدر تساعده؟"),
  ]),
  pack("school-gate", { en: "At school", fr: "À l'école", ar: "عند المدرسة" }, [
    p("sg-late", "The teacher is late.", "Le prof est en retard.", "الأستاذ متأخر."),
    p("sg-class", "Where is the class?", "C'est où la classe ?", "وين الصف؟"),
    p("sg-copy", "Can I copy this?", "Je peux copier ça ?", "أقدر أنسخ هذا؟"),
    p("sg-break", "We have a break.", "On a une pause.", "عندنا استراحة."),
    p("sg-home", "I go home now.", "Je rentre maintenant.", "أروح البيت الحين."),
  ]),
  pack("rain-bundle", { en: "Rain and data", fr: "Pluie et data", ar: "مطر ونت" }, [
    p("rb-rain", "It is raining hard.", "Il pleut fort.", "تمطر بقوة."),
    p("rb-mud", "The road is bad.", "La route est mauvaise.", "الطريق سيئة."),
    p("rb-wifi", "Is the wifi working?", "Le wifi marche ?", "الواي فاي شغال؟"),
    p("rb-buy", "I buy a data bundle.", "J'achète un forfait.", "أشتري باقة نت."),
    p("rb-low", "My battery is low.", "Ma batterie est faible.", "البطارية ضعيفة."),
  ]),
];

export const BEGINNER_CURRICULUM: CurriculumPhrase[] = DAILY_PHRASE_PACKS.flatMap((item) => item.phrases);

const PHRASE_BY_ID = new Map(BEGINNER_CURRICULUM.map((item) => [item.id, item]));

export function fillPhrase(template: string, slots: PhraseSlots) {
  return template
    .replaceAll("{name}", slots.name || "")
    .replaceAll("{age}", slots.age || "")
    .replaceAll("{color}", slots.color || "")
    .replaceAll("{city}", slots.city || "")
    .replaceAll("{country}", slots.country || "")
    .replaceAll("{status}", slots.status || "");
}

export function statusPhrase(status: string) {
  return STATUS_EN[status] || STATUS_EN.other;
}

export function phraseById(id: string) {
  return PHRASE_BY_ID.get(id);
}

export function academyDayKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ACADEMY_TZ }).format(date);
}

function dayHash(seed: string) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  }
  return Math.abs(hash);
}

const EMPTY_TITLE: Record<Locale, string> = {
  en: "You finished the dictionary",
  fr: "Tu as fini le dictionnaire",
  ar: "خلّصت القاموس",
};

/** 5 unlearned phrases. Never replay a learned id. Pack rotates every academy day. */
export function buildDailySession(learned: string[], date = new Date()) {
  const known = new Set(learned.filter(Boolean));
  const leftover = DAILY_PHRASE_PACKS.map((item) => ({
    ...item,
    phrases: item.phrases.filter((phrase) => !known.has(phrase.id)),
  })).filter((item) => item.phrases.length);

  if (!leftover.length) {
    return { cards: [] as CurriculumPhrase[], reviewIds: [] as string[], title: EMPTY_TITLE };
  }

  const pick = leftover[dayHash(academyDayKey(date)) % leftover.length];
  const cards = [...pick.phrases];
  if (cards.length < 5) {
    for (const item of leftover) {
      if (item.id === pick.id) continue;
      for (const phrase of item.phrases) {
        if (cards.some((row) => row.id === phrase.id)) continue;
        cards.push(phrase);
        if (cards.length >= 5) break;
      }
      if (cards.length >= 5) break;
    }
  }

  return {
    cards: cards.slice(0, 5),
    reviewIds: [] as string[],
    title: pick.title,
  };
}
