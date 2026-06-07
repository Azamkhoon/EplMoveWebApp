export type Lang = "en" | "ru" | "uz";

export const LANGUAGES: {
  code: Lang;
  label: string;
  native: string;
  flag: string;
}[] = [
  { code: "en", label: "English", native: "English", flag: "🇬🇧" },
  { code: "ru", label: "Russian", native: "Русский", flag: "🇷🇺" },
  { code: "uz", label: "Uzbek", native: "Oʻzbekcha", flag: "🇺🇿" },
];

type Dict = Record<string, string>;

const en: Dict = {
  "brand.portal": "Shipper Portal",

  "nav.operations": "Operations",
  "nav.dashboard": "Dashboard",
  "nav.shipments": "Shipments",
  "nav.marketplace": "Marketplace",
  "nav.liveTracking": "Live Tracking",
  "nav.documents": "Documents",
  "nav.tracking": "Tracking",
  "nav.quotation": "Quotation",
  "nav.loadCalculator": "Load Calculator",
  "nav.support": "Support",
  "nav.settings": "Settings",
  "nav.collapse": "Collapse",

  "topbar.search": "Search shipments, refs, lanes…",
  "topbar.newShipment": "New Shipment",
  "topbar.notifications": "Notifications",
  "topbar.language": "Language",

  "page.dashboard.title": "Dashboard",
  "page.dashboard.subtitle": "Operations overview & live load positions",
  "page.shipments.title": "Shipments",
  "page.shipments.subtitle": "Manage posted, draft and in-transit loads",
  "page.tracking.title": "Tracking",
  "page.tracking.subtitle": "Real-time shipment visibility",
  "page.quotation.title": "Quotation",
  "page.quotation.subtitle": "Request and compare carrier rates",
  "page.loadCalculator.title": "Load Calculator",
  "page.loadCalculator.subtitle": "Optimize container & truck utilization",

  "genius.title": "EPL Genius",
  "genius.subtitle": "AI logistics assistant",
  "genius.online": "Online",
  "genius.greeting":
    "Hi! I'm EPL Genius — your AI logistics assistant. Ask me about Incoterms, customs, container & equipment types, transit times, and more.",
  "genius.placeholder": "Ask anything about logistics…",
  "genius.searching": "Searching the web…",
  "genius.sources": "Sources",
  "genius.suggestionsTitle": "Try asking",
  "genius.disclaimer": "AI answers may be imperfect — verify critical details.",
  "genius.open": "Ask EPL Genius",

  "loadcalc.equipment": "Equipment",
  "loadcalc.equipmentSub": "Choose a container, trailer or wagon",
  "loadcalc.containers": "Containers",
  "loadcalc.trailers": "Road trailers",
  "loadcalc.wagons": "Rail wagons",
  "loadcalc.containersNeeded": "Containers needed",
  "loadcalc.trailersNeeded": "Trailers needed",
  "loadcalc.wagonsNeeded": "Wagons needed",
  "loadcalc.totalPieces": "Total pieces",
};

const ru: Dict = {
  "brand.portal": "Портал грузоотправителя",

  "nav.operations": "Операции",
  "nav.dashboard": "Панель управления",
  "nav.shipments": "Грузы",
  "nav.marketplace": "Маркетплейс",
  "nav.liveTracking": "Отслеживание в реальном времени",
  "nav.documents": "Документы",
  "nav.tracking": "Отслеживание",
  "nav.quotation": "Котировки",
  "nav.loadCalculator": "Калькулятор загрузки",
  "nav.support": "Поддержка",
  "nav.settings": "Настройки",
  "nav.collapse": "Свернуть",

  "topbar.search": "Поиск грузов, номеров, маршрутов…",
  "topbar.newShipment": "Новый груз",
  "topbar.notifications": "Уведомления",
  "topbar.language": "Язык",

  "page.dashboard.title": "Панель управления",
  "page.dashboard.subtitle": "Обзор операций и позиции грузов",
  "page.shipments.title": "Грузы",
  "page.shipments.subtitle": "Размещённые, черновики и грузы в пути",
  "page.tracking.title": "Отслеживание",
  "page.tracking.subtitle": "Видимость грузов в реальном времени",
  "page.quotation.title": "Котировки",
  "page.quotation.subtitle": "Запрос и сравнение ставок перевозчиков",
  "page.loadCalculator.title": "Калькулятор загрузки",
  "page.loadCalculator.subtitle": "Оптимизация загрузки контейнеров и фур",

  "genius.title": "EPL Genius",
  "genius.subtitle": "ИИ-помощник по логистике",
  "genius.online": "В сети",
  "genius.greeting":
    "Привет! Я EPL Genius — ваш ИИ-помощник по логистике. Спросите меня об Инкотермс, таможне, типах контейнеров и оборудования, сроках доставки и не только.",
  "genius.placeholder": "Спросите что-нибудь о логистике…",
  "genius.searching": "Поиск в интернете…",
  "genius.sources": "Источники",
  "genius.suggestionsTitle": "Примеры вопросов",
  "genius.disclaimer":
    "Ответы ИИ могут быть неточными — проверяйте важные детали.",
  "genius.open": "Спросить EPL Genius",

  "loadcalc.equipment": "Оборудование",
  "loadcalc.equipmentSub": "Выберите контейнер, трейлер или вагон",
  "loadcalc.containers": "Контейнеры",
  "loadcalc.trailers": "Автоприцепы",
  "loadcalc.wagons": "Ж/д вагоны",
  "loadcalc.containersNeeded": "Требуется контейнеров",
  "loadcalc.trailersNeeded": "Требуется прицепов",
  "loadcalc.wagonsNeeded": "Требуется вагонов",
  "loadcalc.totalPieces": "Всего мест",
};

const uz: Dict = {
  "brand.portal": "Yuk joʻnatuvchi portali",

  "nav.operations": "Operatsiyalar",
  "nav.dashboard": "Boshqaruv paneli",
  "nav.shipments": "Yuklar",
  "nav.marketplace": "Marketpleys",
  "nav.liveTracking": "Jonli kuzatuv",
  "nav.documents": "Hujjatlar",
  "nav.tracking": "Kuzatuv",
  "nav.quotation": "Narx soʻrovi",
  "nav.loadCalculator": "Yuklash kalkulyatori",
  "nav.support": "Yordam",
  "nav.settings": "Sozlamalar",
  "nav.collapse": "Yigʻish",

  "topbar.search": "Yuk, raqam yoki yoʻnalish qidirish…",
  "topbar.newShipment": "Yangi yuk",
  "topbar.notifications": "Bildirishnomalar",
  "topbar.language": "Til",

  "page.dashboard.title": "Boshqaruv paneli",
  "page.dashboard.subtitle": "Operatsiyalar sharhi va yuk joylashuvi",
  "page.shipments.title": "Yuklar",
  "page.shipments.subtitle": "Joylashtirilgan, qoralama va yoʻldagi yuklar",
  "page.tracking.title": "Kuzatuv",
  "page.tracking.subtitle": "Yuklarni real vaqtda kuzatish",
  "page.quotation.title": "Narx soʻrovi",
  "page.quotation.subtitle": "Tashuvchi narxlarini soʻrash va taqqoslash",
  "page.loadCalculator.title": "Yuklash kalkulyatori",
  "page.loadCalculator.subtitle":
    "Konteyner va yuk mashinasi yuklanishini optimallashtirish",

  "genius.title": "EPL Genius",
  "genius.subtitle": "Logistika boʻyicha AI yordamchi",
  "genius.online": "Onlayn",
  "genius.greeting":
    "Salom! Men EPL Genius — logistika boʻyicha AI yordamchingizman. Inkoterms, bojxona, konteyner va jihoz turlari, yetkazib berish muddatlari va boshqalar haqida soʻrang.",
  "genius.placeholder": "Logistika haqida xohlagan narsani soʻrang…",
  "genius.searching": "Internetda qidirilmoqda…",
  "genius.sources": "Manbalar",
  "genius.suggestionsTitle": "Namuna savollar",
  "genius.disclaimer":
    "AI javoblari xato boʻlishi mumkin — muhim maʼlumotlarni tekshiring.",
  "genius.open": "EPL Genius'dan soʻrash",

  "loadcalc.equipment": "Jihozlar",
  "loadcalc.equipmentSub": "Konteyner, treyler yoki vagonni tanlang",
  "loadcalc.containers": "Konteynerlar",
  "loadcalc.trailers": "Avtotreylerlar",
  "loadcalc.wagons": "Temir yoʻl vagonlari",
  "loadcalc.containersNeeded": "Kerakli konteynerlar",
  "loadcalc.trailersNeeded": "Kerakli treylerlar",
  "loadcalc.wagonsNeeded": "Kerakli vagonlar",
  "loadcalc.totalPieces": "Jami joylar",
};

export const TRANSLATIONS: Record<Lang, Dict> = { en, ru, uz };
