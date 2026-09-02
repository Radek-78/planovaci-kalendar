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

/**
 * Vloží sadu testovacích událostí pro ruční ověření kalendáře — pokrývá
 * všechny stavy, které mřížka umí zobrazit: událost v minulosti, událost
 * přesahující přes hranici měsíce, dnešek, celodenní i časovou událost,
 * vícedenní událost (časovou i celodenní) a všech sedm typů.
 *
 * Data jsou napevno u víkendu 1.–2. 9. 2026 (dnešek v době psaní) — pokud
 * se spouští později, dny už nebudou sedět na "dnešek", ale mřížka zůstane
 * použitelná k prohlédnutí chipů a modalu.
 *
 * POZOR: spustit jen JEDNOU. Opětovné spuštění vytvoří duplicity — testovací
 * řádky jde smazat ručně přímo v listu `events`.
 */
function TOOLS_vlozTestovaciUdalosti() {
  const events = [
    {
      start: '2026-08-28T14:00', end: '2026-08-28T15:00', all_day: false, type: 'default',
      title: 'Týdenní report', description: 'Shrnutí uplynulého týdne.',
    },
    {
      start: '2026-08-31T00:00', end: '2026-09-01T23:59', all_day: true, type: 'trip',
      title: 'Přesun do Ostravy', description: 'Přesah přes hranici měsíce — test spojitého chipu.',
    },
    {
      start: '2026-09-02T09:00', end: '2026-09-02T09:30', all_day: false, type: 'meeting',
      title: 'Denní standup', description: '',
    },
    {
      start: '2026-09-03T00:00', end: '2026-09-03T23:59', all_day: true, type: 'homeoffice',
      title: 'Home office', description: '',
    },
    {
      start: '2026-09-07T08:00', end: '2026-09-09T17:00', all_day: false, type: 'trip',
      title: 'Školení Praha', description: 'Vícedenní časová událost — test značky pokračování.',
    },
    {
      start: '2026-09-15T11:30', end: '2026-09-15T12:00', all_day: false, type: 'deadline',
      title: 'Odevzdání reportu', description: '',
    },
    {
      start: '2026-09-18T00:00', end: '2026-09-18T23:59', all_day: true, type: 'party',
      title: 'Teambuilding', description: 'Celodenní akce.',
    },
    {
      start: '2026-09-22T10:00', end: '2026-09-22T11:00', all_day: false, type: 'important',
      title: 'Kontrola kvality', description: '',
    },
  ];

  _toolsInsertEvents_(events);
}

/**
 * Přidá čtyři události do JEDNOHO dne (2. 9. 2026, spolu s „Denní standup"
 * z TOOLS_vlozTestovaciUdalosti dohromady čtyři) — pro ruční ověření, jak
 * mřížka zvládne víc událostí v jedné buňce (chip „+N" nad limit) a jak
 * vypadá modal detailu dne s delším seznamem.
 *
 * POZOR: spustit jen JEDNOU, ze stejného důvodu jako TOOLS_vlozTestovaciUdalosti.
 */
function TOOLS_vlozDalsiUdalostiTentyzDen() {
  _toolsInsertEvents_([
    {
      start: '2026-09-02T11:00', end: '2026-09-02T11:15', all_day: false, type: 'default',
      title: 'Rychlá konzultace', description: '',
    },
    {
      start: '2026-09-02T13:00', end: '2026-09-02T13:30', all_day: false, type: 'important',
      title: 'Předání dokumentů', description: '',
    },
    {
      start: '2026-09-02T15:00', end: '2026-09-02T16:00', all_day: false, type: 'meeting',
      title: 'Call s klientem', description: 'Test více událostí v jednom dni.',
    },
  ]);
}

/** Společný zápis testovacích událostí pro TOOLS_vloz* funkce výše. */
function _toolsInsertEvents_(events) {
  const ownerEmail = currentEmail_() || 'test@example.com';
  events.forEach((event) => {
    dbInsert_(SHEETS.EVENTS, Object.assign({}, event, { owner_email: ownerEmail }));
    console.log('Vloženo: ' + event.title + ' (' + event.start + ' – ' + event.end + ')');
  });

  console.log('Hotovo — vloženo ' + events.length + ' testovacích událostí jako ' + ownerEmail + '.');
}

/**
 * DIAGNOSTIKA: vypíše syrová data z listu `events` přesně tak, jak je čte
 * server (dbGetAll_), a u každého řádku ukáže, jestli by prošel stejným
 * filtrem, jaký používá apiGetEvents pro aktuálně zobrazený měsíc.
 *
 * Použití: spustit, pak Zobrazit → Log (nebo Ctrl+Enter) a celý výstup
 * zkopírovat zpět do konverzace. Nejdůležitější je sloupec "typeof start" —
 * pokud ukáže "object" místo "string", Sheets si datum tiše převedl na
 * typ Date navzdory textovému formátu sloupce a to je příčina problému.
 *
 * Dočasný nástroj — po vyřešení problému ho lze z projektu smazat.
 */
function TOOLS_diagnostikaUdalosti() {
  const rows = dbGetAll_(SHEETS.EVENTS);
  console.log('Počet řádků v events (bez hlavičky, bez prázdných řádků): ' + rows.length);

  if (!rows.length) {
    console.log('List events je z pohledu serveru PRÁZDNÝ — dbGetAll_ nenašel žádný řádek.');
    console.log('Zkontroluj přes TOOLS_kdeJeSkript, jestli je DB_SPREADSHEET_ID stejný ' +
      'spreadsheet, do kterého ses díval ručně.');
    return;
  }

  const today = new Date();
  const monthFirst = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthLast = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const monthFirstIso = Utilities.formatDate(monthFirst, TIMEZONE, 'yyyy-MM-dd');
  const monthLastIso = Utilities.formatDate(monthLast, TIMEZONE, 'yyyy-MM-dd');
  console.log('Aktuální měsíc (pro test filtru): ' + monthFirstIso + ' – ' + monthLastIso);
  console.log('---');

  rows.forEach((row) => {
    const startDateOnly = String(row.start).slice(0, 10);
    const endDateOnly = String(row.end).slice(0, 10);
    const passesFilter = startDateOnly <= monthLastIso && endDateOnly >= monthFirstIso;

    console.log(
      'id=' + row.id +
      ' | title="' + row.title + '"' +
      ' | typeof start=' + (typeof row.start) + ' hodnota=' + JSON.stringify(row.start) +
      ' | typeof end=' + (typeof row.end) + ' hodnota=' + JSON.stringify(row.end) +
      ' | start.slice(0,10)=' + startDateOnly +
      ' | end.slice(0,10)=' + endDateOnly +
      ' | type=' + row.type +
      ' | typeof all_day=' + (typeof row.all_day) + ' hodnota=' + JSON.stringify(row.all_day) +
      ' | prošlo by filtrem pro tento měsíc: ' + (passesFilter ? 'ANO' : 'NE')
    );
  });
}
