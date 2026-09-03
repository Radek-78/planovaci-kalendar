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
 * Zapíše řádek do `_audit_log` s LIBOVOLNÝM autorem — na rozdíl od audit_()
 * v 10_util.js (ta bere autora vždy z currentEmail_(), tedy z toho, kdo
 * skript zrovna pouští). Jen pro seedovací nástroje níže, kde je potřeba
 * simulovat akce různých uživatelů, ne jen jednoho (toho, kdo je spustil
 * z editoru).
 */
function _toolsAuditAs_(actorEmail, action, detail) {
  dbAppend_(SHEETS.AUDIT, {
    timestamp: nowIso_(),
    user: actorEmail,
    action: action,
    detail: detail,
  });
}

/**
 * Zapíše řádek do `events`/`event_comments` PŘÍMO přes dbAppend_ (ne přes
 * dbInsert_), ať jde nastavit created_by/owner_email/author_email na
 * libovolného uživatele — dbInsert_ by ho jinak vždy vynutil na
 * currentEmail_(). Doplní jen id/created_at/updated_at, pokud je `record`
 * sám neobsahuje; zbytek (owner_email, created_by…) si musí zavolání
 * doplnit samo.
 */
function _toolsInsertAs_(table, record) {
  const now = nowIso_();
  const complete = Object.assign({ id: uuid_(), created_at: now, updated_at: now }, record);
  dbAppend_(table, complete);
  return complete;
}

/** Přičte dny k datu RRRR-MM-DD, vrátí zase RRRR-MM-DD. Pomůcka pro TOOLS_ níže. */
function _toolsAddDays_(dateIso, days) {
  const d = new Date(dateIso + 'T00:00');
  d.setDate(d.getDate() + days);
  return Utilities.formatDate(d, TIMEZONE, 'yyyy-MM-dd');
}

/**
 * Vygeneruje testovací data od RŮZNÝCH uživatelů — nové události, komentáře
 * k nim od jiného uživatele, úpravu jedné události a smazání jiné — pro
 * ruční ověření systému Oznámení (zvoneček v kalendáři musí ukázat CIZÍ
 * akce, ne vlastní). Spuštěním čehokoliv přímo z editoru by jinak vždy
 * vyšlo, že akci udělal ten, kdo skript pouští (currentEmail_()) — pro
 * test oznámení je ale potřeba, aby akce vypadaly jako od někoho jiného.
 *
 * Použije REÁLNÉ uživatele z `_users` — musí jich tam už pár být založených
 * přes appku (role/oprávnění se neřeší, jen e-mail). S míň než dvěma nemá
 * test oznámení smysl (nebylo by koho označit za "někoho jiného").
 *
 * Postup po spuštění: přihlas se do appky pod jedním z použitých uživatelů
 * (jiným, než ukázal poslední řádek logu u „Upraveno/Smazáno jako…") a
 * zkontroluj zvoneček — měl by ukázat odznak a v panelu všechny akce, které
 * udělali OSTATNÍ.
 *
 * POZOR: spustit jen JEDNOU, jinak vzniknou duplicity (stejně jako
 * u TOOLS_vlozTestovaciUdalosti). Testovací řádky jde smazat ručně přímo
 * v listech `events`, `event_comments` a `_audit_log`.
 */
function TOOLS_vlozOznamovaciTestData() {
  const users = dbGetAll_(SHEETS.USERS)
    .map((u) => cleanEmail_(u.email))
    .filter(Boolean);

  if (users.length < 2) {
    console.log('V _users je jen ' + users.length + ' uživatel(ů) — pro test oznámení jich potřebuješ ' +
      'aspoň 2. Nejdřív založ uživatele v sekci Uživatelé v appce.');
    return;
  }
  console.log('Nalezení uživatelé (' + users.length + '): ' + users.join(', '));

  const today = todayIso_();
  const pick = (i) => users[i % users.length];

  // 1) Nové události od různých uživatelů, blízko dneška, ať jsou hned
  //    vidět v aktuálně zobrazeném měsíci mřížky.
  const plan = [
    { offsetDays: 1, start: '10:00', end: '11:00', allDay: false, type: 'meeting', title: 'Plánovací schůzka týmu' },
    { offsetDays: 2, start: '09:00', end: '10:00', allDay: false, type: 'trip', title: 'Cesta za zákazníkem' },
    { offsetDays: 3, start: '00:00', end: '23:59', allDay: true, type: 'homeoffice', title: 'Home office' },
    { offsetDays: -1, start: '14:00', end: '15:00', allDay: false, type: 'default', title: 'Proběhlá konzultace' },
  ];

  const created = [];
  plan.forEach((p, i) => {
    const date = _toolsAddDays_(today, p.offsetDays);
    const owner = pick(i);
    const start = date + 'T' + p.start;
    const end = date + 'T' + p.end;

    const record = _toolsInsertAs_(SHEETS.EVENTS, {
      start: start, end: end, all_day: p.allDay, type: p.type, title: p.title,
      description: 'Testovací událost pro ověření systému Oznámení.',
      owner_email: owner, created_by: owner, updated_by: owner,
    });
    created.push({ id: record.id, title: p.title, owner: owner });
    _toolsAuditAs_(owner, 'event.create', 'Vytvořena událost „' + p.title + '" (' + start + ' – ' + end + ')');
    console.log('Vytvořena událost „' + p.title + '" jako ' + owner);
  });

  // 2) Komentáře k prvním dvěma událostem — vždy od JINÉHO uživatele, než
  //    je jejich vlastník.
  created.slice(0, 2).forEach((ev) => {
    const commenter = users.find((u) => u !== ev.owner) || users[0];
    const text = 'Díky za info, počítám s tím.';
    const comment = _toolsInsertAs_(SHEETS.EVENT_COMMENTS, {
      event_id: ev.id, author_email: commenter, text: text,
    });
    _toolsAuditAs_(commenter, 'comment.create', 'Komentář k události ' + ev.id + ': ' + text);
    console.log('Přidán komentář k „' + ev.title + '" jako ' + commenter + ' (id=' + comment.id + ')');
  });

  // 3) Úprava první vytvořené události — jiným uživatelem, než je vlastník.
  if (created.length) {
    const target = created[0];
    const editor = users.find((u) => u !== target.owner) || users[0];
    dbUpdate_(SHEETS.EVENTS, target.id, {
      description: 'Upraveno — změna místa konání.',
      updated_by: editor,
    });
    _toolsAuditAs_(editor, 'event.update', 'Upravena událost „' + target.title + '"');
    console.log('Upravena událost „' + target.title + '" jako ' + editor);
  }

  // 4) Smazání — vlastní zahazovací událost, ať vznikne SKUTEČNÝ create+delete
  //    pár (ne osamocený audit řádek bez odpovídajících dat v events).
  const throwawayOwner = pick(4);
  const throwaway = _toolsInsertAs_(SHEETS.EVENTS, {
    start: today + 'T16:00', end: today + 'T16:30', all_day: false, type: 'default',
    title: 'Zrušená schůzka', description: '',
    owner_email: throwawayOwner, created_by: throwawayOwner, updated_by: throwawayOwner,
  });
  const deleter = users.find((u) => u !== throwawayOwner) || users[0];
  dbDelete_(SHEETS.EVENTS, throwaway.id);
  _toolsAuditAs_(deleter, 'event.delete', 'Smazána událost „Zrušená schůzka" (' + throwaway.id + ')');
  console.log('Smazána zkušební událost „Zrušená schůzka" jako ' + deleter);

  console.log('---');
  console.log('Hotovo — vytvořeno ' + created.length + ' událostí, 2 komentáře, 1 úprava, 1 smazání.');
  console.log('Teď se přihlas do appky pod některým z uživatelů výše a zkontroluj zvoneček s oznámeními ' +
    '(uvidíš jen akce OSTATNÍCH, ne svoje vlastní).');
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
