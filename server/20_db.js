/**
 * ════════════════════════════════════════════════════════════════════════════
 *  20_db.js — repository vrstva nad Google Sheets
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Model: tabulka = list, první řádek = hlavičky podle DB_SCHEMA, každý další
 * řádek = jeden záznam. Čtení i zápisy jdou dávkově (getValues / setValues),
 * zápisy pod zámkem.
 *
 * Vědomé rozhodnutí: ŽÁDNÁ cache mezi běhy skriptu (CacheService).
 * Aplikaci používá ~6 lidí, takže úspora by byla zanedbatelná, zatímco riziko
 * zastaralých dat po zápisu je reálné. Cachujeme jen v rámci jednoho běhu
 * skriptu, kde je konzistence zaručená — a i tu při každém zápisu zahazujeme.
 */

/**
 * Schéma databáze. Rozšíření = přidat sloupec sem; dbEnsureSchema_() chybějící
 * listy a sloupce doplní a NIKDY nic nemaže, takže funguje i jako migrace.
 *
 * Pořadí sloupců je závazné — odpovídá pořadí v listu.
 */
const DB_SCHEMA = {
  _users: [
    'id', 'email', 'firstName', 'lastName', 'role', 'permission', 'active',
    'created_at', 'created_by', 'updated_at', 'last_visit_at',
    // Organizační údaje (viz apiSaveUser). Oddělení/Pozice se vybírají ze
    // seznamu spravovaného v Nastavení (_departments/_positions), uložená
    // hodnota je ale pořád jen text — žádná cizí klíč vazba, smazání
    // položky ze seznamu proto uživatele, kteří ji mají vyplněnou, nijak
    // nepostihne (viz apiDeleteDepartment/apiDeletePosition).
    // Umístění se později nahradí výběrem z importovaného seznamu
    // logistických center, zatím je to volný text.
    'location', 'department', 'position',
  ],
  _settings: ['key', 'value', 'updated_at', 'updated_by'],
  // entity_id = id záznamu, ke kterému se akce vztahuje (u komentářů id
  // UDÁLOSTI, ne komentáře) — proklik ze zvonečku s oznámeními vždy vede
  // na konkrétní událost, viz audit_() v 10_util.js a apiGetBootstrap.
  _audit_log: ['timestamp', 'user', 'action', 'detail', 'entity_id'],
  events: [
    'id', 'start', 'end', 'all_day', 'type', 'title', 'description',
    'owner_email', 'created_at', 'created_by', 'updated_at', 'updated_by',
  ],
  event_comments: ['id', 'event_id', 'author_email', 'text', 'created_at'],
  // Pracovní pozice pro výběr ve formuláři uživatele (Nastavení) — jen
  // název, žádné vazby na ostatní tabulky (viz apiSavePosition/apiDeletePosition).
  _positions: ['id', 'name', 'created_at', 'created_by', 'updated_at', 'updated_by'],
  // Oddělení pro výběr ve formuláři uživatele (Nastavení) — stejný vzor
  // jako _positions (viz apiSaveDepartment/apiDeleteDepartment).
  _departments: ['id', 'name', 'created_at', 'created_by', 'updated_at', 'updated_by'],
  // Typy událostí (Nastavení) — id je u výchozích 7 stabilní slug
  // (viz DEFAULT_EVENT_TYPES), u nově založených UUID; obojí je jen
  // opaque klíč uložený v events.type, appce na tom nezáleží.
  // color = barva ikony/textu, bg_color = barva podkladu (chip, ikona
  // v seznamech…) — dvě NEZÁVISLÉ barvy, viz apiSaveEventType.
  _event_types: ['id', 'label', 'icon', 'color', 'bg_color', 'created_at', 'created_by', 'updated_at', 'updated_by'],

  // ── Import dat filiálek (viz 60_import.js) ───────────────────────────
  // Zrcadlo listů Organizace_Detail/Zavrene_Openings ve zdrojovém souboru
  // na Disku — appka je jen ČTE a jednou denně přepisuje, needituje se nic
  // ručně kromě "active" (viz apiSetStoreActive) a _logistic_centers.
  // cislo/zkratka/active. Proto žádné created_at/created_by u _stores/
  // _store_closures — "kdo založil" tu nedává smysl, vždycky je to import.
  //
  // id u _stores i _store_closures = sloupec "Číslo" ve zdroji (číslo
  // filiálky) — díky tomu funguje beze změny obecná dbFindById_/dbUpdate_/
  // dbDelete_ i pro tyhle tabulky. "kod" = sloupec "ID" ve zdroji
  // (CZ-0100…), jen pro zobrazení, appka podle něj nic nepáruje.
  // "active" prázdné (starší řádky založené před přidáním sloupce, i každý
  // čerstvě naimportovaný) = aktivní, viz _storeIsActive_ v 60_import.js —
  // synchronizace ho při refreshi zachovává stejně jako u LC.
  _stores: [
    'id', 'kod', 'nazev', 'lc', 'active',
    'telefon_prodejny', 'vt', 'telefon_vt', 'rm', 'telefon_rm', 'zastupce_rm', 'telefon_zastupce',
    'ulice', 'mesto', 'psc',
    'po_otevreno', 'po_zavreno', 'ut_otevreno', 'ut_zavreno', 'st_otevreno', 'st_zavreno',
    'ct_otevreno', 'ct_zavreno', 'pa_otevreno', 'pa_zavreno', 'so_otevreno', 'so_zavreno',
    'ne_otevreno', 'ne_zavreno',
    'updated_at',
  ],
  // LC se odvozují ze sloupce "LC" u filiálek — "nazev" je tedy ze zdroje
  // (needituje se), "cislo"/"zkratka"/"active" zadává ručně SUPERADMIN
  // v appce (viz apiSaveLogisticCenter/apiSetLogisticCenterActive) a
  // synchronizace je při refreshi zachovává (viz _importSyncLogisticCenters_
  // — existující řádek se přebírá celý, ne jen název). "active" prázdné
  // (starší řádky založené před přidáním sloupce) = aktivní, viz
  // _lcIsActive_ — chybějící hodnota nesmí LC "ztratit" ze seznamu.
  _logistic_centers: ['id', 'cislo', 'zkratka', 'nazev', 'active', 'created_at', 'created_by', 'updated_at', 'updated_by'],
  // Snímek "co je teď zavřené" — při každém syncu se celá tabulka nahradí
  // (ne upsert), staré uzavírky tak zmizí samy, jakmile je zdroj přestane
  // posílat (viz _importSyncClosures_).
  _store_closures: ['id', 'nazev', 'od', 'do', 'celkem_dni', 'updated_at'],
  // Trvalá historie synchronizací (Log importu v Nastavení) — append-only,
  // žádný řádek se needituje ani nemaže, proto jen created_at/created_by
  // (kdo/kdy spustil sync), ne updated_*. `summary` je krátký text pro
  // zvoneček/audit log (viz audit_), `detail` delší itemizovaný výpis změn
  // pro rozkliknutí přímo v Logu importu.
  _import_log: [
    'id', 'file_name',
    'stores_added', 'stores_changed', 'stores_removed',
    'lc_added', 'lc_removed',
    'closures_added', 'closures_removed',
    'summary', 'detail',
    'created_at', 'created_by',
  ],
  // Státní svátky ČR (Nastavení → Státní svátky ČR) — na rozdíl od dřívější
  // čistě dopočítané podoby teď plně editovatelná tabulka. Řádky pro nový
  // rok appka jednou naseje z CZECH_FIXED_HOLIDAYS/_czechHolidaysForYear_
  // (viz _ensureHolidaysSeededForYear_ v 50_api.js), od té chvíle jsou to
  // obyčejná data jako kterákoli jiná — needituje/nemaže se nic natvrdo.
  _holidays: ['id', 'date', 'name', 'created_at', 'created_by', 'updated_at', 'updated_by'],
};

/**
 * Sloupce, které MUSÍ v listu zůstat textem (formát buňky "@").
 *
 * Proč: Google Sheets tiše převede řetězec, který vypadá jako datum
 * (např. "2026-09-01T08:30"), na typ Date. Takovou hodnotu pak
 * google.script.run serializuje nespolehlivě a klient dostane nepoužitelná
 * data. Stejná chyba se reálně vyskytla v PMS plánovači v Planung Dashboardu.
 *
 * Formát se nastavuje na celý sloupec při zakládání i při každé kontrole
 * schématu, takže platí i pro řádky, které teprve vzniknou.
 */
const TEXT_COLUMNS = {
  _users: ['created_at', 'updated_at', 'last_visit_at'],
  _settings: ['updated_at'],
  _audit_log: ['timestamp'],
  events: ['start', 'end', 'created_at', 'updated_at'],
  event_comments: ['created_at'],
  _positions: ['created_at', 'updated_at'],
  _event_types: ['created_at', 'updated_at'],
  _departments: ['created_at', 'updated_at'],
  // otevírací doba (např. "7:00") i updated_at — obojí by Sheets rádo
  // převedlo na čas/datum, viz komentář výše.
  _stores: [
    'po_otevreno', 'po_zavreno', 'ut_otevreno', 'ut_zavreno', 'st_otevreno', 'st_zavreno',
    'ct_otevreno', 'ct_zavreno', 'pa_otevreno', 'pa_zavreno', 'so_otevreno', 'so_zavreno',
    'ne_otevreno', 'ne_zavreno', 'updated_at',
  ],
  _logistic_centers: ['created_at', 'updated_at'],
  _store_closures: ['od', 'do', 'updated_at'],
  _import_log: ['created_at'],
  _holidays: ['date', 'created_at', 'updated_at'],
};

/**
 * Podmnožina TEXT_COLUMNS, kde na formátu ZÁLEŽÍ PRO LOGIKU (řazení,
 * porovnávání rozsahu) — ne jen pro zobrazení. Sem patří jen `events.start`
 * a `events.end`, protože apiGetEvents nad nimi dělá textové porovnání
 * rozsahu. Pokud takový sloupec i přes ochranu v dbRecordToRow_ přesto
 * obsahuje typ Date (např. řádek vznikl ještě předtím, než ochrana platila,
 * nebo ho někdo ručně přepsal přímo v Sheets), dbGetAll_ ho při čtení
 * převede zpět na očekávaný tvar `YYYY-MM-DDTHH:mm` — obrana do hloubky,
 * nespoléhat jen na to, že se do listu nikdy nic špatně nezapíše.
 */
const LOCAL_DATETIME_COLUMNS = {
  events: ['start', 'end'],
};

/** Handle na databázi pro aktuální běh skriptu (šetří opakované openById). */
let dbHandle_ = null;

/** Cache načtených tabulek v rámci jednoho běhu. Zápis ji zneplatní. */
let dbCache_ = {};

/** Příznak drženého zámku — umožňuje vnořená volání withLock_ bez zablokování. */
let dbLockHeld_ = false;

/* ══════════════════════════════════════════════════════════════════════════
   PŘÍSTUP K SPREADSHEETU
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Vrátí databázový spreadsheet. Pokud aplikace ještě není inicializovaná,
 * vyhodí srozumitelnou chybu — nikdy databázi nezakládá „samo od sebe".
 * Jediné místo, kde databáze vzniká, je setupInitialize() v 40_setup.js.
 */
function dbSpreadsheet_() {
  if (dbHandle_) return dbHandle_;

  const id = PropertiesService.getScriptProperties().getProperty(PROPS.DB_ID);
  if (!id) {
    throw userError_('Aplikace není inicializována. Spusťte úvodního průvodce.');
  }
  dbHandle_ = SpreadsheetApp.openById(id);
  return dbHandle_;
}

/**
 * Vrátí list dané tabulky. Samoopravné ve DVOU směrech — DB_SCHEMA se
 * v čase rozšiřuje (nové funkce = nové tabulky NEBO nové sloupce v už
 * existující tabulce), ale dbEnsureSchema_() se sama od sebe nespouští,
 * jen při wizardu nebo ručně přes TOOLS_zkontrolujSchema:
 *   1. tabulka úplně chybí → doplnit celou (viz historie: event_comments),
 *   2. tabulka existuje, ale hlavička neodpovídá aktuální DB_SCHEMA (typicky
 *      přibyly sloupce na konci) → doplnit chybějící sloupce, ne založit
 *      znovu.
 * Bez tohoto by nový sloupec přidaný do schématu zůstal v datech neviditelný,
 * dokud by si někdo nevzpomněl spustit nástroj ručně — přesně ta past, co se
 * reálně stala s tabulkou event_comments. Chyba padne, jen když list chybí
 * i po pokusu o opravu (typicky překlep v názvu tabulky).
 */
function dbSheet_(table) {
  const spreadsheet = dbSpreadsheet_();
  let sheet = spreadsheet.getSheetByName(table);

  if (!sheet || !_dbHeaderMatches_(sheet, table)) {
    dbEnsureSchema_(spreadsheet);
    sheet = spreadsheet.getSheetByName(table);
  }
  if (!sheet) {
    throw userError_('Tabulka „' + table + '" v databázi chybí. Kontaktujte správce.');
  }
  return sheet;
}

/** Odpovídá první řádek listu aktuálnímu schématu dané tabulky? */
function _dbHeaderMatches_(sheet, table) {
  const headers = DB_SCHEMA[table];
  const current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  return headers.every((header, i) => current[i] === header);
}

/**
 * Doplní chybějící listy a hlavičky podle DB_SCHEMA a nastaví textové sloupce.
 * Nic nemaže ani nepřepisuje data — je bezpečné to volat opakovaně.
 */
function dbEnsureSchema_(ss) {
  Object.keys(DB_SCHEMA).forEach((table) => {
    const headers = DB_SCHEMA[table];

    let sheet = ss.getSheetByName(table);
    if (!sheet) {
      sheet = ss.insertSheet(table);
      applySheetFont_(sheet);
    }

    // Hlavička se zapíše jen tehdy, když se liší — zbytečný setValues by
    // pokaždé měnil soubor a znehodnocoval historii revizí.
    const current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    const differs = headers.some((header, i) => current[i] !== header);
    if (differs) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground(CONFIG.theme.blue)
        .setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }

    dbEnsureTextColumns_(sheet, table, headers);
  });
}

/**
 * Nastaví formát "@" (prostý text) sloupcům vyjmenovaným v TEXT_COLUMNS.
 * Bez toho by Sheets převáděl datumové řetězce na typ Date — viz komentář
 * u TEXT_COLUMNS.
 */
function dbEnsureTextColumns_(sheet, table, headers) {
  const textColumns = TEXT_COLUMNS[table] || [];
  const rowCount = Math.max(sheet.getMaxRows() - 1, 1); // bez řádku hlavičky

  textColumns.forEach((columnName) => {
    const index = headers.indexOf(columnName);
    if (index === -1) return;
    sheet.getRange(2, index + 1, rowCount, 1).setNumberFormat('@');
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   ZÁMEK

   Apps Script může tentýž skript spustit paralelně pro víc uživatelů.
   Bez zámku by dva souběžné zápisy mohly přepsat jeden druhého (oba si
   přečtou stejný poslední řádek a oba na něj zapíšou).
   ══════════════════════════════════════════════════════════════════════════ */

/** Spustí fn pod zámkem skriptu. Vnořené volání zámek nebere podruhé. */
function withLock_(fn) {
  if (dbLockHeld_) return fn();

  const lock = LockService.getScriptLock();
  // 30 s je kompromis: delší čekání uživatel vnímá jako zamrznutí,
  // kratší by při souběhu zbytečně selhávalo.
  lock.waitLock(30000);
  dbLockHeld_ = true;
  try {
    return fn();
  } finally {
    dbLockHeld_ = false;
    lock.releaseLock();
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   ČTENÍ
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Vrátí všechny záznamy tabulky jako pole objektů podle hlaviček.
 * Prázdné řádky (bez hodnoty v prvním sloupci) se přeskakují — vznikají
 * ručním mazáním obsahu buněk v tabulce.
 */
function dbGetAll_(table) {
  // POZOR: kontrola musí být na PŘÍTOMNOST klíče, ne na jeho pravdivostní
  // hodnotu — prázdná tabulka se cachuje jako [], a prázdné pole je v JS
  // vždy pravdivé. `if (dbCache_[table])` by proto prázdný výsledek bralo
  // jako "už mám v cache" napořád (v rámci jedné instance běhu) i po
  // vložení nových řádků odjinud. Skutečně nová data v rámci JEDNOHO
  // požadavku zajišťuje reset dbCache_ na začátku guard_()/doGet().
  if (Object.prototype.hasOwnProperty.call(dbCache_, table)) return dbCache_[table];

  const sheet = dbSheet_(table);
  const lastRow = sheet.getLastRow();
  const headers = DB_SCHEMA[table];

  // Jen hlavička = prázdná tabulka.
  if (lastRow < 2) {
    dbCache_[table] = [];
    return [];
  }

  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  const records = [];

  values.forEach((row, rowIndex) => {
    if (row[0] === '' || row[0] === null) return; // prázdný řádek

    const localDatetimeColumns = LOCAL_DATETIME_COLUMNS[table] || [];
    const record = {};
    headers.forEach((header, colIndex) => {
      let value = row[colIndex];
      // Obrana do hloubky — viz komentář u LOCAL_DATETIME_COLUMNS.
      if (value instanceof Date && localDatetimeColumns.indexOf(header) !== -1) {
        value = Utilities.formatDate(value, TIMEZONE, "yyyy-MM-dd'T'HH:mm");
      }
      record[header] = value;
    });
    // Číslo řádku v listu — potřebné pro cílený update/delete bez dalšího hledání.
    record._row = rowIndex + 2;
    records.push(record);
  });

  dbCache_[table] = records;
  return records;
}

/** Najde první záznam, jehož sloupec `column` má hodnotu `value`, jinak null. */
function dbFindBy_(table, column, value) {
  return dbGetAll_(table).find((record) => record[column] === value) || null;
}

/** Najde záznam podle id, jinak null. */
function dbFindById_(table, id) {
  return dbFindBy_(table, 'id', String(id));
}

/* ══════════════════════════════════════════════════════════════════════════
   ZÁPIS
   ══════════════════════════════════════════════════════════════════════════ */

/** Zneplatní cache tabulky — volá se po každém zápisu. */
function dbInvalidate_(table) {
  delete dbCache_[table];
}

/**
 * Připraví pole hodnot v pořadí sloupců podle schématu.
 * Chybějící klíče se zapíší jako prázdný řetězec, přebytečné se ignorují —
 * do listu se tak nikdy nedostane sloupec, který ve schématu není.
 *
 * U sloupců z TEXT_COLUMNS se hodnota navíc uvozuje apostrofem — stejný trik
 * jako ruční zápis '2026-09-02T08:30 v UI Sheets, který vynutí doslovný text.
 * Ukázalo se totiž (viz TOOLS_diagnostikaUdalosti a paměť projektu), že
 * samotné nastavení formátu buňky na "@" zápisu přes appendRow/setValues
 * nezabrání — Sheets si řetězec vypadající jako datum stejně tiše převede
 * na typ Date. Apostrof do výsledné hodnoty nejde, jen vynutí interpretaci.
 */
function dbRecordToRow_(table, record) {
  const textColumns = TEXT_COLUMNS[table] || [];
  return DB_SCHEMA[table].map((header) => {
    const value = record[header];
    if (value === undefined || value === null || value === '') return '';
    if (textColumns.indexOf(header) !== -1) return "'" + value;
    return value;
  });
}

/**
 * Přidá řádek tak, jak přišel — bez doplňování id a časových razítek.
 * Používá se pro auditní log, kde si sloupce plní volající sám.
 */
function dbAppend_(table, record) {
  return withLock_(() => {
    const sheet = dbSheet_(table);
    sheet.appendRow(dbRecordToRow_(table, record));
    dbInvalidate_(table);
    return record;
  });
}

/**
 * Vloží nový záznam a doplní systémová pole: id, created_at, created_by,
 * updated_at. Volající je nemusí (a nemá) vyplňovat.
 */
function dbInsert_(table, record) {
  return withLock_(() => {
    const now = nowIso_();
    const complete = Object.assign({}, record, {
      id: record.id || uuid_(),
      created_at: now,
      created_by: currentEmail_() || 'system',
      updated_at: now,
    });

    const sheet = dbSheet_(table);
    sheet.appendRow(dbRecordToRow_(table, complete));
    dbInvalidate_(table);
    return complete;
  });
}

/**
 * Přepíše existující záznam. Mění jen sloupce uvedené v `changes`, ostatní
 * zůstávají — proto se nejdřív načte původní řádek a teprve pak se zapisuje
 * celý řádek najednou (jeden setValues místo zápisu buňku po buňce).
 *
 * Sloupce id, created_at a created_by se změnit nedají; updated_at se
 * doplňuje automaticky.
 */
function dbUpdate_(table, id, changes) {
  return withLock_(() => {
    // Cache mohla vzniknout před zámkem — před úpravou ji zahodíme, ať
    // pracujeme se skutečným aktuálním stavem listu.
    dbInvalidate_(table);

    const existing = dbFindById_(table, id);
    if (!existing) {
      throw userError_('Záznam nebyl nalezen — mohl ho mezitím smazat někdo jiný.');
    }

    const updated = Object.assign({}, existing, changes, {
      id: existing.id,
      created_at: existing.created_at,
      created_by: existing.created_by,
      updated_at: nowIso_(),
    });
    delete updated._row;

    const sheet = dbSheet_(table);
    const headers = DB_SCHEMA[table];
    sheet
      .getRange(existing._row, 1, 1, headers.length)
      .setValues([dbRecordToRow_(table, updated)]);

    dbInvalidate_(table);
    return updated;
  });
}

/** Smaže záznam podle id. */
function dbDelete_(table, id) {
  return withLock_(() => {
    dbInvalidate_(table);

    const existing = dbFindById_(table, id);
    if (!existing) {
      throw userError_('Záznam nebyl nalezen — mohl ho mezitím smazat někdo jiný.');
    }

    dbSheet_(table).deleteRow(existing._row);
    dbInvalidate_(table);
    return existing;
  });
}

/**
 * Nahradí CELÝ obsah tabulky (kromě hlavičky) zadanými záznamy najednou —
 * jedno čtení, jeden zápis, místo řádku po řádku jako dbInsert_/dbUpdate_/
 * dbDelete_. Používá se pro hromadný import (viz 60_import.js): cyklus
 * stovek jednotlivých volání by byl kvůli dbInvalidate_() po KAŽDÉM zápisu
 * neúnosně pomalý — každé další volání by si muselo znovu přečíst celou
 * tabulku od začátku, než by mohlo zapsat další řádek.
 *
 * Doplní `id` (když chybí), `created_at`/`created_by` (jen když chybí —
 * u záznamu, který volající sestavil z JIŽ EXISTUJÍCÍHO řádku, se tak
 * zachová) a vždycky obnoví `updated_at`, stejně jako dbInsert_/dbUpdate_.
 * `updated_by` se nedoplňuje — stejně jako dbUpdate_ ho nechává čistě na
 * volajícím (viz komentář u DB_SCHEMA._logistic_centers).
 *
 * @param {string} table
 * @param {Object[]} records  kompletní nový obsah tabulky, v tomto pořadí
 * @returns {number} počet zapsaných řádků
 */
function dbReplaceAll_(table, records) {
  return withLock_(() => {
    const headers = DB_SCHEMA[table];
    const now = nowIso_();
    const email = currentEmail_() || 'system';
    const hasColumn = (name) => headers.indexOf(name) !== -1;

    const rows = records.map((record) => {
      const complete = Object.assign({}, record);
      if (hasColumn('id') && !complete.id) complete.id = uuid_();
      if (hasColumn('created_at') && !complete.created_at) complete.created_at = now;
      if (hasColumn('created_by') && !complete.created_by) complete.created_by = email;
      if (hasColumn('updated_at')) complete.updated_at = now;
      return dbRecordToRow_(table, complete);
    });

    const sheet = dbSheet_(table);
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, headers.length).clearContent();
    }
    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }

    dbInvalidate_(table);
    return rows.length;
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   NASTAVENÍ (list `_settings`)

   Klíč–hodnota. Hodnoty se ukládají jako text; typ určuje DEFAULT_SETTINGS,
   podle kterého se při čtení převádějí zpět (boolean).
   ══════════════════════════════════════════════════════════════════════════ */

/** Převede hodnotu z tabulky na boolean. Sheets vrací true/false i "TRUE"/"true". */
function toBool_(value) {
  if (value === true || value === false) return value;
  const text = String(value).trim().toLowerCase();
  return text === 'true' || text === 'ano' || text === '1';
}

/**
 * Vrátí všechna nastavení jako objekt, doplněná o výchozí hodnoty pro klíče,
 * které v tabulce ještě nejsou. Typ se odvozuje z DEFAULT_SETTINGS.
 */
function settingsAll_() {
  const stored = {};
  dbGetAll_(SHEETS.SETTINGS).forEach((row) => {
    stored[String(row.key)] = row.value;
  });

  const result = {};
  Object.keys(DEFAULT_SETTINGS).forEach((key) => {
    const defaultValue = DEFAULT_SETTINGS[key];
    if (!(key in stored)) {
      result[key] = defaultValue;
      return;
    }
    result[key] = typeof defaultValue === 'boolean' ? toBool_(stored[key]) : String(stored[key]);
  });
  return result;
}

/**
 * Uloží jedno nastavení. Klíč musí být v DEFAULT_SETTINGS — tím je zaručeno,
 * že klient nemůže do tabulky podstrčit libovolný vlastní klíč.
 */
function settingsSet_(key, value) {
  if (!(key in DEFAULT_SETTINGS)) {
    throw userError_('Neznámý klíč nastavení.');
  }

  return withLock_(() => {
    dbInvalidate_(SHEETS.SETTINGS);

    const existing = dbFindBy_(SHEETS.SETTINGS, 'key', key);
    const row = {
      key: key,
      value: value,
      updated_at: nowIso_(),
      updated_by: currentEmail_() || 'system',
    };

    const sheet = dbSheet_(SHEETS.SETTINGS);
    const headers = DB_SCHEMA[SHEETS.SETTINGS];

    if (existing) {
      sheet.getRange(existing._row, 1, 1, headers.length)
        .setValues([dbRecordToRow_(SHEETS.SETTINGS, row)]);
    } else {
      sheet.appendRow(dbRecordToRow_(SHEETS.SETTINGS, row));
    }

    dbInvalidate_(SHEETS.SETTINGS);
    return row;
  });
}
