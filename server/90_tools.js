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
 * volat z prohlížeče, byl by přístup k testovacím datům dostupný komukoliv,
 * kdo umí otevřít konzoli.
 */

/**
 * Vloží sadu testovacích akcí OD JINÉHO uživatele, ať jde v appce rovnou
 * ověřit oznámení (zvoneček) — konkrétně nový způsob vyhodnocení přes
 * `_event_views` (viz `_computeNotifications_` v 50_api.js): oznámení
 * k události zmizí až jejím skutečným otevřením, ne kliknutím na zvoneček.
 *
 * Trik: Apps Script vždy spouští skript jako TEBE (currentEmail_()) —
 * přihlásit se fyzicky pod cizím účtem nejde. Testovací řádky se proto
 * zapisují napřímo (`dbAppend_`, ne `dbInsert_` — ten by `owner_email`/
 * `created_by`/`user` vždy vynutil na currentEmail_()) s hodnotami
 * nastavenými na DRUHÉHO uživatele z `_users`. Appka je po tvém přihlášení
 * uvidí přesně tak, jako by je fakt udělal někdo jiný.
 *
 * Vytvoří čtyři akce, které dohromady pokryjí všechny typy oznámení
 * vázané na konkrétní událost (`NOTIFY_ACTIONS_EVENT_SCOPED` v 00_config.js):
 *   1) nová událost,
 *   2) komentář k ní,
 *   3) další nová událost, hned upravená (test event.update),
 *   4) další nová událost, hned smazaná (test event.delete).
 *
 * Podmínka: v `_users` musí být kromě tebe aspoň jeden další uživatel.
 * Bezpečné spustit i opakovaně — každé spuštění jen přidá další sadu
 * testovacích dat, nic nepřepíše ani nesmaže.
 */
function TOOLS_vytvorTestovaciOznameni() {
  const me = currentEmail_();
  if (!me) {
    console.log('Nepodařilo se zjistit e-mail toho, kdo skript pouští (currentEmail_() je prázdné).');
    return;
  }

  const other = dbGetAll_(SHEETS.USERS)
    .map((u) => cleanEmail_(u.email))
    .find((email) => email && email !== me);

  if (!other) {
    console.log('V _users kromě tebe (' + me + ') není žádný další uživatel — není, za koho testovací ' +
      'akce vytvořit. Nejdřív založ v appce aspoň jednoho dalšího uživatele.');
    return;
  }
  console.log('Testovací akce vzniknou jako „' + other + '".');

  const today = todayIso_();
  const tomorrow = Utilities.formatDate(new Date(new Date(today + 'T00:00').getTime() + 86400000), TIMEZONE, 'yyyy-MM-dd');
  const now = nowLocalIso_();

  // 1) Nová událost.
  const created = {
    id: uuid_(), start: tomorrow + 'T10:00', end: tomorrow + 'T11:00', all_day: false,
    type: 'meeting', title: 'Testovací schůzka', description: 'Vytvořeno nástrojem TOOLS_vytvorTestovaciOznameni.',
    owner_email: other, recurrence_id: '', created_at: now, created_by: other, updated_at: now, updated_by: '',
  };
  dbAppend_(SHEETS.EVENTS, created);
  dbAppend_(SHEETS.AUDIT, {
    timestamp: now, user: other, action: 'event.create',
    detail: 'Vytvořena událost „Testovací schůzka" (' + formatDateTimeCz_(created.start) + ' – ' + formatDateTimeCz_(created.end) + ')',
    entity_id: created.id,
  });
  console.log('1) Vytvořena událost „Testovací schůzka" (id=' + created.id + ')');

  // 2) Komentář k ní.
  const comment = { id: uuid_(), event_id: created.id, author_email: other, text: 'Můžeš se prosím připojit?', created_at: now };
  dbAppend_(SHEETS.EVENT_COMMENTS, comment);
  dbAppend_(SHEETS.AUDIT, {
    timestamp: now, user: other, action: 'comment.create',
    detail: 'Nový komentář k události „Testovací schůzka": ' + comment.text,
    entity_id: created.id,
  });
  console.log('2) Přidán komentář k „Testovací schůzce"');

  // 3) Další nová událost, hned upravená — test event.update.
  const edited = {
    id: uuid_(), start: tomorrow + 'T14:00', end: tomorrow + 'T14:30', all_day: false,
    type: 'default', title: 'Testovací konzultace', description: '',
    owner_email: other, recurrence_id: '', created_at: now, created_by: other, updated_at: now, updated_by: '',
  };
  dbAppend_(SHEETS.EVENTS, edited);
  dbAppend_(SHEETS.AUDIT, {
    timestamp: now, user: other, action: 'event.create',
    detail: 'Vytvořena událost „Testovací konzultace" (' + formatDateTimeCz_(edited.start) + ' – ' + formatDateTimeCz_(edited.end) + ')',
    entity_id: edited.id,
  });
  dbUpdate_(SHEETS.EVENTS, edited.id, { description: 'Upraveno — změna místa konání.', updated_by: other });
  dbAppend_(SHEETS.AUDIT, {
    timestamp: now, user: other, action: 'event.update',
    detail: 'Upravena událost „Testovací konzultace"',
    entity_id: edited.id,
  });
  console.log('3) Založena a hned upravena událost „Testovací konzultace" (id=' + edited.id + ')');

  // 4) Další nová událost, hned smazaná — test event.delete. Vlastní create
  //    se do auditu záměrně nezapisuje (stejný princip jako u reálného
  //    smazání — apiDeleteEvent taky loguje jen samotné smazání).
  const deleted = {
    id: uuid_(), start: tomorrow + 'T16:00', end: tomorrow + 'T16:30', all_day: false,
    type: 'default', title: 'Zrušená testovací schůzka', description: '',
    owner_email: other, recurrence_id: '', created_at: now, created_by: other, updated_at: now, updated_by: '',
  };
  dbAppend_(SHEETS.EVENTS, deleted);
  dbDelete_(SHEETS.EVENTS, deleted.id);
  dbAppend_(SHEETS.AUDIT, {
    timestamp: now, user: other, action: 'event.delete',
    detail: 'Smazána událost „Zrušená testovací schůzka"',
    entity_id: deleted.id,
  });
  console.log('4) Založena a hned smazána „Zrušená testovací schůzka"');

  console.log('---');
  console.log('Hotovo. Otevři appku pod ' + me + ' a zkontroluj zvoneček — mělo by se objevit všech ' +
    'pět akcí výše (u „Testovací konzultace" dvě samostatné, vytvoření i úprava). Klik na položku ' +
    'otevře danou událost a TÍM oznámení k ní zmizí — u „Zrušené testovací schůzky" žádný klik nejde, ' +
    'ta v seznamu zůstane jako čistě informační záznam o smazání.');
}
