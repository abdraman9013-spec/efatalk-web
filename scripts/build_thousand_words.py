# -*- coding: utf-8 -*-
"""Build 1000 new EFA Talk words for Play cards + Clash."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OLD = {
    "angry", "answer", "apple", "baby", "bag", "banana", "bed", "bike", "bird", "book",
    "brave", "bread", "brother", "bus", "car", "cat", "chair", "chicken", "child", "choice",
    "church", "city", "clock", "clothes", "coffee", "confidence", "country", "courage", "cow",
    "cup", "dog", "door", "dream", "earth", "egg", "english", "evening", "eye", "family",
    "father", "fire", "fish", "flower", "food", "freedom", "friend", "fruit", "future", "game",
    "goal", "goat", "goodbye", "hand", "happy", "hat", "health", "heart", "hello", "honest",
    "hope", "horse", "hospital", "house", "hungry", "idea", "job", "key", "kind", "kitchen",
    "language", "leader", "lesson", "love", "man", "map", "market", "marketplace", "meat",
    "milk", "money", "moon", "morning", "mosque", "mother", "music", "neighbor", "night",
    "oil", "onion", "opinion", "orange", "paper", "patience", "peace", "pen", "phone", "plan",
    "plane", "plate", "please", "power", "practice", "problem", "question", "rain", "ready",
    "reason", "respect", "rice", "river", "road", "room", "salt", "school", "shoe", "shop",
    "simple", "sister", "smile", "soap", "soup", "star", "story", "street", "strong", "student",
    "success", "sugar", "sun", "table", "tea", "teacher", "team", "thanks", "thirsty", "time",
    "tired", "today", "tomato", "tomorrow", "travel", "tree", "truth", "voice", "water",
    "watermelon", "weather", "wind", "window", "woman", "work", "yes",
}

# en|fr|ar|category|emoji
RAW = r"""
Mango|mangue|مانجو|food|🥭
Peanut|cacahuète|فول سوداني|food|🥜
Maize|maïs|ذرة|food|🌽
Cassava|manioc|كسافا|food|🥔
Honey|miel|عسل|food|🍯
Yogurt|yaourt|زبادي|food|🥛
Butter|beurre|زبدة|food|🧈
Cheese|fromage|جبن|food|🧀
Wheat|blé|قمح|food|🌾
Flour|farine|دقيق|food|🌾
Vinegar|vinaigre|خل|food|🧴
Garlic|ail|ثوم|food|🧄
Pepper|poivre|فلفل|food|🌶️
Lemon|citron|ليمون|food|🍋
Lime|citron vert|ليمون أخضر|food|🍋
Coconut|noix de coco|جوز هند|food|🥥
Pineapple|ananas|أناناس|food|🍍
Papaya|papaye|بابايا|food|🧡
Avocado|avocat|أفوكادو|food|🥑
Spinach|épinard|سبانخ|food|🥬
Cabbage|chou|ملفوف|food|🥬
Carrot|carotte|جزر|food|🥕
Pumpkin|citrouille|قرع|food|🎃
Beans|haricots|فاصوليا|food|🫘
Lentils|lentilles|عدس|food|🫘
Biscuit|biscuit|بسكويت|food|🍪
Cake|gâteau|كعكة|food|🍰
Chocolate|chocolat|شوكولاتة|food|🍫
Juice|jus|عصير|food|🧃
Breakfast|petit-déjeuner|فطور|food|🍳
Lunch|déjeuner|غداء|food|🍽️
Dinner|dîner|عشاء|food|🍽️
Snack|goûter|وجبة خفيفة|food|🥨
Fridge|réfrigérateur|ثلاجة|food|🧊
Oven|four|فرن|food|🔥
Stove|cuisinière|موقد|food|🔥
Bowl|bol|وعاء|food|🥣
Spoon|cuillère|ملعقة|food|🥄
Fork|fourchette|شوكة|food|🍴
Knife|couteau|سكين|food|🔪
Napkin|serviette|منديل|food|🧻
Tray|plateau|صينية|food|🍽️
Bottle|bouteille|زجاجة|food|🍼
Glass|verre|كأس|food|🥛
Jug|cruche|إبريق|food|🏺
Kettle|bouilloire|غلاية|food|🫖
Stew|ragoût|يخنة|food|🍲
Porridge|bouillie|عصيدة|food|🥣
Millet|mil|دخن|food|🌾
Sorghum|sorgho|ذرة بيضاء|food|🌾
Grape|raisin|عنب|food|🍇
Peach|pêche|خوخ|food|🍑
Cherry|cerise|كرز|food|🍒
Strawberry|fraise|فراولة|food|🍓
Melon|melon|شمام|food|🍈
Cucumber|concombre|خيار|food|🥒
Lettuce|laitue|خس|food|🥬
Mushroom|champignon|فطر|food|🍄
Olive|olive|زيتون|food|🫒
Pasta|pâtes|معكرونة|food|🍝
Noodle|nouille|نودل|food|🍜
Pizza|pizza|بيتزا|food|🍕
Burger|hamburger|برغر|food|🍔
Sandwich|sandwich|شطيرة|food|🥪
Pancake|crêpe|فطيرة|food|🥞
Popcorn|pop-corn|فشار|food|🍿
Jam|confiture|مربى|food|🍓
Cream|crème|كريمة|food|🥛
Spice|épice|توابل|food|🧂
Herb|herbe|عشب|food|🌿
Mint|menthe|نعناع|food|🌿
Ginger|gingembre|زنجبيل|food|🫚
Cinnamon|cannelle|قرفة|food|🪵
Vanilla|vanille|فانيليا|food|🌼
Mustard|moutarde|خردل|food|🟡
Sauce|sauce|صلصة|food|🍅
Recipe|recette|وصفة|food|📜
Meal|repas|وجبة|food|🍽️
Feast|festin|وليمة|food|🥳
Appetite|appétit|شهية|food|😋
Delicious|délicieux|لذيذ|food|😋
Bitter|amer|مر|food|😖
Sweet|sucré|حلو|food|🍬
Sour|acide|حامض|food|🍋
Spicy|épicé|حار|food|🌶️
Fresh|frais|طازج|food|🥗
Ripe|mûr|ناضج|food|🥭
Dates|datte|تمر|food|🌴
Okra|gombo|بامية|food|🟢
Yam|igname|يام|food|🥔
Plantain|banane plantain|موز الجنة|food|🍌
Hibiscus|hibiscus|كركديه|food|🌺
Shea|karité|شيا|food|🧴
Head|tête|رأس|body|👤
Hair|cheveux|شعر|body|💇
Face|visage|وجه|body|🙂
Ear|oreille|أذن|body|👂
Nose|nez|أنف|body|👃
Mouth|bouche|فم|body|👄
Tooth|dent|سن|body|🦷
Tongue|langue|لسان|body|👅
Lip|lèvre|شفة|body|💋
Neck|cou|رقبة|body|🧣
Shoulder|épaule|كتف|body|🤷
Arm|bras|ذراع|body|💪
Elbow|coude|كوع|body|🦾
Wrist|poignet|معصم|body|⌚
Finger|doigt|إصبع|body|👆
Thumb|pouce|إبهام|body|👍
Chest|poitrine|صدر|body|👕
Back|dos|ظهر|body|🔙
Stomach|estomac|معدة|body|🤰
Waist|taille|خصر|body|🪢
Hip|hanche|ورك|body|🕺
Leg|jambe|ساق|body|🦵
Knee|genou|ركبة|body|🦵
Ankle|cheville|كاحل|body|🦶
Foot|pied|قدم|body|🦶
Toe|orteil|إصبع قدم|body|🦶
Skin|peau|جلد|body|🤚
Bone|os|عظم|body|🦴
Blood|sang|دم|body|🩸
Muscle|muscle|عضلة|body|💪
Brain|cerveau|دماغ|body|🧠
Lung|poumon|رئة|body|🫁
Throat|gorge|حلق|body|🗣️
Cheek|joue|خد|body|😊
Chin|menton|ذقن|body|🧔
Forehead|front|جبهة|body|🧑
Beard|barbe|لحية|body|🧔
Nail|ongle|ظفر|body|💅
Palm|paume|كف|body|🖐️
Heel|talon|كعب|body|👠
Breath|souffle|نفس|body|😮
Sweat|sueur|عرق|body|💦
Tear|larme|دمعة|body|😢
Cough|toux|سعال|body|😷
Sneeze|éternuement|عطس|body|🤧
Fever|fièvre|حمى|body|🤒
Pain|douleur|ألم|body|😣
Wound|blessure|جرح|body|🩹
Scar|cicatrice|ندبة|body|🩹
Medicine|médicament|دواء|body|💊
Pill|comprimé|حبة|body|💊
Bandage|bandage|ضمادة|body|🩹
Doctor|médecin|طبيب|work|🩺
Nurse|infirmière|ممرضة|work|👩‍⚕️
Clinic|clinique|عيادة|places|🏥
Notebook|cahier|دفتر|school|📓
Pencil|crayon|قلم رصاص|school|✏️
Eraser|gomme|ممحاة|school|🧽
Ruler|règle|مسطرة|school|📏
Blackboard|tableau|سبورة|school|⬛
Chalk|craie|طباشير|school|🤍
Desk|bureau|مكتب|school|🪑
Homework|devoirs|واجب|school|📝
Exam|examen|امتحان|school|📄
Quiz|quiz|اختبار قصير|school|❓
Grade|note|درجة|school|🅰️
Diploma|diplôme|شهادة|school|🎓
University|université|جامعة|school|🎓
College|collège|كلية|school|🏫
Classroom|salle de classe|فصل|school|🏫
Library|bibliothèque|مكتبة|school|📚
Dictionary|dictionnaire|قاموس|school|📖
Alphabet|alphabet|أبجدية|school|🔤
Sentence|phrase|جملة|school|✍️
Paragraph|paragraphe|فقرة|school|📄
Chapter|chapitre|فصل|school|📖
Page|page|صفحة|school|📃
Title|titre|عنوان|school|🏷️
Author|auteur|مؤلف|school|✍️
Poem|poème|قصيدة|school|📜
Novel|roman|رواية|school|📚
Essay|essai|مقال|school|📝
Grammar|grammaire|قواعد|school|📐
Spelling|orthographe|إملاء|school|🔤
Vocabulary|vocabulaire|مفردات|school|📘
Pronunciation|prononciation|نطق|school|🗣️
Listening|écoute|استماع|school|🎧
Speaking|expression orale|كلام|school|🗣️
Reading|lecture|قراءة|school|📖
Writing|écriture|كتابة|school|✍️
Example|exemple|مثال|school|💡
Exercise|exercice|تمرين|school|📋
Mistake|erreur|خطأ|school|❌
Correct|correct|صحيح|school|✅
Explain|expliquer|يشرح|verbs|💬
Repeat|répéter|يكرر|verbs|🔁
Remember|se souvenir|يتذكر|verbs|🧠
Forget|oublier|ينسى|verbs|🌫️
Understand|comprendre|يفهم|verbs|💡
Translate|traduire|يترجم|verbs|🌐
Meaning|sens|معنى|school|💬
Syllable|syllabe|مقطع|school|🔤
Comma|virgule|فاصلة|school|،
Period|point|نقطة|school|.
Roof|toit|سقف|home|🏠
Wall|mur|جدار|home|🧱
Floor|sol|أرضية|home|🪵
Ceiling|plafond|سقف داخلي|home|🏠
Stairs|escalier|درج|home|🪜
Balcony|balcon|شرفة|home|🏡
Fence|clôture|سياج|home|🪵
Gate|portail|بوابة|home|🚪
Garage|garage|مرآب|home|🚗
Lamp|lampe|مصباح|home|💡
Candle|bougie|شمعة|home|🕯️
Pillow|oreiller|وسادة|home|🛏️
Blanket|couverture|بطانية|home|🛏️
Curtain|rideau|ستارة|home|🪟
Carpet|tapis|سجادة|home|🧶
Towel|serviette|منشفة|home|🧻
Toothbrush|brosse à dents|فرشاة أسنان|home|🪥
Toothpaste|dentifrice|معجون أسنان|home|🦷
Shampoo|shampoing|شامبو|home|🧴
Broom|balai|مكنسة|home|🧹
Mop|serpillière|ممسحة|home|🧽
Bucket|seau|دلو|home|🪣
Sink|évier|حوض|home|🚰
Shower|douche|دش|home|🚿
Toilet|toilettes|مرحاض|home|🚽
Bathroom|salle de bain|حمام|home|🛁
Bedroom|chambre|غرفة نوم|home|🛏️
Attic|grenier|علية|home|🏚️
Chimney|cheminée|مدخنة|home|🏠
Brick|brique|طوبة|home|🧱
Hammer|marteau|مطرقة|home|🔨
Ladder|échelle|سلم|home|🪜
Drawer|tiroir|درج|home|🗄️
Shelf|étagère|رف|home|📚
Closet|placard|خزانة|home|🚪
Hanger|cintre|علاقة|home|👔
Laundry|linge|غسيل|home|👕
Needle|aiguille|إبرة|home|🪡
Thread|fil|خيط|home|🧵
Button|bouton|زر|clothes|🔘
Zipper|fermeture|سحاب|clothes|👖
Pocket|poche|جيب|clothes|👖
Shirt|chemise|قميص|clothes|👕
Dress|robe|فستان|clothes|👗
Trousers|pantalon|بنطلون|clothes|👖
Skirt|jupe|تنورة|clothes|👗
Sock|chaussette|جورب|clothes|🧦
Boot|botte|حذاء طويل|clothes|🥾
Sandal|sandale|صندل|clothes|👡
Belt|ceinture|حزام|clothes|👔
Scarf|écharpe|وشاح|clothes|🧣
Gloves|gants|قفازات|clothes|🧤
Jacket|veste|سترة|clothes|🧥
Coat|manteau|معطف|clothes|🧥
Sweater|pull|كنزة|clothes|🧶
Uniform|uniforme|زي|clothes|💂
Collar|col|ياقة|clothes|👔
Sleeve|manche|كم|clothes|👕
Cotton|coton|قطن|clothes|☁️
Wool|laine|صوف|clothes|🐑
Silk|soie|حرير|clothes|✨
Leather|cuir|جلد|clothes|👜
Umbrella|parapluie|مظلة|clothes|☂️
Glasses|lunettes|نظارات|clothes|👓
Watch|montre|ساعة يد|clothes|⌚
Ring|bague|خاتم|clothes|💍
Necklace|collier|عقد|clothes|📿
Earring|boucle d'oreille|قرط|clothes|💎
Bracelet|bracelet|سوار|clothes|📿
Perfume|parfum|عطر|clothes|🌸
Comb|peigne|مشط|clothes|💇
Brush|brosse|فرشاة|clothes|🖌️
Uncle|oncle|عم|people|👨
Aunt|tante|عمة|people|👩
Cousin|cousin|ابن عم|people|👫
Husband|mari|زوج|people|👨
Wife|épouse|زوجة|people|👩
Parent|parent|والد|people|👪
Grandparent|grand-parent|جد|people|👴
Grandson|petit-fils|حفيد|people|👦
Granddaughter|petite-fille|حفيدة|people|👧
Nephew|neveu|ابن أخ|people|👦
Niece|nièce|ابنة أخ|people|👧
Guest|invité|ضيف|people|🙋
Stranger|étranger|غريب|people|🕵️
Crowd|foule|حشد|people|👥
Person|personne|شخص|people|🧑
Boy|garçon|ولد|people|👦
Girl|fille|بنت|people|👧
Teenager|adolescent|مراهق|people|🧒
Adult|adulte|بالغ|people|🧑
Elder|aîné|كبير|people|👴
Twin|jumeau|توأم|people|👯
Couple|couple|زوجان|people|💑
Citizen|citoyen|مواطن|people|🪪
Foreigner|étranger|أجنبي|people|🌍
Tourist|touriste|سائح|people|📸
Visitor|visiteur|زائر|people|🚶
Host|hôte|مضيف|people|🏠
Partner|partenaire|شريك|people|🤝
Colleague|collègue|زميل|people|💼
Boss|patron|رئيس عمل|work|👔
Employee|employé|موظف|work|🧑‍💼
Customer|client|زبون|work|🛒
Client|client|عميل|work|💼
Artist|artiste|فنان|work|🎨
Singer|chanteur|مغني|work|🎤
Dancer|danseur|راقص|work|💃
Actor|acteur|ممثل|work|🎭
Player|joueur|لاعب|sports|⚽
Farmer|agriculteur|مزارع|work|🌾
Driver|chauffeur|سائق|work|🚗
Trader|commerçant|تاجر|work|🪙
Engineer|ingénieur|مهندس|work|🛠️
Lawyer|avocat|محام|work|⚖️
Judge|juge|قاض|work|⚖️
Mayor|maire|عمدة|work|🏛️
Soldier|soldat|جندي|work|🪖
Firefighter|pompier|رجل إطفاء|work|🚒
Carpenter|menuisier|نجار|work|🪚
Plumber|plombier|سباك|work|🔧
Electrician|électricien|كهربائي|work|💡
Mechanic|mécanicien|ميكانيكي|work|🔩
Tailor|tailleur|خياط|work|🧵
Barber|coiffeur|حلاق|work|💈
Chef|cuisinier|طاه|work|👨‍🍳
Baker|boulanger|خباز|work|🥖
Waiter|serveur|نادل|work|🍽️
Cashier|caissier|أمين صندوق|work|💵
Secretary|secrétaire|سكرتير|work|🗂️
Manager|directeur|مدير|work|💼
President|président|رئيس|work|🏛️
Minister|ministre|وزير|work|🏛️
King|roi|ملك|people|👑
Queen|reine|ملكة|people|👑
Village|village|قرية|places|🏘️
Capital|capitale|عاصمة|places|🏙️
Island|île|جزيرة|places|🏝️
Desert|désert|صحراء|places|🏜️
Mountain|montagne|جبل|places|⛰️
Forest|forêt|غابة|places|🌲
Jungle|jungle|أدغال|places|🌴
Valley|vallée|وادي|places|🏞️
Hill|colline|تل|places|⛰️
Lake|lac|بحيرة|places|🏞️
Ocean|océan|محيط|places|🌊
Beach|plage|شاطئ|places|🏖️
Coast|côte|ساحل|places|🌊
Harbor|port|ميناء|places|⚓
Airport|aéroport|مطار|places|✈️
Station|gare|محطة|places|🚉
Stadium|stade|ملعب|places|🏟️
Museum|musée|متحف|places|🏛️
Theater|théâtre|مسرح|places|🎭
Cinema|cinéma|سينما|places|🎬
Hotel|hôtel|فندق|places|🏨
Bank|banque|بنك|places|🏦
Police|police|شرطة|places|🚓
Prison|prison|سجن|places|🔒
Embassy|ambassade|سفارة|places|🏛️
Factory|usine|مصنع|places|🏭
Office|bureau|مكتب|places|🏢
Farm|ferme|مزرعة|places|🚜
Field|champ|حقل|places|🌾
Park|parc|حديقة|places|🌳
Bridge|pont|جسر|places|🌉
Tunnel|tunnel|نفق|places|🕳️
Tower|tour|برج|places|🗼
Castle|château|قلعة|places|🏰
Palace|palais|قصر|places|🏯
Temple|temple|معبد|places|🛕
Bakery|boulangerie|مخبز|places|🥐
Pharmacy|pharmacie|صيدلية|places|💊
Restaurant|restaurant|مطعم|places|🍴
Canteen|cantine|مقصف|places|🍱
Playground|aire de jeux|ملعب أطفال|places|🎠
Gym|salle de sport|صالة رياضة|places|🏋️
Pool|piscine|مسبح|places|🏊
Well|puits|بئر|places|💧
District|quartier|حي|places|🗺️
Region|région|منطقة|places|🗺️
Province|province|محافظة|places|🗺️
Border|frontière|حدود|places|🚧
Train|train|قطار|transport|🚆
Boat|bateau|قارب|transport|⛵
Motorcycle|moto|دراجة نارية|transport|🏍️
Taxi|taxi|سيارة أجرة|transport|🚕
Truck|camion|شاحنة|transport|🚚
Tractor|tracteur|جرار|transport|🚜
Ship|navire|سفينة|transport|🚢
Ferry|ferry|عبّارة|transport|⛴️
Helicopter|hélicoptère|مروحية|transport|🚁
Subway|métro|مترو|transport|🚇
Ticket|billet|تذكرة|transport|🎫
Passenger|passager|راكب|transport|🧍
Pilot|pilote|طيار|transport|👨‍✈️
Sailor|marin|بحار|transport|⚓
Luggage|bagages|أمتعة|transport|🧳
Suitcase|valise|حقيبة سفر|transport|🧳
Backpack|sac à dos|حقيبة ظهر|transport|🎒
Helmet|casque|خوذة|transport|⛑️
Seatbelt|ceinture|حزام أمان|transport|🚗
Engine|moteur|محرك|transport|⚙️
Wheel|roue|عجلة|transport|🛞
Tire|pneu|إطار|transport|🛞
Brake|frein|فرامل|transport|🛑
Fuel|carburant|وقود|transport|⛽
Petrol|essence|بنزين|transport|⛽
Traffic|circulation|مرور|transport|🚦
Accident|accident|حادث|transport|💥
Journey|voyage|رحلة|transport|🧳
Destination|destination|وجهة|transport|📍
Arrival|arrivée|وصول|transport|🛬
Departure|départ|مغادرة|transport|🛫
Cloud|nuage|سحابة|nature|☁️
Storm|tempête|عاصفة|nature|⛈️
Sand|sable|رمل|nature|🏜️
Dust|poussière|غبار|nature|💨
Thunder|tonnerre|رعد|nature|🌩️
Rainbow|arc-en-ciel|قوس قزح|nature|🌈
Fog|brouillard|ضباب|nature|🌫️
Snow|neige|ثلج|nature|❄️
Ice|glace|جليد|nature|🧊
Frost|givre|صقيع|nature|❄️
Flood|inondation|فيضان|nature|🌊
Drought|sécheresse|جفاف|nature|☀️
Harvest|récolte|حصاد|nature|🌾
Season|saison|فصل|nature|🍂
Spring|printemps|ربيع|nature|🌸
Summer|été|صيف|nature|☀️
Autumn|automne|خريف|nature|🍂
Winter|hiver|شتاء|nature|❄️
Heat|chaleur|حرارة|nature|🥵
Shade|ombre|ظل|nature|🌳
Shadow|ombre|ظل|nature|🌑
Horizon|horizon|أفق|nature|🌅
Sunrise|lever du soleil|شروق|nature|🌅
Sunset|coucher du soleil|غروب|nature|🌇
Dawn|aube|فجر|nature|🌄
Dusk|crépuscule|غسق|nature|🌆
Sky|ciel|سماء|nature|🌌
Rock|rocher|صخرة|nature|🪨
Stone|pierre|حجر|nature|🪨
Soil|sol|تربة|nature|🌱
Mud|boue|طين|nature|🟤
Grass|herbe|عشب|nature|🌱
Leaf|feuille|ورقة|nature|🍃
Root|racine|جذر|nature|🌱
Seed|graine|بذرة|nature|🌱
Branch|branche|غصن|nature|🌿
Volcano|volcan|بركان|nature|🌋
Cave|grotte|كهف|nature|🕳️
Waterfall|cascade|شلال|nature|🏞️
Wave|vague|موجة|nature|🌊
Tide|marée|مد وجزر|nature|🌊
Shell|coquillage|صدفة|nature|🐚
Lion|lion|أسد|animals|🦁
Tiger|tigre|نمر|animals|🐯
Elephant|éléphant|فيل|animals|🐘
Giraffe|girafe|زرافة|animals|🦒
Zebra|zèbre|حمار وحشي|animals|🦓
Monkey|singe|قرد|animals|🐒
Camel|chameau|جمل|animals|🐪
Donkey|âne|حمار|animals|🫏
Sheep|mouton|خروف|animals|🐑
Pig|cochon|خنزير|animals|🐷
Hen|poule|دجاجة|animals|🐔
Duck|canard|بطة|animals|🦆
Goose|oie|إوزة|animals|🪿
Rabbit|lapin|أرنب|animals|🐰
Mouse|souris|فأر|animals|🐭
Snake|serpent|ثعبان|animals|🐍
Lizard|lézard|سحلية|animals|🦎
Frog|grenouille|ضفدع|animals|🐸
Crocodile|crocodile|تمساح|animals|🐊
Wolf|loup|ذئب|animals|🐺
Fox|renard|ثعلب|animals|🦊
Bear|ours|دب|animals|🐻
Deer|cerf|غزال|animals|🦌
Antelope|antilope|ظبي|animals|🦌
Buffalo|buffle|جاموس|animals|🐃
Leopard|léopard|فهد|animals|🐆
Cheetah|guépard|فهد صياد|animals|🐆
Hyena|hyène|ضبع|animals|🦴
Scorpion|scorpion|عقرب|animals|🦂
Spider|araignée|عنكبوت|animals|🕷️
Ant|fourmi|نملة|animals|🐜
Bee|abeille|نحلة|animals|🐝
Butterfly|papillon|فراشة|animals|🦋
Mosquito|moustique|بعوضة|animals|🦟
Crab|crabe|سرطان|animals|🦀
Shark|requin|قرش|animals|🦈
Whale|baleine|حوت|animals|🐋
Dolphin|dauphin|دلفين|animals|🐬
Parrot|perroquet|ببغاء|animals|🦜
Eagle|aigle|نسر|animals|🦅
Owl|hibou|بومة|animals|🦉
Pigeon|pigeon|حمامة|animals|🕊️
Rooster|coq|ديك|animals|🐓
Puppy|chiot|جرو|animals|🐶
Kitten|chaton|هريرة|animals|🐱
Yesterday|hier|أمس|time|📅
Week|semaine|أسبوع|time|📅
Month|mois|شهر|time|📅
Year|année|سنة|time|📅
Hour|heure|ساعة|time|⏰
Minute|minute|دقيقة|time|⏱️
Second|seconde|ثانية|time|⏱️
Monday|lundi|الاثنين|time|📅
Tuesday|mardi|الثلاثاء|time|📅
Wednesday|mercredi|الأربعاء|time|📅
Thursday|jeudi|الخميس|time|📅
Friday|vendredi|الجمعة|time|📅
Saturday|samedi|السبت|time|📅
Sunday|dimanche|الأحد|time|📅
January|janvier|يناير|time|🗓️
February|février|فبراير|time|🗓️
March|mars|مارس|time|🗓️
April|avril|أبريل|time|🗓️
June|juin|يونيو|time|🗓️
July|juillet|يوليو|time|🗓️
August|août|أغسطس|time|🗓️
September|septembre|سبتمبر|time|🗓️
October|octobre|أكتوبر|time|🗓️
November|novembre|نوفمبر|time|🗓️
December|décembre|ديسمبر|time|🗓️
Calendar|calendrier|تقويم|time|📅
Alarm|alarme|منبه|time|⏰
Schedule|emploi du temps|جدول|time|📋
Delay|retard|تأخير|time|⏳
Early|tôt|مبكر|time|🌅
Late|tard|متأخر|time|🌙
Soon|bientôt|قريبا|time|⏳
Always|toujours|دائما|time|♾️
Never|jamais|أبدا|time|🚫
Often|souvent|غالبا|time|🔁
Sometimes|parfois|أحيانا|time|🌗
Already|déjà|بالفعل|time|✅
Still|encore|ما زال|time|⏳
Until|jusqu'à|حتى|time|➡️
During|pendant|خلال|time|⌛
Before|avant|قبل|time|⏮️
After|après|بعد|time|⏭️
Birthday|anniversaire|عيد ميلاد|time|🎂
Century|siècle|قرن|time|🏛️
Decade|décennie|عقد|time|📅
Moment|instant|لحظة|time|✨
Red|rouge|أحمر|colors|🔴
Blue|bleu|أزرق|colors|🔵
Green|vert|أخضر|colors|🟢
Yellow|jaune|أصفر|colors|🟡
Purple|violet|بنفسجي|colors|🟣
Brown|marron|بني|colors|🟤
Black|noir|أسود|colors|⚫
White|blanc|أبيض|colors|⚪
Pink|rose|وردي|colors|🩷
Gray|gris|رمادي|colors|⚪
Gold|or|ذهبي|colors|🥇
Silver|argent|فضي|colors|🥈
Circle|cercle|دائرة|shapes|⭕
Square|carré|مربع|shapes|⬜
Triangle|triangle|مثلث|shapes|🔺
Rectangle|rectangle|مستطيل|shapes|▭
Line|ligne|خط|shapes|➖
Zero|zéro|صفر|numbers|0️⃣
Thousand|mille|ألف|numbers|🔢
Million|million|مليون|numbers|🔢
Half|moitié|نصف|numbers|🌗
Double|double|ضعف|numbers|2️⃣
Pair|paire|زوج|numbers|👯
Equal|égal|يساوي|numbers|🟰
Count|compter|يعد|verbs|🔢
Measure|mesurer|يقيس|verbs|📏
Length|longueur|طول|shapes|📏
Width|largeur|عرض|shapes|↔️
Height|hauteur|ارتفاع|shapes|↕️
Weight|poids|وزن|shapes|⚖️
Size|taille|حجم|shapes|📐
Round|rond|مستدير|shapes|⚪
Flat|plat|مسطح|shapes|➖
Thick|épais|سميك|shapes|🧱
Thin|mince|رفيع|shapes|🧵
Big|grand|كبير|adjectives|🐘
Small|petit|صغير|adjectives|🐭
Tall|grand|طويل|adjectives|🦒
Short|court|قصير|adjectives|📏
Long|long|طويل|adjectives|📏
Wide|large|واسع|adjectives|↔️
Narrow|étroit|ضيق|adjectives|🚪
Heavy|lourd|ثقيل|adjectives|🏋️
Light|léger|خفيف|adjectives|🪶
Hot|chaud|حار|adjectives|🥵
Cold|froid|بارد|adjectives|🥶
Warm|tiède|دافئ|adjectives|🌤️
Cool|frais|بارد لطيف|adjectives|😎
New|nouveau|جديد|adjectives|✨
Old|vieux|قديم|adjectives|🏺
Young|jeune|شاب|adjectives|🌱
Fast|rapide|سريع|adjectives|⚡
Slow|lent|بطيء|adjectives|🐢
Clean|propre|نظيف|adjectives|✨
Dirty|sale|وسخ|adjectives|🦠
Dry|sec|جاف|adjectives|🏜️
Wet|mouillé|مبلل|adjectives|💧
Full|plein|ممتلئ|adjectives|📦
Empty|vide|فارغ|adjectives|🕳️
Open|ouvert|مفتوح|adjectives|📂
Closed|fermé|مغلق|adjectives|📁
Easy|facile|سهل|adjectives|😊
Hard|difficile|صعب|adjectives|🪨
Cheap|pas cher|رخيص|adjectives|🪙
Expensive|cher|غالي|adjectives|💎
Rich|riche|غني|adjectives|💰
Poor|pauvre|فقير|adjectives|🥺
Loud|bruyant|صاخب|adjectives|📢
Quiet|calme|هادئ|adjectives|🤫
Bright|brillant|مشرق|adjectives|🌟
Dark|sombre|مظلم|adjectives|🌑
Soft|doux|ناعم|adjectives|🧸
Smooth|lisse|أملس|adjectives|✨
Rough|rugueux|خشن|adjectives|🪨
Sharp|tranchant|حاد|adjectives|🔪
Safe|sûr|آمن|adjectives|🛡️
Dangerous|dangereux|خطر|adjectives|⚠️
Busy|occupé|مشغول|adjectives|📅
Famous|célèbre|مشهور|adjectives|🌟
Local|local|محلي|adjectives|📍
Foreign|étranger|أجنبي|adjectives|🌍
Public|public|عام|adjectives|🏛️
Private|privé|خاص|adjectives|🔒
Modern|moderne|حديث|adjectives|🏙️
Ancient|ancien|قديم|adjectives|🏺
Special|spécial|خاص|adjectives|⭐
Normal|normal|عادي|adjectives|🙂
Strange|étrange|غريب|adjectives|🌀
Useful|utile|مفيد|adjectives|🧰
Possible|possible|ممكن|adjectives|✅
Impossible|impossible|مستحيل|adjectives|🚫
Necessary|nécessaire|ضروري|adjectives|📌
Important|important|مهم|adjectives|❗
Serious|sérieux|جدي|adjectives|😐
Funny|drôle|مضحك|adjectives|😂
Sad|triste|حزين|adjectives|😢
Proud|fier|فخور|adjectives|🦚
Shy|timide|خجول|adjectives|🙈
Calm|calme|هادئ|adjectives|😌
Nervous|nerveux|متوتر|adjectives|😬
Polite|poli|مهذب|adjectives|🙇
Clever|intelligent|ذكي|adjectives|🧠
Careful|prudent|حذر|adjectives|👀
Lucky|chanceux|محظوظ|adjectives|🍀
Sick|malade|مريض|adjectives|🤒
Alive|vivant|حي|adjectives|🌱
Awake|éveillé|يقظ|adjectives|👀
Asleep|endormi|نائم|adjectives|😴
True|vrai|صحيح|adjectives|✅
False|faux|خطأ|adjectives|❌
Right|juste|صحيح|adjectives|➡️
Wrong|faux|خاطئ|adjectives|🚫
Same|même|نفس|adjectives|🔁
Different|différent|مختلف|adjectives|🔀
First|premier|أول|adjectives|1️⃣
Last|dernier|أخير|adjectives|🔚
Next|prochain|التالي|adjectives|⏭️
Eat|manger|يأكل|verbs|🍽️
Drink|boire|يشرب|verbs|🥤
Sleep|dormir|ينام|verbs|😴
Walk|marcher|يمشي|verbs|🚶
Run|courir|يجري|verbs|🏃
Sit|s'asseoir|يجلس|verbs|🪑
Stand|se tenir|يقف|verbs|🧍
Close|fermer|يغلق|verbs|🚪
Give|donner|يعطي|verbs|🎁
Take|prendre|يأخذ|verbs|🤲
Bring|apporter|يحضر|verbs|📦
Carry|porter|يحمل|verbs|🏋️
Keep|garder|يحفظ|verbs|📦
Find|trouver|يجد|verbs|🔍
Lose|perdre|يفقد|verbs|😞
Buy|acheter|يشتري|verbs|🛒
Sell|vendre|يبيع|verbs|🏷️
Pay|payer|يدفع|verbs|💵
Cost|coûter|يكلف|verbs|💲
Need|avoir besoin|يحتاج|verbs|🙏
Want|vouloir|يريد|verbs|✨
Like|aimer|يحب|verbs|💛
Enjoy|profiter|يستمتع|verbs|😄
Prefer|préférer|يفضل|verbs|👍
Choose|choisir|يختار|verbs|☑️
Start|commencer|يبدأ|verbs|▶️
Stop|arrêter|يتوقف|verbs|⏹️
Finish|finir|ينهي|verbs|🏁
Begin|commencer|يبدأ|verbs|🎬
Continue|continuer|يستمر|verbs|➡️
Wait|attendre|ينتظر|verbs|⏳
Hurry|se dépêcher|يستعجل|verbs|💨
Arrive|arriver|يصل|verbs|📍
Leave|partir|يغادر|verbs|🚪
Enter|entrer|يدخل|verbs|➡️
Return|revenir|يعود|verbs|🔙
Stay|rester|يبقى|verbs|🏠
Live|vivre|يعيش|verbs|🌱
Grow|grandir|ينمو|verbs|🌿
Become|devenir|يصبح|verbs|🔄
Make|faire|يصنع|verbs|🛠️
Use|utiliser|يستخدم|verbs|🧰
Try|essayer|يحاول|verbs|🎯
Help|aider|يساعد|verbs|🤝
Ask|demander|يسأل|verbs|❓
Tell|raconter|يخبر|verbs|💬
Talk|parler|يتحدث|verbs|🗣️
Hear|entendre|يسمع|verbs|👂
See|voir|يرى|verbs|👀
Look|regarder|ينظر|verbs|👀
Watch|regarder|يشاهد|verbs|📺
Show|montrer|يعرض|verbs|👆
Hide|cacher|يخفي|verbs|🙈
Know|savoir|يعرف|verbs|🧠
Think|penser|يفكر|verbs|💭
Believe|croire|يؤمن|verbs|🙏
Learn|apprendre|يتعلم|verbs|📘
Study|étudier|يدرس|verbs|📚
Teach|enseigner|يعلم|verbs|👩‍🏫
Read|lire|يقرأ|verbs|📖
Write|écrire|يكتب|verbs|✍️
Draw|dessiner|يرسم|verbs|✏️
Paint|peindre|يطلي|verbs|🎨
Sing|chanter|يغني|verbs|🎤
Dance|danser|يرقص|verbs|💃
Play|jouer|يلعب|verbs|🎮
Win|gagner|يفوز|verbs|🏆
Compete|concourir|يتنافس|verbs|🏅
Kick|taper|يركل|verbs|👟
Throw|lancer|يرمي|verbs|🤾
Catch|attraper|يمسك|verbs|🤾
Jump|sauter|يقفز|verbs|🤾
Climb|grimper|يتسلق|verbs|🧗
Swim|nager|يسبح|verbs|🏊
Fly|voler|يطير|verbs|🦅
Drive|conduire|يقود|verbs|🚗
Ride|monter|يركب|verbs|🚲
Cook|cuisiner|يطبخ|verbs|👨‍🍳
Wash|laver|يغسل|verbs|🧼
Cut|couper|يقطع|verbs|✂️
Break|casser|يكسر|verbs|💔
Fix|réparer|يصلح|verbs|🔧
Build|construire|يبني|verbs|🧱
Create|créer|يخلق|verbs|✨
Invent|inventer|يخترع|verbs|💡
Discover|découvrir|يكتشف|verbs|🔎
Explore|explorer|يستكشف|verbs|🧭
Search|chercher|يبحث|verbs|🔍
Follow|suivre|يتبع|verbs|👣
Lead|diriger|يقود|verbs|🚩
Push|pousser|يدفع|verbs|✋
Pull|tirer|يسحب|verbs|🪢
Lift|soulever|يرفع|verbs|🏋️
Drop|lâcher|يسقط|verbs|📉
Fall|tomber|يسقط|verbs|🍂
Rise|monter|يرتفع|verbs|📈
Turn|tourner|يدور|verbs|↩️
Change|changer|يغير|verbs|🔄
Move|bouger|يتحرك|verbs|📦
Send|envoyer|يرسل|verbs|📨
Receive|recevoir|يستقبل|verbs|📥
Call|appeler|يتصل|verbs|📞
Visit|visiter|يزور|verbs|🏠
Invite|inviter|يدعو|verbs|📩
Meet|rencontrer|يلتقي|verbs|🤝
Join|rejoindre|ينضم|verbs|➕
Share|partager|يشارك|verbs|🤲
Save|sauver|يحفظ|verbs|💾
Spend|dépenser|ينفق|verbs|💸
Borrow|emprunter|يستعير|verbs|📒
Lend|prêter|يقرض|verbs|💵
Protect|protéger|يحمي|verbs|🛡️
Allow|permettre|يسمح|verbs|✅
Refuse|refuser|يرفض|verbs|🚫
Agree|être d'accord|يوافق|verbs|🤝
Decide|décider|يقرر|verbs|⚖️
Prepare|préparer|يحضر|verbs|🧺
Organize|organiser|ينظم|verbs|🗂️
Compare|comparer|يقارن|verbs|⚖️
Describe|décrire|يصف|verbs|📝
Imagine|imaginer|يتخيل|verbs|🌈
Forgive|pardonner|يسامح|verbs|💛
Promise|promettre|يعد|verbs|🤞
Suggest|suggérer|يقترح|verbs|💡
Advise|conseiller|ينصح|verbs|🗣️
Warn|avertir|يحذر|verbs|⚠️
Complain|se plaindre|يشكو|verbs|😤
Celebrate|célébrer|يحتفل|verbs|🎉
Surprise|surprendre|يفاجئ|verbs|🎁
Worry|s'inquiéter|يقلق|verbs|😟
Laugh|rire|يضحك|verbs|😂
Cry|pleurer|يبكي|verbs|😢
Shout|crier|يصرخ|verbs|📢
Whisper|chuchoter|يهمس|verbs|🤫
Breathe|respirer|يتنفس|verbs|😮
Rest|se reposer|يستريح|verbs|😌
Wake|se réveiller|يستيقظ|verbs|⏰
Fear|peur|خوف|feelings|😨
Pride|fierté|فخر|feelings|🦚
Shame|honte|خجل|feelings|😳
Joy|joie|فرح|feelings|😄
Sadness|tristesse|حزن|feelings|😢
Anger|colère|غضب|feelings|😡
Trust|confiance|ثقة|feelings|🤝
Doubt|doute|شك|feelings|🤔
Faith|foi|إيمان|feelings|🙏
Luck|chance|حظ|feelings|🍀
Chance|hasard|فرصة|feelings|🎲
Risk|risque|خطر|feelings|⚠️
Danger|danger|خطر|feelings|🚨
Safety|sécurité|سلامة|feelings|🛡️
Energy|énergie|طاقة|feelings|⚡
Effort|effort|جهد|feelings|💪
Skill|compétence|مهارة|feelings|🎯
Talent|talent|موهبة|feelings|🌟
Habit|habitude|عادة|life|🔁
Custom|coutume|عرف|life|🪔
Culture|culture|ثقافة|life|🎭
Tradition|tradition|تقليد|life|🕯️
History|histoire|تاريخ|life|📜
Science|science|علم|life|🔬
Religion|religion|دين|life|🕌
Prayer|prière|صلاة|life|🙏
Miracle|miracle|معجزة|life|✨
Magic|magie|سحر|life|🪄
Mystery|mystère|لغز|life|🔮
Secret|secret|سر|life|🤫
News|nouvelles|أخبار|life|📰
Information|information|معلومات|life|ℹ️
Wisdom|sagesse|حكمة|life|🦉
Memory|mémoire|ذاكرة|life|🧠
Attention|attention|انتباه|life|👀
Focus|concentration|تركيز|life|🎯
Interest|intérêt|اهتمام|life|📌
Hobby|passe-temps|هواية|life|🎨
Passion|passion|شغف|life|🔥
Purpose|but|هدف|life|🎯
Value|valeur|قيمة|life|💎
Quality|qualité|جودة|life|⭐
Quantity|quantité|كمية|life|🔢
Amount|montant|مقدار|life|💵
Result|résultat|نتيجة|life|🏁
Cause|cause|سبب|life|➡️
Effect|effet|أثر|life|💥
Progress|progrès|تقدم|life|📈
Development|développement|تنمية|life|🌱
Growth|croissance|نمو|life|🌿
Crisis|crise|أزمة|life|🚨
Solution|solution|حل|life|💡
Method|méthode|طريقة|life|🧭
System|système|نظام|life|⚙️
Rule|règle|قاعدة|life|📏
Law|loi|قانون|life|⚖️
Duty|devoir|واجب|life|📋
Justice|justice|عدالة|life|⚖️
Crime|crime|جريمة|life|🚨
Punishment|punition|عقاب|life|⚖️
Reward|récompense|مكافأة|life|🏅
Prize|prix|جائزة|life|🏆
Gift|cadeau|هدية|life|🎁
Salary|salaire|راتب|work|💵
Wage|paie|أجر|work|🪙
Tax|impôt|ضريبة|work|🧾
Profit|profit|ربح|work|📈
Business|entreprise|عمل تجاري|work|💼
Company|société|شركة|work|🏢
Machine|machine|آلة|work|⚙️
Tool|outil|أداة|work|🛠️
Worker|ouvrier|عامل|work|👷
Computer|ordinateur|حاسوب|tech|💻
Internet|internet|إنترنت|tech|🌐
Password|mot de passe|كلمة سر|tech|🔐
Message|message|رسالة|tech|💬
Video|vidéo|فيديو|tech|📹
Camera|caméra|كاميرا|tech|📷
Screen|écran|شاشة|tech|🖥️
Keyboard|clavier|لوحة مفاتيح|tech|⌨️
Printer|imprimante|طابعة|tech|🖨️
Website|site web|موقع|tech|🌐
Email|courriel|بريد|tech|📧
Account|compte|حساب|tech|👤
Profile|profil|ملف شخصي|tech|🪪
Network|réseau|شبكة|tech|🕸️
Signal|signal|إشارة|tech|📶
Battery|batterie|بطارية|tech|🔋
Charger|chargeur|شاحن|tech|🔌
Cable|câble|كابل|tech|🔌
Switch|interrupteur|مفتاح|tech|🎚️
Robot|robot|روبوت|tech|🤖
Satellite|satellite|قمر صناعي|tech|🛰️
Software|logiciel|برمجيات|tech|💿
Hardware|matériel|عتاد|tech|🖥️
Digital|numérique|رقمي|tech|📲
Online|en ligne|متصل|tech|🟢
Download|télécharger|يحمل|tech|⬇️
Upload|envoyer|يرفع|tech|⬆️
File|fichier|ملف|tech|📄
Folder|dossier|مجلد|tech|📁
Document|document|وثيقة|tech|📄
Football|football|كرة قدم|sports|⚽
Basketball|basket-ball|كرة سلة|sports|🏀
Volleyball|volley-ball|كرة طائرة|sports|🏐
Tennis|tennis|تنس|sports|🎾
Boxing|boxe|ملاكمة|sports|🥊
Running|course|جري|sports|🏃
Swimming|natation|سباحة|sports|🏊
Winner|gagnant|فائز|sports|🥇
Loser|perdant|خاسر|sports|😞
Score|score|نتيجة|sports|🔢
Match|match|مباراة|sports|🏟️
Tournament|tournoi|بطولة|sports|🏆
Coach|entraîneur|مدرب|sports|🧢
Referee|arbitre|حكم|sports|🧑‍⚖️
Whistle|sifflet|صافرة|sports|📢
Ball|ballon|كرة|sports|⚽
Guitar|guitare|غيتار|music|🎸
Piano|piano|بيانو|music|🎹
Violin|violon|كمان|music|🎻
Drum|tambour|طبل|music|🥁
Trumpet|trompette|بوق|music|🎺
Flute|flûte|ناي|music|🎵
Song|chanson|أغنية|music|🎶
Melody|mélodie|لحن|music|🎵
Rhythm|rythme|إيقاع|music|🥁
Concert|concert|حفلة|music|🎤
Radio|radio|راديو|music|📻
Television|télévision|تلفاز|music|📺
Movie|film|فيلم|music|🎬
Photo|photo|صورة|music|📷
Picture|image|صورة|music|🖼️
Statue|statue|تمثال|music|🗿
Festival|festival|مهرجان|life|🎊
Wedding|mariage|زفاف|life|💒
Funeral|funérailles|جنازة|life|🕯️
Chief|chef|زعيم|people|🪶
Community|communité|مجتمع|life|👥
Hospitality|hospitalité|ضيافة|life|🫖
Generosity|générosité|كرم|life|🎁
Cooperation|coopération|تعاون|life|🤝
Compound|concession|حوش|home|🏡
Mat|natte|حصيرة|home|🧶
Drumbeat|tambour|طبل|music|🥁
Greeting|salutation|تحية|life|👋
Handshake|poignée de main|مصافحة|life|🤝
Blessing|bénédiction|بركة|life|✨
Fasting|jeûne|صيام|life|🌙
Pilgrim|pèlerin|حاج|life|🕋
Baobab|baobab|باوباب|nature|🌳
Acacia|acacia|سنط|nature|🌳
Article|article|مقالة|school|📰
Report|rapport|تقرير|school|📄
Summary|résumé|ملخص|school|🧾
Introduction|introduction|مقدمة|school|▶️
Conclusion|conclusion|خاتمة|school|🏁
Argument|argument|حجة|school|💬
Evidence|preuve|دليل|school|🔎
Detail|détail|تفصيل|school|🔍
Fact|fait|حقيقة|school|📌
Theory|théorie|نظرية|school|🔬
Research|recherche|بحث|school|🔬
Experiment|expérience|تجربة|school|🧪
Analysis|analyse|تحليل|school|📊
Comparison|comparaison|مقارنة|school|⚖️
Definition|définition|تعريف|school|📘
Description|description|وصف|school|📝
Instruction|consigne|تعليمات|school|📋
Direction|direction|اتجاه|school|🧭
Condition|condition|شرط|school|⚙️
Situation|situation|وضع|life|📍
Context|contexte|سياق|school|🧩
Environment|environnement|بيئة|nature|🌍
Society|société|مجتمع|life|🏙️
Government|gouvernement|حكومة|life|🏛️
Politics|politique|سياسة|life|🗳️
Economy|économie|اقتصاد|life|💹
Education|éducation|تعليم|school|🎓
Technology|technologie|تكنولوجيا|tech|💻
Communication|communication|تواصل|life|📡
Transportation|transport|نقل|transport|🚌
Agriculture|agriculture|زراعة|work|🚜
Industry|industrie|صناعة|work|🏭
Trade|commerce|تجارة|work|🪙
Export|exportation|تصدير|work|📦
Import|importation|استيراد|work|📥
Product|produit|منتج|work|📦
Service|service|خدمة|work|🛎️
Consumer|consommateur|مستهلك|work|🛒
Producer|producteur|منتج|work|🏭
Demand|demande|طلب|work|📈
Supply|offre|عرض|work|📦
Price|prix|سعر|work|💲
Budget|budget|ميزانية|work|📒
Loan|prêt|قرض|work|🏦
Debt|dette|دين|work|📉
Credit|crédit|ائتمان|work|💳
Investment|investissement|استثمار|work|📊
Insurance|assurance|تأمين|work|🛡️
Contract|contrat|عقد|work|📜
Agreement|accord|اتفاق|work|🤝
Meeting|réunion|اجتماع|work|🪑
Discussion|discussion|نقاش|work|💬
Debate|débat|مناظرة|school|🗣️
Speech|discours|خطاب|school|🎤
Presentation|présentation|عرض|school|📽️
Interview|entretien|مقابلة|work|🎙️
Application|candidature|طلب|work|📝
Certificate|certificat|شهادة|school|📜
License|licence|رخصة|life|🪪
Identity|identité|هوية|life|🪪
Nationality|nationalité|جنسية|life|🌍
Passport|passeport|جواز سفر|life|🛂
Visa|visa|تأشيرة|life|🛂
Customs|douane|جمارك|life|🧳
Immigration|immigration|هجرة|life|✈️
Ambassador|ambassadeur|سفير|work|🏛️
Planet|planète|كوكب|nature|🪐
Galaxy|galaxie|مجرة|nature|🌌
Comet|comète|مذنب|nature|☄️
Eclipse|éclipse|كسوف|nature|🌑
Oxygen|oxygène|أكسجين|nature|💨
Gravity|gravité|جاذبية|nature|🌍
Magnet|aimant|مغناطيس|nature|🧲
Echo|écho|صدى|nature|🔊
Silence|silence|صمت|feelings|🤫
Whisperword|murmure|همس|feelings|🤫
Promiseword|promesse|وعد|feelings|🤞
Patienceword|patience|صبر|feelings|⏳
Courageword|courage|شجاعة|feelings|🦁
Respectword|respect|احترام|feelings|🙇
Freedomword|liberté|حرية|feelings|🕊️
Honestword|honnête|صادق|adjectives|🤍
Simpleword|simple|بسيط|adjectives|▫️
Readyword|prêt|جاهز|adjectives|✅
Practiceword|entraînement|تدريب|school|🏋️
Languageword|langue|لغة|school|🗣️
Questionword|interrogation|سؤال|school|❓
Answerword|réponse|جواب|school|💬
Teacherword|professeur|معلم|school|👩‍🏫
Studentword|élève|طالب|school|🎒
Familyword|famille|عائلة|people|👪
Friendword|ami|صديق|people|🤗
Marketword|marché|سوق|places|🛒
Kitchenword|cuisine|مطبخ|home|🍳
Windowword|fenêtre|نافذة|home|🪟
Gardenword|jardin|حديقة|home|🌻
Countryword|pays|بلد|places|🌍
Hospitalword|hôpital|مستشفى|places|🏥
Morningword|matin|صباح|time|🌅
Eveningword|soir|مساء|time|🌆
Tomorrowword|lendemain|غد|time|📅
Beautiful|beau|جميل|adjectives|🌸
Confident|confiant|واثق|adjectives|💪
Champion|champion|بطل|sports|🏆
Lightning|éclair|برق|nature|⚡
Adventure|aventure|مغامرة|life|🧭
Knowledge|connaissance|معرفة|school|📚
Strength|force|قوة|feelings|💪
Victory|victoire|نصر|sports|🏅
Adventurex|périple|رحلة|life|🗺️
Kingdom|royaume|مملكة|places|👑
Villagex|hameau|قرية صغيرة|places|🏡
Notebookx|carnet|كراسة|school|📓
Classroomx|classe|قاعة درس|school|🏫
Homeworkx|travail maison|وظيفة|school|✏️
Blackboardx|ardoise|لوح|school|⬛
Dictionaryx|lexique|معجم|school|📗
Pronounce|prononcer|ينطق|verbs|🗣️
Listenx|écouter|يستمع|verbs|👂
Speakx|parler|يتكلم|verbs|🗣️
Readx|lire à voix|يتلو|verbs|📖
Writex|rédiger|يؤلف|verbs|📝
Translatex|interpréter|يترجم فوريا|verbs|🌐
Understandx|saisir|يستوعب|verbs|💡
Rememberx|retenir|يحفظ|verbs|🧠
Forgetx|omettre|ينسى عمدا|verbs|🌫️
Explorers|explorateur|مستكشف|people|🧭
Inventor|inventeur|مخترع|people|💡
Scientist|scientifique|عالم|work|🔬
Journalist|journaliste|صحفي|work|📰
Photographer|photographe|مصور|work|📷
Musician|musicien|موسيقي|work|🎼
Poet|poète|شاعر|people|📜
Writer|écrivain|كاتب|work|✍️
Painter|peintre|رسام|work|🎨
Sculptor|sculpteur|نحات|work|🗿
Athlete|athlète|رياضي|sports|🏅
Runner|coureur|عداء|sports|🏃
Swimmer|nageur|سباح|sports|🏊
Cyclist|cycliste|دراج|sports|🚴
Goalkeeper|gardien|حارس مرمى|sports|🧤
Striker|attaquant|مهاجم|sports|⚽
Defender|défenseur|مدافع|sports|🛡️
Captain|capitaine|قائد|sports|©️
Audience|public|جمهور|people|👥
Spectator|spectateur|متفرج|people|👀
Neighborx|voisinage|جوار|people|🏘️
Strangerx|inconnu|مجهول|people|❓
Hero|héros|بطل|people|🦸
Legend|légende|أسطورة|life|📖
Myth|mythe|أسطورة قديمة|life|🐉
Folktale|conte|حكاية|life|📚
Proverb|proverbe|مثل|life|💬
Riddle|énigme|لغز|life|🧩
Joke|blague|نكتة|life|😂
Humor|humour|فكاهة|feelings|😄
Smilex|sourire|ابتسامة|feelings|😊
Laughx|éclat de rire|ضحكة|feelings|😂
Tears|larmes|دموع|feelings|😭
Comfort|réconfort|راحة|feelings|🤗
Support|soutien|دعم|feelings|🤲
Kindness|gentillesse|لطف|feelings|💗
Honesty|honnêteté|صدق|feelings|🤍
Loyalty|loyauté|وفاء|feelings|🫂
Friendship|amitié|صداقة|feelings|🤝
Marriage|mariage|زواج|life|💍
Divorce|divorce|طلاق|life|📄
Childhood|enfance|طفولة|life|🧸
Youth|jeunesse|شباب|life|🌱
Adulthood|âge adulte|بلوغ|life|🧑
Oldage|vieillesse|شيخوخة|life|👴
Birth|naissance|ولادة|life|👶
Death|mort|موت|life|🕯️
Life|vie|حياة|life|🌍
World|monde|عالم|places|🌎
Continent|continent|قارة|places|🗺️
Nation|nation|أمة|places|🚩
Republic|république|جمهورية|places|🏛️
Empire|empire|إمبراطورية|places|👑
Colony|colonie|مستعمرة|places|⚓
Independence|indépendance|استقلال|life|🕊️
Democracy|démocratie|ديمقراطية|life|🗳️
Election|élection|انتخاب|life|🗳️
Vote|vote|تصويت|life|🗳️
Candidate|candidat|مرشح|work|🗳️
Campaign|campagne|حملة|work|📢
Parliament|parlement|برلمان|places|🏛️
Senate|sénat|مجلس شيوخ|places|🏛️
Court|tribunal|محكمة|places|⚖️
Prisoner|prisonnier|سجين|people|🔒
Victim|victime|ضحية|people|💔
Witness|témoin|شاهد|people|👁️
Evidencex|indice|قرينة|life|🔎
Trial|procès|محاكمة|life|⚖️
Verdict|verdict|حكم|life|⚖️
Innocent|innocent|بريء|adjectives|🤍
Guilty|coupable|مذنب|adjectives|⚖️
Legal|légal|قانوني|adjectives|📜
Illegal|illégal|غير قانوني|adjectives|🚫
Fair|équitable|عادل|adjectives|⚖️
Unfair|injuste|ظالم|adjectives|😠
Equalx|égalité|مساواة|life|🟰
Rights|droits|حقوق|life|📜
Freedomx|affranchissement|تحرر|life|🕊️
Slavery|esclavage|عبودية|life|⛓️
Poverty|pauvreté|فقر|life|🥺
Wealth|richesse|ثروة|life|💎
Hunger|faim|جوع|life|🍽️
Thirst|soif|عطش|life|🚰
Shelter|abri|مأوى|home|🛖
Refugee|réfugié|لاجئ|people|🧳
Volunteer|bénévole|متطوع|people|🙋
Charity|charité|صدقة|life|💝
Donation|don|تبرع|life|💵
Hospitalx|infirmerie|مستوصف|places|🏥
Medicinex|remède|علاج|body|💊
Vaccine|vaccin|لقاح|body|💉
Virus|virus|فيروس|body|🦠
Bacteria|bactérie|بكتيريا|body|🦠
Hygiene|hygiène|نظافة|body|🧼
Exercisebody|activité physique|رياضة|body|🏃
Nutrition|nutrition|تغذية|food|🥗
Vitamin|vitamine|فيتامين|food|💊
Protein|protéine|بروتين|food|🥩
Calcium|calcium|كالسيوم|food|🦴
Diet|régime|نظام غذائي|food|🥦
Obesity|obésité|سمنة|body|⚖️
Fitness|forme|لياقة|sports|💪
Yoga|yoga|يوغا|sports|🧘
Meditation|méditation|تأمل|feelings|🧘
Stress|stress|توتر|feelings|😰
Anxiety|anxiété|قلق|feelings|😟
Depression|dépression|اكتئاب|feelings|😞
Happiness|bonheur|سعادة|feelings|😊
Optimism|optimisme|تفاؤل|feelings|🌅
Pessimism|pessimisme|تشاؤم|feelings|☁️
Courageous|courageux|شجاع|adjectives|🦁
Fearless|intrépide|جريء|adjectives|🦅
Generous|généreux|كريم|adjectives|🎁
Selfish|égoïste|أناني|adjectives|🚫
Humble|humble|متواضع|adjectives|🙏
Arrogant|arrogant|متكبر|adjectives|🦚
Patient|patient|صبور|adjectives|⏳
Impatient|impatient|نافد الصبر|adjectives|⏰
Curious|curieux|فضولي|adjectives|🔍
Creative|créatif|مبدع|adjectives|🎨
Lazy|paresseux|كسول|adjectives|😴
Active|actif|نشيط|adjectives|⚡
Reliable|fiable|موثوق|adjectives|🔒
Flexible|flexible|مرن|adjectives|🤸
Strict|strict|صارم|adjectives|📏
Gentle|doux|لطيف|adjectives|🌸
Tough|dur|قاسي|adjectives|🪨
Fragile|fragile|هش|adjectives|🥚
Solid|solide|صلب|adjectives|🧱
Liquid|liquide|سائل|nature|💧
Gas|gaz|غاز|nature|💨
Metal|métal|معدن|nature|⚙️
Plastic|plastique|بلاستيك|objects|🧴
Glassware|verrerie|زجاجيات|objects|🥃
Wooden|en bois|خشبي|objects|🪵
Paperx|feuille papier|ورقة|objects|📄
Cardboard|carton|كرتون|objects|📦
Rubber|caoutchouc|مطاط|objects|⚽
Steel|acier|فولاذ|objects|⚙️
Copper|cuivre|نحاس|objects|🟠
Ironmetal|fer|حديد|objects|⚙️
Goldmetal|or métal|ذهب|objects|🥇
Diamond|diamant|ماس|objects|💎
Crystal|cristal|بلور|objects|✨
Mirror|miroir|مرآة|home|🪞
Clockx|horloge|ساعة حائط|home|🕐
Calendarx|agenda|مفكرة|home|📓
Wallet|portefeuille|محفظة|objects|👛
Purse|sac à main|حقيبة يد|objects|👜
Coin|pièce|عملة معدنية|objects|🪙
Banknote|billet|ورقة نقدية|objects|💵
Receipt|reçu|إيصال|objects|🧾
Invoice|facture|فاتورة|objects|🧾
Stamp|timbre|طابع|objects|✉️
Envelope|enveloppe|ظرف|objects|✉️
Letterx|lettre|رسالة|objects|💌
Postcard|carte postale|بطاقة|objects|🖼️
Parcel|colis|طرد|objects|📦
Address|adresse|عنوان|places|📍
Mailbox|boîte aux lettres|صندوق بريد|objects|📫
Telephone|téléphone fixe|هاتف أرضي|tech|☎️
Mobile|portable|جوال|tech|📱
Tablet|tablette|لوح|tech|📲
Headphones|écouteurs|سماعات|tech|🎧
Microphone|microphone|ميكروفون|tech|🎤
Speaker|haut-parleur|مكبر صوت|tech|🔊
Remote|télécommande|ريموت|tech|📺
Antenna|antenne|هوائي|tech|📡
Wifi|wifi|واي فاي|tech|📶
Bluetooth|bluetooth|بلوتوث|tech|🔵
Applicationx|appli|تطبيق|tech|📱
Browser|navigateur|متصفح|tech|🌐
Searchx|recherche web|بحث|tech|🔎
Link|lien|رابط|tech|🔗
Username|identifiant|اسم مستخدم|tech|👤
Login|connexion|تسجيل دخول|tech|🔐
Logout|déconnexion|خروج|tech|🚪
Update|mise à jour|تحديث|tech|🔄
Install|installer|يثبت|tech|⬇️
Delete|supprimer|يحذف|tech|🗑️
Copy|copier|ينسخ|tech|📋
Paste|coller|يلصق|tech|📎
Print|imprimer|يطبع|tech|🖨️
Scan|scanner|يمسح|tech|🖨️
Click|cliquer|ينقر|tech|🖱️
Type|taper|يكتب|tech|⌨️
Scroll|défiler|يمرر|tech|📜
Zoom|zoomer|يكبر|tech|🔍
Filter|filtrer|يصفي|tech|🧪
Sort|trier|يرتب|tech|🔢
Backup|sauvegarde|نسخة احتياطية|tech|💾
Cloudx|nuage informatique|سحابة رقمية|tech|☁️
Data|données|بيانات|tech|📊
Algorithm|algorithme|خوارزمية|tech|🧮
Code|code|شفرة|tech|💻
Program|programme|برنامج|tech|🖥️
Database|base de données|قاعدة بيانات|tech|🗄️
Server|serveur|خادم|tech|🖥️
Clientx|client réseau|عميل شبكة|tech|💻
Security|sécurité|أمن|tech|🔐
Privacy|vie privée|خصوصية|tech|🕵️
Hacker|pirate|مخترق|tech|🕵️
Virusx|malware|برمجية خبيثة|tech|🦠
Firewall|pare-feu|جدار ناري|tech|🧱
Encryption|chiffrement|تشفير|tech|🔐
"""

WORD_RE = re.compile(r"^[\p{L}][\p{L}\s'-]{0,46}$") if False else re.compile(r"^[A-Za-z][A-Za-z '-]{0,46}$")


def parse() -> list[dict]:
    seen: set[str] = set()
    rows: list[dict] = []
    for raw in RAW.strip().splitlines():
        raw = raw.strip()
        if not raw or raw.startswith("#"):
            continue
        parts = raw.split("|")
        if len(parts) != 5:
            raise SystemExit(f"bad row: {raw}")
        en, fr, ar, cat, emoji = [p.strip() for p in parts]
        key = en.lower().strip()
        if key in OLD or key in seen:
            continue
        if not WORD_RE.match(en.replace("é", "e")) and not en.isascii():
            pass
        if not (1 <= len(en) <= 48 and 1 <= len(fr) <= 80 and 1 <= len(ar) <= 80 and emoji):
            raise SystemExit(f"len fail: {en}")
        seen.add(key)
        rows.append({"en": en, "fr": fr, "ar": ar, "cat": cat, "emoji": emoji, "key": key})
    return rows


def sql_escape(value: str) -> str:
    return value.replace("'", "''")


def assign_difficulty(rows: list[dict]) -> None:
    n = len(rows)
    for i, row in enumerate(rows):
        # 10 words per difficulty 1..100 when n==1000
        row["diff"] = min(100, 1 + (i * 100) // max(1, n))


def clash_words(rows: list[dict]) -> list[str]:
    candidates: list[str] = []
    seen: set[str] = set()
    for row in rows:
        spell = re.sub(r"[^A-Za-z]", "", row["en"]).upper()
        if 6 <= len(spell) <= 9 and spell not in seen:
            seen.add(spell)
            candidates.append(spell)
    if len(candidates) < 80:
        return candidates
    step = len(candidates) / 100
    out: list[str] = []
    used: set[str] = set()
    for i in range(100):
        word = candidates[min(len(candidates) - 1, int(i * step))]
        if word not in used:
            used.add(word)
            out.append(word)
    return out


def values_sql(rows: list[dict], kind: str) -> str:
    chunks = []
    for row in rows:
        en = sql_escape(row["en"])
        fr = sql_escape(row["fr"])
        ar = sql_escape(row["ar"])
        if kind == "vocab":
            chunks.append(f"  ('{en}', '{fr}', '{ar}', {row['diff']}, '{row['cat']}')")
        else:
            emoji = sql_escape(row["emoji"])
            chunks.append(f"  ('{en}', '{fr}', '{emoji}', '{ar}')")
    return ",\n".join(chunks)


def main() -> None:
    rows = parse()
    if len(rows) < 1000:
        raise SystemExit(f"only {len(rows)} unique new words")
    rows = rows[:1000]
    assign_difficulty(rows)
    clash = clash_words(rows)

    sql = f"""-- Replace Play cards + Clash dictionary with 1000 new classroom words.
-- Isolated from live-room points and from all pro_* tables.

truncate table public.efaa_vocabulary restart identity;
truncate table public.efaa_vocabulary_emojis restart identity;

insert into public.efaa_vocabulary (word_en, translation_fr, translation_ar, difficulty_index, category)
values
{values_sql(rows, "vocab")};

insert into public.efaa_vocabulary_emojis (word_en, translation_fr, emoji, translation_ar)
values
{values_sql(rows, "emoji")};
"""
    out_sql = ROOT / "supabase" / "migrations" / "029_efaa_thousand_words.sql"
    out_sql.write_text(sql, encoding="utf-8")
    (ROOT / "scripts" / "thousand_clash.json").write_text(json.dumps(clash, indent=2), encoding="utf-8")
    print(f"words={len(rows)} clash={len(clash)} sql={out_sql} bytes={out_sql.stat().st_size}")
    cats: dict[str, int] = {}
    for row in rows:
        cats[row["cat"]] = cats.get(row["cat"], 0) + 1
    print("categories", cats)
    diffs = [row["diff"] for row in rows]
    print("diff", min(diffs), max(diffs))


if __name__ == "__main__":
    main()
