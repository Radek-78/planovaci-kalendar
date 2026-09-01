/**
 * ════════════════════════════════════════════════════════════════════════════
 *  90_tools.js — ruční nástroje správce
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Funkce určené ke spuštění RUČNĚ z editoru Apps Script (Spustit → vybrat
 * funkci). Záměrně nejsou dostupné z webového rozhraní — spouštět je smí jen
 * ten, kdo má přístup přímo ke skriptu, tedy vlastník.
 *
 * Proto tu NENÍ guard_: ochranou je samotný přístup do editoru. Kdyby šly
 * volat z prohlížeče, byl by reset inicializace dostupný komukoliv, kdo umí
 * otevřít konzoli.
 */

/**
 * Vypíše, kde skript leží a kde je jeho databáze.
 * První věc, kterou spustit, když něco nesedí.
 */
function TOOLS_kdeJeSkript() {
  const folder = scriptFolder_();
  const dbId = PropertiesService.getScriptProperties().getProperty(PROPS.DB_ID);

  console.log('Složka skriptu: ' + (folder ? folder.getName() : 'kořen Disku'));
  console.log('URL složky:     ' + (folder ? folder.getUrl() : '—'));
  console.log('ID databáze:    ' + (dbId || 'zatím nevznikla (aplikace není inicializována)'));

  if (dbId) {
    try {
      const spreadsheet = SpreadsheetApp.openById(dbId);
      console.log('Název databáze: ' + spreadsheet.getName());
      console.log('URL databáze:   ' + spreadsheet.getUrl());
      console.log('Listy:          ' + spreadsheet.getSheets().map((s) => s.getName()).join(', '));
    } catch (e) {
      console.log('Databázi podle uloženého ID NELZE otevřít: ' + e);
    }
  }
}

/**
 * Odpojí databázi od skriptu — při dalším otevření aplikace se spustí wizard.
 *
 * Spreadsheet v Drive ZŮSTÁVÁ nedotčený, jen se na něj skript přestane
 * odkazovat. Data se tedy neztratí; pokud se má aplikace vrátit k původní
 * databázi, stačí ID vrátit zpět do Script Properties.
 */
function TOOLS_resetInicializace() {
  const properties = PropertiesService.getScriptProperties();
  const dbId = properties.getProperty(PROPS.DB_ID);

  properties.deleteProperty(PROPS.DB_ID);
  properties.deleteProperty(PROPS.SETUP_AT);
  dbHandle_ = null;
  dbCache_ = {};

  console.log('Inicializace zrušena. Při dalším otevření aplikace se spustí wizard.');
  console.log('Původní databáze ZŮSTÁVÁ v Drive, ID bylo: ' + (dbId || '—'));
}

/**
 * Přeformátuje všechny listy databáze firemním fontem (CONFIG.sheetFont).
 *
 * K čemu je to dobré: setFontFamily() neexistující název fontu tiše ignoruje.
 * Kdyby se název netrefil, listy zůstanou v Arialu — po opravě CONFIG.sheetFont
 * stačí spustit tuto funkci a databázi není nutné zakládat znovu.
 */
function TOOLS_prefontujDb() {
  const spreadsheet = dbSpreadsheet_();
  const sheets = spreadsheet.getSheets();

  sheets.forEach((sheet) => {
    applySheetFont_(sheet);
    console.log('Přeformátován list: ' + sheet.getName());
  });

  console.log('Hotovo — ' + sheets.length + ' listů nastaveno na font „' + CONFIG.sheetFont + '".');
  console.log('Zkontroluj v tabulce, že se font opravdu projevil; pokud ne, název fontu nesouhlasí.');
}

/**
 * Doplní chybějící listy a sloupce podle DB_SCHEMA.
 * Spouští se po rozšíření schématu — nic nemaže, jen doplňuje.
 */
function TOOLS_zkontrolujSchema() {
  const spreadsheet = dbSpreadsheet_();
  dbEnsureSchema_(spreadsheet);

  console.log('Schéma zkontrolováno. Listy v databázi: ' +
    spreadsheet.getSheets().map((s) => s.getName()).join(', '));
}
