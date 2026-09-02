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
  ],
  _settings: ['key', 'value', 'updated_at', 'updated_by'],
  _audit_log: ['timestamp', 'user', 'action', 'detail'],
  events: [
    'id', 'start', 'end', 'all_day', 'type', 'title', 'description',
    'owner_email', 'created_at', 'created_by', 'updated_at', 'updated_by',
  ],
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

/** Vrátí list dané tabulky, nebo vyhodí chybu, když neexistuje. */
function dbSheet_(table) {
  const sheet = dbSpreadsheet_().getSheetByName(table);
  if (!sheet) {
    throw userError_('Tabulka „' + table + '" v databázi chybí. Kontaktujte správce.');
  }
  return sheet;
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

    const record = {};
    headers.forEach((header, colIndex) => {
      record[header] = row[colIndex];
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
 */
function dbRecordToRow_(table, record) {
  return DB_SCHEMA[table].map((header) => {
    const value = record[header];
    return value === undefined || value === null ? '' : value;
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
