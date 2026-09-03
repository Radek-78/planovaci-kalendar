/**
 * ════════════════════════════════════════════════════════════════════════════
 *  60_import.js — import dat filiálek a LC ze sdíleného Sheets souboru
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Zdrojový soubor spravuje CIZÍ systém mimo appku a sám ho každý den mezi
 * 4-5h ráno přepisuje. Appka si z něj bere jen kopii do vlastních tabulek
 * (_stores/_logistic_centers/_store_closures) — nikdy nečte zdroj přímo za
 * běhu, to by bylo pomalé a křehké (appka by spadla, kdyby soubor zrovna
 * někdo měl otevřený k editaci, nebo kdyby zmizel).
 *
 * ETAPA 1: ruční vyhledání souboru ve složce na Disku podle hledaného
 * výrazu + samotný import (viz apiSearchImportFiles/apiSyncImportFile).
 * ETAPA 2 (tahle verze): čtení pro sekce Filiálky/LC v menu (čtení smí
 * každý přihlášený — appka slouží i jako firemní adresář, viz konverzace)
 * + ruční úprava čísla/zkratky LC (jen SUPERADMIN).
 *
 * Hlídání rozdílů oproti minulému stavu, trvalý Log importu a oznámení
 * zvonečkem přibudou v etapě 3, noční automatická synchronizace v etapě 4
 * (viz SPECIFIKACE.md kapitola 9.6).
 *
 * Sloupce se hledají podle PŘESNÉHO textu hlavičky v řádku 1, ne podle
 * pozice — cizí systém sloupce časem může přeuspořádat, appka na tom nesmí
 * záviset. Chybějící očekávaná hlavička = jasná chyba hned při importu.
 */

/** Názvy listů, které appka ve zdrojovém souboru čte. Pevné, dané formátem cizího systému. */
const IMPORT_SHEET_NAMES = {
  STORES: 'Organizace_Detail',
  CLOSURES: 'Zavrene_Openings',
};

/**
 * Mapování hlaviček listu Organizace_Detail na pole záznamu filiálky
 * (_stores, viz DB_SCHEMA v 20_db.js). `time: true` = hodnota může ve
 * zdroji přijít jako Date (buňka naformátovaná jako čas), ne jen text —
 * viz _importCellTime_.
 */
const IMPORT_STORE_COLUMNS = [
  { header: 'Číslo', field: 'id' },
  { header: 'ID', field: 'kod' },
  { header: 'Název', field: 'nazev' },
  { header: 'LC', field: 'lc' },
  { header: 'Telefon prodejny', field: 'telefon_prodejny' },
  { header: 'VT', field: 'vt' },
  { header: 'Telefon VT', field: 'telefon_vt' },
  { header: 'RM', field: 'rm' },
  { header: 'Telefon RM', field: 'telefon_rm' },
  { header: 'Zástupce RM', field: 'zastupce_rm' },
  { header: 'Telefon zástupce', field: 'telefon_zastupce' },
  { header: 'Ulice', field: 'ulice' },
  { header: 'Město', field: 'mesto' },
  { header: 'PSČ', field: 'psc' },
  { header: 'Pondělí otevřeno', field: 'po_otevreno', time: true },
  { header: 'Pondělí zavřeno', field: 'po_zavreno', time: true },
  { header: 'Úterý otevřeno', field: 'ut_otevreno', time: true },
  { header: 'Úterý zavřeno', field: 'ut_zavreno', time: true },
  { header: 'Středa otevřeno', field: 'st_otevreno', time: true },
  { header: 'Středa zavřeno', field: 'st_zavreno', time: true },
  { header: 'Čtvrtek otevřeno', field: 'ct_otevreno', time: true },
  { header: 'Čtvrtek zavřeno', field: 'ct_zavreno', time: true },
  { header: 'Pátek otevřeno', field: 'pa_otevreno', time: true },
  { header: 'Pátek zavřeno', field: 'pa_zavreno', time: true },
  { header: 'Sobota otevřeno', field: 'so_otevreno', time: true },
  { header: 'Sobota zavřeno', field: 'so_zavreno', time: true },
  { header: 'Neděle otevřeno', field: 'ne_otevreno', time: true },
  { header: 'Neděle zavřeno', field: 'ne_zavreno', time: true },
];

/** Mapování hlaviček listu Zavrene_Openings na pole záznamu uzavírky (_store_closures). */
const IMPORT_CLOSURE_COLUMNS = [
  { header: 'Číslo', field: 'id' },
  { header: 'Název', field: 'nazev' },
  { header: 'Od', field: 'od', date: true },
  { header: 'Do', field: 'do', date: true },
  { header: 'Celkem dní', field: 'celkem_dni' },
];

/* ══════════════════════════════════════════════════════════════════════════
   ČTENÍ ZDROJOVÉHO SOUBORU
   ══════════════════════════════════════════════════════════════════════════ */

/** Prostý text buňky, ořezaný. `null`/`undefined` → prázdný řetězec. */
function _importCellText_(value) {
  return String(value === null || value === undefined ? '' : value).trim();
}

/** Buňka otevírací doby — Sheets ji může vrátit jako Date (čas), appka chce vždy "HH:mm". */
function _importCellTime_(value) {
  if (value instanceof Date) return Utilities.formatDate(value, TIMEZONE, 'HH:mm');
  return _importCellText_(value);
}

/** Buňka data (Od/Do uzavírky) — Sheets ji může vrátit jako Date, appka chce vždy "YYYY-MM-DD". */
function _importCellDate_(value) {
  if (value instanceof Date) return Utilities.formatDate(value, TIMEZONE, 'yyyy-MM-dd');
  return _importCellText_(value);
}

/**
 * Najde v hlavičkovém řádku listu index každého sloupce ze seznamu
 * `columns` (podle .header). Chybějící hlavička = jasná chyba hned teď,
 * ne tichý prázdný sloupec někde hluboko v importu.
 */
function _importHeaderIndex_(sheet, columns, sheetLabel) {
  const lastCol = sheet.getLastColumn();
  const headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map((h) => String(h).trim());

  const index = {};
  columns.forEach((col) => {
    const at = headerRow.indexOf(col.header);
    if (at === -1) {
      throw userError_('List „' + sheetLabel + '" ve zdrojovém souboru neobsahuje očekávaný sloupec „' +
        col.header + '". Zkontrolujte formát souboru.');
    }
    index[col.field] = at;
  });
  return index;
}

/** Přečte list Organizace_Detail a vrátí pole záznamů pro _stores. */
function _importReadStores_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(IMPORT_SHEET_NAMES.STORES);
  if (!sheet) {
    throw userError_('Zdrojový soubor neobsahuje list „' + IMPORT_SHEET_NAMES.STORES + '".');
  }

  const index = _importHeaderIndex_(sheet, IMPORT_STORE_COLUMNS, IMPORT_SHEET_NAMES.STORES);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  const records = [];
  values.forEach((row) => {
    const id = _importCellText_(row[index.id]);
    if (!id) return; // prázdný řádek (chybí Číslo)

    const record = {};
    IMPORT_STORE_COLUMNS.forEach((col) => {
      const raw = row[index[col.field]];
      record[col.field] = col.time ? _importCellTime_(raw) : _importCellText_(raw);
    });
    records.push(record);
  });
  return records;
}

/** Přečte list Zavrene_Openings a vrátí pole záznamů pro _store_closures. */
function _importReadClosures_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(IMPORT_SHEET_NAMES.CLOSURES);
  if (!sheet) {
    throw userError_('Zdrojový soubor neobsahuje list „' + IMPORT_SHEET_NAMES.CLOSURES + '".');
  }

  const index = _importHeaderIndex_(sheet, IMPORT_CLOSURE_COLUMNS, IMPORT_SHEET_NAMES.CLOSURES);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  const records = [];
  values.forEach((row) => {
    const id = _importCellText_(row[index.id]);
    if (!id) return;

    const record = {};
    IMPORT_CLOSURE_COLUMNS.forEach((col) => {
      const raw = row[index[col.field]];
      record[col.field] = col.date ? _importCellDate_(raw) : _importCellText_(raw);
    });
    records.push(record);
  });
  return records;
}

/* ══════════════════════════════════════════════════════════════════════════
   VYHLEDÁNÍ SOUBORU NA DISKU
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Vytáhne ID složky ze vstupu — appka přijímá jak URL
 * (".../folders/<id>..."), tak čisté ID, obojí obsahuje dost dlouhý
 * alfanumerický úsek. Přístup se ověří rovnou pokusem o otevření, ať appka
 * chybu odhalí hned při hledání, ne až při synchronizaci.
 */
function _importResolveFolder_(input) {
  const text = cleanText_(input, 'Složka', LIMITS.IMPORT_FOLDER_MAX, true);
  const match = text.match(/[-\w]{25,}/);
  const folderId = match ? match[0] : text;

  try {
    return DriveApp.getFolderById(folderId);
  } catch (e) {
    throw userError_('Složku se nepodařilo najít. Zkontrolujte URL nebo ID a přístupová práva.');
  }
}

/**
 * Vrátí naposledy odsouhlasenou konfiguraci importu (viz DEFAULT_SETTINGS)
 * — appka jí předvyplní pole při otevření záložky Import dat, ať admin
 * nemusí URL/výraz psát pokaždé znovu.
 */
function apiGetImportSettings() {
  return guard_(PERM_KEYS.SETTINGS_MANAGE, () => {
    const settings = settingsAll_();
    return {
      folderInput: settings.importFolderId,
      searchTerm: settings.importSearchTerm,
    };
  });
}

/**
 * Prohledá zadanou složku a vrátí Sheets soubory, jejichž název obsahuje
 * hledaný výraz (bez rozlišení velikosti písmen), seřazené od nejnovější
 * úpravy. Nastavení se tady ještě NEUKLÁDÁ — jen při úspěšné synchronizaci
 * (viz apiSyncImportFile), ať se do `_settings` nedostane neověřený pokus.
 */
function apiSearchImportFiles(payload) {
  return guard_(PERM_KEYS.SETTINGS_MANAGE, () => {
    const data = payload || {};
    const folder = _importResolveFolder_(data.folderInput);
    const searchTerm = cleanText_(data.searchTerm, 'Hledaný výraz', LIMITS.IMPORT_SEARCH_MAX, true).toLowerCase();

    const files = [];
    const iterator = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
    while (iterator.hasNext()) {
      const file = iterator.next();
      if (file.getName().toLowerCase().indexOf(searchTerm) === -1) continue;
      files.push({
        id: file.getId(),
        name: file.getName(),
        modifiedAt: Utilities.formatDate(file.getLastUpdated(), TIMEZONE, "yyyy-MM-dd'T'HH:mm"),
      });
    }
    // Řadit AŽ PO projití celé složky — jinak by případný limit počtu
    // výsledků mohl vyřadit zrovna ten nejnovější soubor, který appka chce
    // rovnou předvybrat (viz App.searchImportFiles na klientovi).
    files.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));

    return { files: files.slice(0, 25) };
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   SYNCHRONIZACE
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Provede synchronizaci: přečte vybraný soubor a nahradí obsah _stores,
 * _logistic_centers a _store_closures (viz dbReplaceAll_ v 20_db.js — proč
 * ne řádek po řádku). Použitá složka/výraz se uloží do _settings, ať noční
 * trigger (přibude v etapě 4) navazuje na tuhle odsouhlasenou konfiguraci.
 *
 * Vrací počty pro OKAMŽITOU zpětnou vazbu ve formuláři (přidáno/smazáno/
 * změněno) — trvalá historie a oznámení zvonečkem přibudou v etapě 3.
 */
function apiSyncImportFile(payload) {
  return guard_(PERM_KEYS.SETTINGS_MANAGE, () => {
    const data = payload || {};
    const fileId = cleanText_(data.fileId, 'ID souboru', 200, true);

    let spreadsheet;
    try {
      spreadsheet = SpreadsheetApp.openById(fileId);
    } catch (e) {
      throw userError_('Zdrojový soubor se nepodařilo otevřít. Zkuste vyhledat znovu.');
    }

    const storeRows = _importReadStores_(spreadsheet);
    const closureRows = _importReadClosures_(spreadsheet);

    const storesResult = _importSyncStores_(storeRows);
    const lcResult = _importSyncLogisticCenters_(storeRows);
    const closuresResult = _importSyncClosures_(closureRows);

    if (data.folderInput) settingsSet_('importFolderId', String(data.folderInput).trim());
    if (data.searchTerm) settingsSet_('importSearchTerm', String(data.searchTerm).trim());

    audit_('import.sync', 'Synchronizace dat filiálek ze souboru „' + spreadsheet.getName() + '" — ' +
      storesResult.total + ' filiálek, ' + lcResult.total + ' LC, ' + closuresResult.total + ' uzavírek');

    return {
      fileName: spreadsheet.getName(),
      stores: storesResult,
      logisticCenters: lcResult,
      closures: closuresResult,
    };
  });
}

/** Porovná uložený a nově importovaný záznam filiálky — jen sledovaná pole ze zdroje, ne interní (id/updated_at). */
function _storeRowDiffers_(existing, incoming) {
  return DB_SCHEMA[SHEETS.STORES].some((field) => {
    if (field === 'id' || field === 'updated_at') return false;
    return String(existing[field] || '') !== String(incoming[field] || '');
  });
}

/** Nahradí _stores daty ze zdroje, vrátí počty přidaných/změněných/smazaných filiálek. */
function _importSyncStores_(storeRows) {
  const before = dbGetAll_(SHEETS.STORES);
  const beforeMap = {};
  before.forEach((row) => { beforeMap[String(row.id)] = row; });

  const afterIds = {};
  let added = 0;
  let changed = 0;
  storeRows.forEach((row) => {
    afterIds[row.id] = true;
    const existing = beforeMap[row.id];
    if (!existing) added++;
    else if (_storeRowDiffers_(existing, row)) changed++;
  });
  const removed = before.filter((row) => !afterIds[String(row.id)]).length;

  dbReplaceAll_(SHEETS.STORES, storeRows);
  return { total: storeRows.length, added: added, changed: changed, removed: removed };
}

/**
 * Odvodí seznam LC z distinct hodnot sloupce LC v datech filiálek a nahradí
 * jimi _logistic_centers. Existující řádky (párované podle názvu) si
 * ponechají ručně zadané číslo/zkratku i datum založení, nové se založí
 * prázdné (číslo/zkratku doplní SUPERADMIN v appce). LC, které v novém
 * importu už u žádné filiálky nefiguruje, ze seznamu zmizí — stejné
 * pravidlo jako u filiálek výše.
 */
function _importSyncLogisticCenters_(storeRows) {
  const names = {};
  storeRows.forEach((row) => {
    const name = String(row.lc || '').trim();
    if (name) names[name] = true;
  });

  const before = dbGetAll_(SHEETS.LOGISTIC_CENTERS);
  const beforeByName = {};
  before.forEach((row) => { beforeByName[String(row.nazev)] = row; });

  let added = 0;
  const records = Object.keys(names).sort().map((name) => {
    const existing = beforeByName[name];
    if (existing) return Object.assign({}, existing, { nazev: name });
    added++;
    return { nazev: name, cislo: '', zkratka: '' };
  });
  const removed = before.filter((row) => !names[String(row.nazev)]).length;

  dbReplaceAll_(SHEETS.LOGISTIC_CENTERS, records);
  return { total: records.length, added: added, removed: removed };
}

/** Kompletně nahradí _store_closures aktuálním snímkem uzavírek ze zdroje. */
function _importSyncClosures_(closureRows) {
  const before = dbGetAll_(SHEETS.STORE_CLOSURES);
  dbReplaceAll_(SHEETS.STORE_CLOSURES, closureRows);
  return { total: closureRows.length, previousTotal: before.length };
}

/* ══════════════════════════════════════════════════════════════════════════
   ČTENÍ PRO SEKCE FILIÁLKY / LC (viz nav v ui/view_app.html)

   Obojí smí ČÍST každý přihlášený uživatel (`calendar_read`) — appka tu
   slouží i jako firemní adresář, ne jen jako nástroj správce. Editovat
   (jen číslo/zkratku LC) smí pořád jen SUPERADMIN (`settings_manage`).
   ══════════════════════════════════════════════════════════════════════════ */

/** Přemění řádek filiálky na podobu pro klienta — camelCase pole + info o aktuální uzavírce (viz _store_closures). */
function _publicStore_(row, closuresByStore) {
  const closure = closuresByStore[String(row.id)];
  return {
    id: String(row.id),
    kod: String(row.kod || ''),
    nazev: String(row.nazev || ''),
    lc: String(row.lc || ''),
    telefonProdejny: String(row.telefon_prodejny || ''),
    vt: String(row.vt || ''),
    telefonVt: String(row.telefon_vt || ''),
    rm: String(row.rm || ''),
    telefonRm: String(row.telefon_rm || ''),
    zastupceRm: String(row.zastupce_rm || ''),
    telefonZastupce: String(row.telefon_zastupce || ''),
    ulice: String(row.ulice || ''),
    mesto: String(row.mesto || ''),
    psc: String(row.psc || ''),
    // Otevírací doba po dnech — pro detail filiálky na klientovi (App.openStoreDetailModal).
    hours: [
      { label: 'Pondělí', otevreno: String(row.po_otevreno || ''), zavreno: String(row.po_zavreno || '') },
      { label: 'Úterý', otevreno: String(row.ut_otevreno || ''), zavreno: String(row.ut_zavreno || '') },
      { label: 'Středa', otevreno: String(row.st_otevreno || ''), zavreno: String(row.st_zavreno || '') },
      { label: 'Čtvrtek', otevreno: String(row.ct_otevreno || ''), zavreno: String(row.ct_zavreno || '') },
      { label: 'Pátek', otevreno: String(row.pa_otevreno || ''), zavreno: String(row.pa_zavreno || '') },
      { label: 'Sobota', otevreno: String(row.so_otevreno || ''), zavreno: String(row.so_zavreno || '') },
      { label: 'Neděle', otevreno: String(row.ne_otevreno || ''), zavreno: String(row.ne_zavreno || '') },
    ],
    closedFrom: closure ? String(closure.od) : '',
    closedTo: closure ? String(closure.do) : '',
  };
}

/**
 * Seznam filiálek, řazený podle Čísla vzestupně — NUMERICKY, ne textově
 * (jinak by "1100" vyšlo před "200"). id ve _stores je vždycky číselný
 * řetězec (= sloupec Číslo ve zdroji), Number() na něm je bezpečné.
 */
function apiGetStores() {
  return guard_(PERM_KEYS.CALENDAR_READ, () => {
    const closuresByStore = {};
    dbGetAll_(SHEETS.STORE_CLOSURES).forEach((row) => { closuresByStore[String(row.id)] = row; });

    return dbGetAll_(SHEETS.STORES)
      .slice()
      .sort((a, b) => Number(a.id) - Number(b.id))
      .map((row) => _publicStore_(row, closuresByStore));
  });
}

/** Spočítá počet filiálek pro každé LC (podle názvu) — jen doplňková informace v přehledu, appka na ní jinak nezávisí. */
function _storeCountByLc_() {
  const counts = {};
  dbGetAll_(SHEETS.STORES).forEach((row) => {
    const lc = String(row.lc || '');
    if (lc) counts[lc] = (counts[lc] || 0) + 1;
  });
  return counts;
}

/** Přemění řádek LC na podobu pro klienta. */
function _publicLogisticCenter_(row, storeCountByLc) {
  return {
    id: String(row.id),
    cislo: String(row.cislo || ''),
    zkratka: String(row.zkratka || ''),
    nazev: String(row.nazev || ''),
    storeCount: storeCountByLc[String(row.nazev)] || 0,
  };
}

/**
 * Seznam LC, řazený podle Čísla vzestupně — LC bez zadaného čísla (nově
 * objevené, ještě nedoplněné) jdou vždycky AŽ NA KONEC, ne na začátek
 * (prázdný řetězec by se jinak řadil textově před jakoukoli číslici).
 */
function apiGetLogisticCenters() {
  return guard_(PERM_KEYS.CALENDAR_READ, () => {
    const storeCountByLc = _storeCountByLc_();

    return dbGetAll_(SHEETS.LOGISTIC_CENTERS)
      .slice()
      .sort((a, b) => {
        const numA = a.cislo ? Number(a.cislo) : null;
        const numB = b.cislo ? Number(b.cislo) : null;
        if (numA === null && numB === null) return String(a.nazev).localeCompare(String(b.nazev), 'cs');
        if (numA === null) return 1;
        if (numB === null) return -1;
        return numA - numB;
      })
      .map((row) => _publicLogisticCenter_(row, storeCountByLc));
  });
}

/**
 * Upraví číslo/zkratku LC — jediné dva sloupce, které appka u LC dovolí
 * ručně editovat (název přichází ze zdroje, viz _importSyncLogisticCenters_
 * výše — synchronizace ho při refreshi nepřepíše zpátky).
 *
 * @param {Object} payload  { id, cislo, zkratka }
 */
function apiSaveLogisticCenter(payload) {
  return guard_(PERM_KEYS.SETTINGS_MANAGE, () => {
    const data = payload || {};
    const id = cleanText_(data.id, 'ID LC', 100, true);
    const existing = dbFindById_(SHEETS.LOGISTIC_CENTERS, id);
    if (!existing) {
      throw userError_('LC nebylo nalezeno — mohla ho mezitím smazat synchronizace.');
    }

    const cislo = cleanText_(data.cislo, 'Číslo', LIMITS.LC_CISLO_MAX, false);
    const zkratka = cleanText_(data.zkratka, 'Zkratka', LIMITS.LC_ZKRATKA_MAX, false);

    const record = dbUpdate_(SHEETS.LOGISTIC_CENTERS, id, { cislo: cislo, zkratka: zkratka });
    audit_('logisticCenter.update', 'Upraveno LC „' + existing.nazev + '" (číslo ' +
      (cislo || '—') + ', zkratka ' + (zkratka || '—') + ')');

    return _publicLogisticCenter_(record, _storeCountByLc_());
  });
}
