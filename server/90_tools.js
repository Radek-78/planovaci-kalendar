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
 * ověřit oznámení (zvoneček) i odznak počtu nových akcí u jednotlivých
 * událostí (`.day-event-badge` v seznamu dne — viz `unseenActionCount`
 * v `apiGetEvents`, 50_api.js) — obojí čte stejnou `_event_views`, takže
 * oznámení k události zmizí až jejím skutečným otevřením, ne kliknutím
 * na zvoneček.
 *
 * Trik: Apps Script vždy spouští skript jako TEBE (currentEmail_()) —
 * přihlásit se fyzicky pod cizím účtem nejde. Testovací řádky se proto
 * zapisují napřímo (`dbAppend_`, ne `dbInsert_` — ten by `owner_email`/
 * `created_by`/`user` vždy vynutil na currentEmail_()) s hodnotami
 * nastavenými na DRUHÉHO uživatele z `_users`. Appka je po tvém přihlášení
 * uvidí přesně tak, jako by je fakt udělal někdo jiný.
 *
 * Vytvoří čtyři události pokrývající různé zobrazení odznaku:
 *   1) krátký název, TŘI komentáře → odznak "3",
 *   2) záměrně dlouhý název, DVĚ úpravy → odznak "2" + test zkracování
 *      názvu v seznamu dne (viz .day-event-title-row strong v CSS),
 *   3) krátký název, jedna úprava → odznak "1",
 *   4) založená a hned smazaná — test oznámení o smazání ve zvonečku
 *      (žádný odznak, událost už neexistuje).
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

  /** Založí testovací událost jako `other` a rovnou zaloguje event.create. */
  function createTestEvent(title, startTime, endTime, type) {
    const record = {
      id: uuid_(), start: tomorrow + 'T' + startTime, end: tomorrow + 'T' + endTime, all_day: false,
      type: type, title: title, description: 'Vytvořeno nástrojem TOOLS_vytvorTestovaciOznameni.',
      owner_email: other, recurrence_id: '', created_at: now, created_by: other, updated_at: now, updated_by: '',
    };
    dbAppend_(SHEETS.EVENTS, record);
    dbAppend_(SHEETS.AUDIT, {
      timestamp: now, user: other, action: 'event.create',
      detail: 'Vytvořena událost „' + title + '" (' + formatDateTimeCz_(record.start) + ' – ' + formatDateTimeCz_(record.end) + ')',
      entity_id: record.id,
    });
    return record;
  }

  // 1) Krátký název, tři komentáře — test odznaku s vyšším číslem (3).
  const commented = createTestEvent('Testovací schůzka', '10:00', '11:00', 'meeting');
  ['Můžeš se prosím připojit?', 'Přidávám bod k agendě.', 'Potvrzuji účast.'].forEach((text) => {
    dbAppend_(SHEETS.EVENT_COMMENTS, { id: uuid_(), event_id: commented.id, author_email: other, text: text, created_at: now });
    dbAppend_(SHEETS.AUDIT, {
      timestamp: now, user: other, action: 'comment.create',
      detail: 'Nový komentář k události „Testovací schůzka": ' + text,
      entity_id: commented.id,
    });
  });
  console.log('1) „Testovací schůzka" — 3 komentáře (id=' + commented.id + ')');

  // 2) Záměrně dlouhý název, dvě úpravy — test odznaku (2) SOUČASNĚ se
  //    zkracováním dlouhého názvu v seznamu dne.
  const longTitled = createTestEvent(
    'Testovací konzultace s opravdu hodně dlouhým názvem, který se do řádku určitě nevejde',
    '13:00', '13:30', 'default');
  ['Upraveno — změna místa konání.', 'Upraveno — posunutý čas.'].forEach((desc) => {
    dbUpdate_(SHEETS.EVENTS, longTitled.id, { description: desc, updated_by: other });
    dbAppend_(SHEETS.AUDIT, {
      timestamp: now, user: other, action: 'event.update',
      detail: 'Upravena událost „' + longTitled.title + '"',
      entity_id: longTitled.id,
    });
  });
  console.log('2) Dlouhý název — 2 úpravy (id=' + longTitled.id + ')');

  // 3) Krátký název, jedna úprava — test odznaku s nejběžnější hodnotou (1).
  const editedOnce = createTestEvent('Testovací kontrola', '15:00', '15:30', 'important');
  dbUpdate_(SHEETS.EVENTS, editedOnce.id, { description: 'Upraveno — doplněný popis.', updated_by: other });
  dbAppend_(SHEETS.AUDIT, {
    timestamp: now, user: other, action: 'event.update',
    detail: 'Upravena událost „Testovací kontrola"',
    entity_id: editedOnce.id,
  });
  console.log('3) „Testovací kontrola" — 1 úprava (id=' + editedOnce.id + ')');

  // 4) Založená a hned smazaná — test oznámení o smazání ve zvonečku.
  //    Vlastní create se do auditu záměrně nezapisuje (stejný princip jako
  //    u reálného smazání — apiDeleteEvent taky loguje jen samotné smazání).
  const deleted = createTestEvent('Zrušená testovací schůzka', '17:00', '17:30', 'default');
  dbDelete_(SHEETS.EVENTS, deleted.id);
  dbAppend_(SHEETS.AUDIT, {
    timestamp: now, user: other, action: 'event.delete',
    detail: 'Smazána událost „Zrušená testovací schůzka"',
    entity_id: deleted.id,
  });
  console.log('4) Založena a hned smazána „Zrušená testovací schůzka"');

  console.log('---');
  console.log('Hotovo. Otevři appku pod ' + me + ', zkontroluj zvoneček a v seznamu zítřejšího dne odznaky ' +
    'vedle Upravit/Smazat: „Testovací schůzka" 3, dlouhý název 2 (a zkrácený výpustkou), „Testovací ' +
    'kontrola" 1. Klik na oznámení/otevření události odznak i položku ve zvonečku odškrtne.');
}
