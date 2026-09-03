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
 * Whitelisty (role, oprávnění, typy událostí) jsou bezpečnostní prvek. V kódu
 * jsou verzované, projdou revizí a nikdo je omylem nerozbije editací tabulky.
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
  version: 'v0.1.31',
  releaseDate: '3.9.2026',

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
 */
const NOTIFY_ACTIONS = ['event.create', 'event.update', 'event.delete', 'comment.create', 'comment.delete'];

/**
 * Typy událostí. Klíč se ukládá do databáze, popisek/ikona/barva slouží jen
 * k zobrazení. Cokoliv mimo tento seznam server odmítne — proto whitelist.
 * Ikony jsou názvy Phosphor Icons bez prefixu "ph-". Barva je jen doplňkové
 * odlišení chipů v mřížce — nikdy jediný nositel významu, ten vždy nese
 * i text (bezpečnostní checklist v SPECIFIKACE.md, bod 13).
 */
const EVENT_TYPES = {
  default: { label: 'Běžné', icon: 'chat-circle', color: '#5e6e8a' },
  meeting: { label: 'Schůzka', icon: 'users-three', color: '#0050aa' },
  trip: { label: 'Služební cesta', icon: 'airplane-tilt', color: '#008cd2' },
  important: { label: 'Důležité', icon: 'warning', color: '#e60a14' },
  deadline: { label: 'Deadline', icon: 'alarm', color: '#b45309' },
  homeoffice: { label: 'Home Office', icon: 'house', color: '#16a34a' },
  party: { label: 'Oslava / Teambuilding', icon: 'confetti', color: '#c026d3' },
};

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
  /** Organizační údaje uživatele (Umístění/Oddělení/Pozice) — zatím volný text. */
  ORG_FIELD_MAX: 60,
  /** Nejvíc oznámení, které apiGetBootstrap vrátí najednou — pojistka proti obřímu seznamu (např. hodně starý last_visit_at). */
  NOTIFY_MAX_ITEMS: 30,
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
};

/** Časová zóna aplikace. Musí odpovídat timeZone v appsscript.json. */
const TIMEZONE = 'Europe/Prague';
