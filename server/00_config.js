/**
 * ════════════════════════════════════════════════════════════════════════════
 *  00_config.js — centrální konfigurace aplikace
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Jediné místo, kde jsou konstanty aplikace. Nic z tohoto souboru se nemění
 * za běhu — hodnoty, které si uživatel může nastavit (název aplikace, notifikace,
 * svátky), žijí v listu `_settings` v databázi, ne tady.
 *
 * Proč konstanty v kódu a ne v tabulce:
 * Whitelisty (role, oprávnění, klíče nastavení, ikony typů událostí) jsou
 * bezpečnostní prvek. V kódu jsou verzované, projdou revizí a nikdo je
 * omylem nerozbije editací tabulky. Samotné typy událostí jsou od v0.1.33
 * výjimka — plná správa v Nastavení (viz DEFAULT_EVENT_TYPES níže a
 * SPECIFIKACE.md kapitola 9.5), to je vědomý ústupek z tohoto pravidla,
 * ne přehlédnutí.
 */

/** Základní identita a vzhled aplikace. */
const CONFIG = {
  /** Výchozí název — wizard ho předvyplní, uživatel může změnit. */
  defaultAppName: 'Plánovací kalendář',
  defaultAppSubtitle: 'Sdílený plánovací kalendář',

  /**
   * Verze aplikace — zobrazuje se ve footeru a na úvodním splash screenu.
   * POZOR: needituj ručně. Zapisuje ji skript tools/release.ps1 zároveň
   * do AAA_VERZE.html a CHANGELOG.md, aby všechna tři místa souhlasila.
   *
   * v0.0.0 / „nevydáno" znamená, že zatím neproběhlo žádné vydání —
   * první spuštění release.ps1 hodnoty přepíše.
   */
  version: 'v0.8.1',
  releaseDate: '5.9.2026',

  /**
   * Font, kterým se formátují listy databáze. Musí to být PŘESNÝ název tak,
   * jak se píše v seznamu fontů Google Sheets — setFontFamily() neexistující
   * název tiše ignoruje a list zůstane v Arialu bez jakékoliv chybové hlášky.
   * Kontrola: otevřít vzniklou databázi a podívat se na seznam fontů.
   * Oprava bez zakládání databáze znovu: TOOLS_prefontujDb() v 90_tools.js.
   */
  sheetFont: 'Lidl Font Cond Pro',

  /** Firemní barvy — v CSS jsou stejné hodnoty jako proměnné (ui/styles.html). */
  theme: {
    blue: '#0050aa',
    darkBlue: '#002466',
    lightBlue: '#008cd2',
    yellow: '#fff000',
    red: '#e60a14',
  },

  /**
   * Jediná povolená e-mailová doména pro nové uživatele — ověřuje se na
   * serveru v apiSaveUser. Pojistka proti překlepu při zadávání, ne
   * bezpečnostní hranice sama o sobě (o přístupu stejně rozhoduje výhradně
   * list `_users`, ne doména).
   */
  allowedEmailDomain: 'lidl.cz',
};

/**
 * Klíče ve Script Properties.
 * DB_ID je jediná vazba mezi skriptem a jeho databází — dokud neexistuje,
 * aplikace se považuje za neinicializovanou a spouští wizard.
 */
const PROPS = {
  DB_ID: 'DB_SPREADSHEET_ID',
  SETUP_AT: 'SETUP_COMPLETED_AT',
};

/** Systémové role. Vyšší úroveň v ROLE_LEVEL = širší oprávnění. */
const ROLES = {
  SUPERADMIN: 'SUPERADMIN',
  ADMIN: 'ADMIN',
  USER: 'USER',
};

const ROLE_LEVEL = {
  SUPERADMIN: 3,
  ADMIN: 2,
  USER: 1,
};

/**
 * Druhá osa oprávnění — uplatní se jen u role USER a rozhoduje,
 * jestli uživatel smí do kalendáře zapisovat, nebo ho jen čte.
 */
const PERMISSIONS = {
  EDITOR: 'EDITOR',
  VIEWER: 'VIEWER',
};

/** Názvy listů v databázi. Podtržítko = systémový list. */
const SHEETS = {
  USERS: '_users',
  SETTINGS: '_settings',
  AUDIT: '_audit_log',
  EVENTS: 'events',
  EVENT_COMMENTS: 'event_comments',
  POSITIONS: '_positions',
  EVENT_TYPES: '_event_types',
  DEPARTMENTS: '_departments',
  STORES: '_stores',
  LOGISTIC_CENTERS: '_logistic_centers',
  STORE_CLOSURES: '_store_closures',
  IMPORT_LOG: '_import_log',
  HOLIDAYS: '_holidays',
  EVENT_TEMPLATES: '_event_templates',
};

/**
 * Klíče oprávnění, se kterými pracuje guard_ v 30_auth.js.
 * Záměrně jen čtyři — pro šest uživatelů nemá smysl konfigurovatelná matice rolí.
 */
const PERM_KEYS = {
  CALENDAR_READ: 'calendar_read',
  CALENDAR_WRITE: 'calendar_write',
  USERS_MANAGE: 'users_manage',
  SETTINGS_MANAGE: 'settings_manage',
};

/**
 * Akce z auditního logu (`_audit_log`), které se počítají jako "oznámení"
 * (viz apiGetBootstrap/zvoneček v kalendáři). Whitelist, ne "všechno kromě"
 * — třeba změny uživatelů (user.*) se sem záměrně nedávají, oznámení mají
 * nosit jen to, co se přímo týká sdíleného kalendáře.
 *
 * `import.sync` je jediná výjimka mimo kalendář — synchronizace filiálek
 * se týká všech (viz SPECIFIKACE.md 9.6), proto má i vlastní klik-through
 * na Log importu místo na událost (viz App.renderNotifyItem).
 */
const NOTIFY_ACTIONS = ['event.create', 'event.update', 'event.delete', 'comment.create', 'comment.delete', 'import.sync'];

/**
 * Typy událostí — od v0.1.33 plně spravované v Nastavení (list `_event_types`
 * v databázi), ne napevno v kódu. Tohle je jen VÝCHOZÍ obsah, kterým se
 * tabulka jednorázově naseje, když je prázdná (viz _ensureEventTypesSeeded_
 * v 50_api.js) — typicky při první instalaci, nebo u už běžící appky při
 * prvním nasazení téhle verze. Klíče („default", „meeting"…) se použijí
 * jako ID řádků, ať existující události v `events.type` dál sedí.
 *
 * Ikony jsou názvy Phosphor Icons bez prefixu "ph-", vybírají se jen
 * z whitelistu EVENT_TYPE_ICONS (viz níže) — nikdy volný text. `color`
 * a `bgColor` jsou DVĚ NEZÁVISLÉ barvy (ikona/text, resp. podklad) — obě
 * jen doplňkové odlišení chipů v mřížce, nikdy jediný nositel významu,
 * ten vždy nese i text (bezpečnostní checklist v SPECIFIKACE.md, bod 13).
 *
 * POZOR: „default" je jediný typ, který nejde smazat (viz apiDeleteEventType)
 * — je to záchranná varianta pro události, jejichž typ mezitím zmizel
 * (viz apiGetEvents), takže musí existovat vždycky.
 */
const DEFAULT_EVENT_TYPES = [
  { id: 'default', label: 'Běžné', icon: 'chat-circle', color: '#5e6e8a', bgColor: '#eef0f3' },
  { id: 'meeting', label: 'Schůzka', icon: 'users-three', color: '#0050aa', bgColor: '#e6eef8' },
  { id: 'trip', label: 'Služební cesta', icon: 'airplane-tilt', color: '#008cd2', bgColor: '#e5f4fb' },
  { id: 'important', label: 'Důležité', icon: 'warning', color: '#e60a14', bgColor: '#fce6e7' },
  { id: 'deadline', label: 'Deadline', icon: 'alarm', color: '#b45309', bgColor: '#f7ece1' },
  { id: 'homeoffice', label: 'Home Office', icon: 'house', color: '#16a34a', bgColor: '#e5f5ea' },
  { id: 'party', label: 'Oslava / Teambuilding', icon: 'confetti', color: '#c026d3', bgColor: '#f7e5f9' },
];

/**
 * Whitelist ikon nabízených při vytváření/úpravě typu události (viz
 * apiSaveEventType). Volný text by šel zneužít k vložení neexistujícího
 * názvu (ikona by nikde nešla vidět) nebo něčeho mimo Phosphor sadu —
 * proto výběr jen z předem prověřeného seznamu, stejný princip jako
 * u EVENT_TYPES dřív. Názvy bez prefixu "ph-" (ten si doplňuje UI).
 */
const EVENT_TYPE_ICONS = [
  'chat-circle', 'users-three', 'airplane-tilt', 'warning', 'alarm', 'house',
  'confetti', 'calendar-check', 'briefcase', 'phone-call', 'video-camera',
  'coffee', 'graduation-cap', 'heart', 'star', 'flag', 'bell', 'gear',
  'wrench', 'book-open', 'medal', 'target', 'umbrella', 'gift', 'first-aid-kit',
  'car', 'clock-user', 'chart-line-up',
];

/**
 * Státní svátky ČR s pevným datem (den v měsíci se rok od roku nemění) —
 * viz zákon č. 245/2000 Sb. Pohyblivé svátky (Velký pátek, Velikonoční
 * pondělí, odvozené od data Velikonoc) se dopočítávají zvlášť, viz
 * _czechHolidaysForYear_ v 50_api.js.
 *
 * POZOR: na rozdíl od ostatních konstant v tomto souboru tohle NENÍ zdroj
 * pravdy za běhu appky — je to jen VÝCHOZÍ sada, kterou appka pro nový
 * rok jednou naseje do editovatelné databázové tabulky `_holidays`
 * (viz _ensureHolidaysSeededForYear_/apiGetHolidays v 50_api.js).
 * Od nasetí dál je seznam svátků plně editovatelný v Nastavení
 * (SPECIFIKACE.md kapitola 9.7) — změna zde tedy neovlivní roky, které
 * appka už jednou naplnila, jen nově zaseté roky v budoucnu.
 */
const CZECH_FIXED_HOLIDAYS = [
  { month: 1, day: 1, name: 'Den obnovy samostatného českého státu' },
  { month: 5, day: 1, name: 'Svátek práce' },
  { month: 5, day: 8, name: 'Den vítězství' },
  { month: 7, day: 5, name: 'Den slovanských věrozvěstů Cyrila a Metoděje' },
  { month: 7, day: 6, name: 'Den upálení mistra Jana Husa' },
  { month: 9, day: 28, name: 'Den české státnosti' },
  { month: 10, day: 28, name: 'Den vzniku samostatného československého státu' },
  { month: 11, day: 17, name: 'Den boje za svobodu a demokracii' },
  { month: 12, day: 24, name: 'Štědrý den' },
  { month: 12, day: 25, name: '1. svátek vánoční' },
  { month: 12, day: 26, name: '2. svátek vánoční' },
];

/**
 * Limity vstupů. Vynucují se na serveru — hodnoty v UI jsou jen pohodlí
 * pro uživatele, nikoliv ochrana.
 */
const LIMITS = {
  APP_NAME_MAX: 60,
  APP_SUBTITLE_MAX: 120,
  NAME_MAX: 60,
  TITLE_MAX: 120,
  DESCRIPTION_MAX: 2000,
  /** Nejdelší povolená událost ve dnech — pojistka proti záznamu, který by zaplavil celou mřížku. */
  EVENT_MAX_DAYS: 31,
  /** Komentář k události — chatová zpráva, ne článek. */
  COMMENT_MAX: 500,
  /**
   * Organizační údaje uživatele (Umístění/Oddělení/Pozice) — validace na
   * serveru je pro všechny tři stejná (prostý text do tohoto limitu), i když
   * Oddělení a Pozice appka nabízí jako výběr ze seznamu v Nastavení
   * (`_departments`/`_positions`) — uložená hodnota je ale pořád jen text,
   * žádná cizí klíč vazba (viz komentář u `_users` v 20_db.js). Umístění
   * zůstává zatím čistě volný text bez seznamu.
   */
  ORG_FIELD_MAX: 60,
  /** Nejvíc oznámení, které apiGetBootstrap vrátí najednou — pojistka proti obřímu seznamu (např. hodně starý last_visit_at). */
  NOTIFY_MAX_ITEMS: 30,
  /** Název pracovní pozice (Nastavení). */
  POSITION_NAME_MAX: 60,
  /** Název oddělení (Nastavení). */
  DEPARTMENT_NAME_MAX: 60,
  /** Popisek typu události (Nastavení). */
  EVENT_TYPE_LABEL_MAX: 40,
  /** URL/ID složky pro import dat filiálek (Nastavení) — URL bývá dlouhá. */
  IMPORT_FOLDER_MAX: 500,
  /** Hledaný výraz v názvu souboru při importu dat filiálek. */
  IMPORT_SEARCH_MAX: 100,
  /** Zkratka LC (Filiálky/LC v menu) — krátká, jen pro přehlednost tabulky. */
  LC_ZKRATKA_MAX: 10,
  /** Číslo LC (Filiálky/LC v menu) — zadává ručně SUPERADMIN. */
  LC_CISLO_MAX: 20,
  /** Název svátku (Nastavení → Státní svátky ČR) — pár nejdelších zákonných názvů má přes 40 znaků, proto víc než u typu události. */
  HOLIDAY_NAME_MAX: 100,
  /**
   * Nejvíc výskytů, které smí vygenerovat jedno založení opakující se
   * události (viz apiSaveEvent/_recurrenceCount_) — pojistka proti tomu,
   * aby překlep v "Do data" (např. o pár desítek let dál) nevygeneroval
   * tisíce řádků najednou. 52 pokrývá i týdenní opakování na celý rok.
   */
  RECURRENCE_MAX_COUNT: 52,
  /** Název šablony události (Nastavení → Šablony událostí) — zároveň se použije jako předvyplněný název nové události. */
  EVENT_TEMPLATE_LABEL_MAX: 120,
};

/**
 * Výchozí hodnoty uživatelských nastavení (list `_settings`).
 * Zároveň slouží jako whitelist klíčů — apiSaveSettings nesmí zapsat nic,
 * co tady není, aby klient nemohl podstrčit libovolný klíč.
 */
const DEFAULT_SETTINGS = {
  appName: CONFIG.defaultAppName,
  appSubtitle: CONFIG.defaultAppSubtitle,
  notifyEnabled: false,
  notifyEvents: '',
  notifyRecipients: 'all',
  holidaysEnabled: true,
  pastEditAdminOnly: true,
  // Naposledy odsouhlasená konfigurace importu dat filiálek (viz
  // 60_import.js) — ukládá se až při úspěšné synchronizaci, ne při pouhém
  // hledání, ať noční trigger vždycky navazuje na ověřenou volbu.
  importFolderId: '',
  importSearchTerm: '',
  // Jestli má běžet noční automatická synchronizace a v kterou hodinu
  // (0-23, spustí se někdy v tu hodinu, přesnou minutu si řídí Apps
  // Script sám) — appka podle nich řídí skutečný trigger (viz
  // _importSetTrigger_ v 60_import.js), zdroj pravdy pro "běží/neběží"
  // je ale vždycky živý dotaz na ScriptApp, ne tahle uložená hodnota
  // (ta by mohla zůstat neaktuální, kdyby trigger zrušil někdo jinudy).
  importTriggerEnabled: false,
  importTriggerHour: 6,
  // Roky, pro které už appka jednou naplnila výchozí státní svátky (viz
  // _ensureHolidaysSeededForYear_ v 50_api.js), čárkou oddělené (např.
  // "2025,2026") — interní evidence, žádná záložka Nastavení ji přímo
  // nenabízí k úpravě. Svátky jsou od téhle chvíle plně editovatelné
  // (list _holidays), tenhle klíč jen brání tomu, aby appka výchozí
  // sadu znovu podstrčila zpátky, kdyby uživatel pro daný rok smazal
  // úplně všechny záznamy.
  holidaysSeededYears: '',
};

/** Časová zóna aplikace. Musí odpovídat timeZone v appsscript.json. */
const TIMEZONE = 'Europe/Prague';
