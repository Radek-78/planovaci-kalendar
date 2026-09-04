/**
 * ════════════════════════════════════════════════════════════════════════════
 *  50_api.js — veřejné API volané z prohlížeče
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Vše, co je odsud volatelné přes google.script.run, MUSÍ projít guard_().
 * Bez guardu by šel endpoint zavolat přímo z konzole prohlížeče, i kdyby
 * v UI žádné tlačítko neexistovalo.
 *
 * Stav: bootstrap, události (čtení/vytváření/úprava/mazání), komentáře
 * k události (čtení/přidání/smazání vlastního), uživatelé (čtení/vytváření/
 * úprava/deaktivace). Nastavení zatím chybí — přibude v dalším kroku podle
 * SPECIFIKACE.md.
 */

/**
 * Základní data po otevření aplikace: kdo jsem, co smím, jak se aplikace
 * jmenuje a jaké typy událostí existují.
 *
 * Oprávnění jsou vyhodnocená na SERVERU a klientovi se posílá už jen
 * výsledek (true/false). Klient tak nikdy nerozhoduje o právech sám —
 * jen podle nich skrývá ovládací prvky, které by stejně skončily chybou.
 */
function apiGetBootstrap() {
  return guard_(PERM_KEYS.CALENDAR_READ, (user) => {
    const settings = settingsAll_();

    return {
      user: publicUser_(user),
      permissions: {
        canWrite: isAllowed_(user, PERM_KEYS.CALENDAR_WRITE),
        canManageUsers: isAllowed_(user, PERM_KEYS.USERS_MANAGE),
        canManageSettings: isAllowed_(user, PERM_KEYS.SETTINGS_MANAGE),
        canManageForeignEvents: canManageForeignEvents_(user),
        // Řídí, jestli klient smí nabídnout editaci/smazání už PROBĚHLÉ
        // události (viz canEditPastEvents_/nastavení pastEditAdminOnly) —
        // server si to i tak ověří znovu při každém uložení/smazání.
        canEditPastEvents: canEditPastEvents_(user, settings),
      },
      settings: {
        appName: settings.appName,
        appSubtitle: settings.appSubtitle,
        holidaysEnabled: settings.holidaysEnabled,
      },
      eventTypes: _eventTypesMap_(),
      // Co je nového od poslední návštěvy — viz _computeNotifications_.
      // Jen ČTENÍ — last_visit_at se posouvá až explicitně kliknutím na
      // zvoneček (apiMarkNotificationsSeen), ne tady, viz komentář tam.
      notifications: _computeNotifications_(user),
      // Jen pro nápovědu při vyplňování formuláře (automatické doplnění
      // uživatelského jména) — skutečná kontrola domény je vždy na serveru
      // v apiSaveUser, klient si ji tady jen zobrazuje/napovídá.
      allowedEmailDomain: CONFIG.allowedEmailDomain,
      version: CONFIG.version,
      releaseDate: CONFIG.releaseDate,
    };
  });
}

/**
 * Spočítá oznámení pro přihlášeného uživatele — všechno z auditního logu
 * (`_audit_log`), co se stalo PO jeho posledním `last_visit_at`, kromě
 * jeho vlastních akcí (svoje změny si nikdo nepotřebuje připomínat), a jen
 * akce z whitelistu NOTIFY_ACTIONS (správa uživatelů se do oznámení
 * záměrně nepočítá, viz 00_config.js).
 *
 * ČISTÉ ČTENÍ — `last_visit_at` NEMĚNÍ (na rozdíl od dřívější verze). Dřív
 * se posouval už tady, při každém otevření appky, bez ohledu na to, jestli
 * si uživatel oznámení vůbec všiml — kdo appku jen otevřel a zase zavřel,
 * o nich nenávratně přišel. Teď se posouvá až explicitním kliknutím na
 * zvoneček (viz apiMarkNotificationsSeen), takže oznámení čekají, dokud
 * je uživatel opravdu neuvidí.
 *
 * Prázdný last_visit_at (úplně první návštěva nového uživatele) se bere
 * jako „teď" — nedostane tak nálož oznámení o celé historii appky před sebou.
 */
function _computeNotifications_(user) {
  const row = dbFindById_(SHEETS.USERS, user.id);
  // MÍSTNÍ čas (ne nowIso_/UTC) — _audit_log.timestamp je taky v místním
  // čase (viz audit_() v 10_util.js), jinak by textové porovnání o řádek
  // níž bylo posunuté o časový rozdíl Europe/Prague od UTC.
  const previousVisit = row && row.last_visit_at ? String(row.last_visit_at) : nowLocalIso_();

  const matching = dbGetAll_(SHEETS.AUDIT)
    .filter((r) => NOTIFY_ACTIONS.indexOf(String(r.action)) !== -1)
    .filter((r) => String(r.timestamp) > previousVisit)
    .filter((r) => cleanEmail_(r.user) !== user.email)
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0)); // nejnovější nahoře

  const nameCache = {};
  const items = matching.slice(0, LIMITS.NOTIFY_MAX_ITEMS).map((r) => ({
    action: String(r.action),
    detail: String(r.detail),
    actorName: _resolveUserName_(r.user, nameCache),
    timestamp: String(r.timestamp),
    // Id UDÁLOSTI, ke které se oznámení vztahuje — proklik na klientovi
    // (viz #calNotifyList) jím otevře detail té konkrétní události.
    // Prázdné jen u starších řádků logu z doby před přidáním entity_id.
    entityId: String(r.entity_id || ''),
  }));

  return { unseenCount: matching.length, items: items };
}

/**
 * Označí oznámení za viděná — posune `last_visit_at` přihlášeného
 * uživatele na teď. Volá se z klienta přesně v okamžiku, kdy uživatel
 * OTEVŘE modal se zvonečkem (#notifyModal), ne při každém otevření appky
 * (viz _computeNotifications_) — teprve tehdy appka ví, že si oznámení
 * doopravdy prohlédl, ne jen že appku má puštěnou.
 */
function apiMarkNotificationsSeen() {
  return guard_(PERM_KEYS.CALENDAR_READ, (user) => {
    dbUpdate_(SHEETS.USERS, user.id, { last_visit_at: nowLocalIso_() });
    return null;
  });
}

/**
 * Vytvoří novou událost, nebo upraví existující (payload.id = úprava, stejný
 * vzor jako apiSaveUser). Smí jen ten, kdo má právo zápisu (calendar_write) —
 * VIEWER kalendář jen čte. Vlastník se bere ze SESSION, nikdy z payloadu,
 * a u úpravy zůstává neměnný (není v `fields` níže).
 *
 * Úprava cizí události smí jen ten, kdo smí spravovat cizí události
 * (ADMIN/SUPERADMIN — canManageForeignEvents_), stejná logika jako
 * u komentářů. Založit novou událost do minulosti nejde NIKDY (bez ohledu
 * na roli) — ale upravit/přesunout do minulosti UŽ EXISTUJÍCÍ událost smí
 * ten, komu to dovolí canEditPastEvents_ (řízené nastavením
 * pastEditAdminOnly, viz SPECIFIKACE.md kapitola 7.2).
 *
 * Opakující se událost (viz SPECIFIKACE.md 9.9): `payload.recurrence`
 * u NOVÉ události ({ freq, count? nebo until? }) založí celou sérii
 * najednou (_saveRecurringEvent_). `payload.scope` u ÚPRAVY existujícího
 * výskytu ze série rozhoduje mezi „jen tuto" (výchozí — a zároveň ji
 * odpojí ze série, stejný princip jako v běžných kalendářích) a „tuto
 * a všechny následující" (_saveFollowingOccurrences_).
 *
 * @param {Object} payload  { id?, start, end, allDay, type, title, description,
 *                            recurrence?, scope? } — start/end RRRR-MM-DDTHH:mm
 */
function apiSaveEvent(payload) {
  return guard_(PERM_KEYS.CALENDAR_WRITE, (user) => {
    const data = payload || {};
    const id = data.id ? String(data.id) : null;
    const scope = data.scope === 'following' ? 'following' : 'single';
    const existing = id ? dbFindById_(SHEETS.EVENTS, id) : null;
    if (id && !existing) {
      throw userError_('Událost nebyla nalezena — mohl ji mezitím upravit někdo jiný.');
    }

    if (existing) {
      const isOwner = cleanEmail_(existing.owner_email) === user.email;
      if (!isOwner && !canManageForeignEvents_(user)) {
        throw userError_('Nemáte oprávnění upravit cizí událost.');
      }
    }

    const start = cleanDateTime_(data.start, 'Začátek');
    const end = cleanDateTime_(data.end, 'Konec');
    const allDay = data.allDay === true;
    const type = pickFrom_(data.type, Object.keys(_eventTypesMap_()), 'Typ');
    const title = cleanText_(data.title, 'Název', LIMITS.TITLE_MAX, true);
    const description = cleanText_(data.description, 'Popis', LIMITS.DESCRIPTION_MAX, false);

    if (end <= start) {
      throw userError_('Konec musí být později než začátek.');
    }

    const startDate = start.slice(0, 10);
    const endDate = end.slice(0, 10);
    const dayCount = Math.round(
      (new Date(endDate + 'T00:00') - new Date(startDate + 'T00:00')) / 86400000
    ) + 1;
    if (dayCount > LIMITS.EVENT_MAX_DAYS) {
      throw userError_('Událost může trvat nejvýše ' + LIMITS.EVENT_MAX_DAYS + ' dní.');
    }

    if (startDate < todayIso_()) {
      if (!existing) {
        throw userError_('Událost nelze založit do minulosti.');
      }
      if (!canEditPastEvents_(user, settingsAll_())) {
        throw userError_('Proběhlou událost může upravit jen administrátor.');
      }
    }

    const fields = {
      start: start,
      end: end,
      all_day: allDay,
      type: type,
      title: title,
      description: description,
    };

    const whenText = formatDateTimeCz_(start) + ' – ' + formatDateTimeCz_(end);

    if (!existing && data.recurrence) {
      return _saveRecurringEvent_(user, fields, data.recurrence, startDate, dayCount, whenText);
    }

    if (existing && scope === 'following' && existing.recurrence_id) {
      return _saveFollowingOccurrences_(existing, fields, start, end, whenText);
    }

    let record;
    if (existing) {
      // „Jen tuto" u výskytu ze série ji odpojí (stane se samostatnou
      // událostí) — stejný princip jako v běžných kalendářích: úprava
      // jednoho výskytu ho vyjme z hromadné správy série.
      const detach = existing.recurrence_id ? { recurrence_id: '' } : {};
      record = dbUpdate_(SHEETS.EVENTS, id, Object.assign({}, fields, detach));
      audit_('event.update', 'Upravena událost „' + title + '" (' + whenText + ')', id);
    } else {
      record = dbInsert_(SHEETS.EVENTS, Object.assign({ owner_email: user.email }, fields));
      audit_('event.create', 'Vytvořena událost „' + title + '" (' + whenText + ')', record.id);
    }

    return { id: record.id };
  });
}

/**
 * Smaže událost — vlastní, nebo (kdo smí spravovat cizí události) kteroukoli.
 * Proběhlou událost smí smazat jen ten, komu to dovolí canEditPastEvents_
 * (stejné pravidlo jako u úpravy, viz apiSaveEvent). Smaže se i všechny
 * komentáře k té události — jinak by v `event_comments` zůstaly osiřelé
 * řádky odkazující na neexistující událost.
 *
 * `payload.scope: 'following'` u výskytu opakující se série smaže tenhle
 * a všechny pozdější výskyty téže série (dřívější zůstanou) — výchozí
 * (`'single'`, i bez scope) smaže jen tenhle jeden.
 *
 * @param {Object} payload  { id, scope? }
 */
function apiDeleteEvent(payload) {
  return guard_(PERM_KEYS.CALENDAR_WRITE, (user) => {
    const data = payload || {};
    const id = cleanText_(data.id, 'ID události', 100, true);
    const scope = data.scope === 'following' ? 'following' : 'single';

    const event = dbFindById_(SHEETS.EVENTS, id);
    if (!event) {
      throw userError_('Událost nebyla nalezena — možná ji mezitím smazal někdo jiný.');
    }

    const isOwner = cleanEmail_(event.owner_email) === user.email;
    if (!isOwner && !canManageForeignEvents_(user)) {
      throw userError_('Můžete mazat jen vlastní události.');
    }

    if (String(event.start).slice(0, 10) < todayIso_() && !canEditPastEvents_(user, settingsAll_())) {
      throw userError_('Proběhlou událost může smazat jen administrátor.');
    }

    const targets = scope === 'following' && event.recurrence_id
      ? dbGetAll_(SHEETS.EVENTS).filter((row) =>
          String(row.recurrence_id) === String(event.recurrence_id) &&
          String(row.start).slice(0, 10) >= String(event.start).slice(0, 10))
      : [event];

    targets.forEach((row) => {
      const rowId = String(row.id);
      dbGetAll_(SHEETS.EVENT_COMMENTS)
        .filter((c) => String(c.event_id) === rowId)
        .forEach((c) => dbDelete_(SHEETS.EVENT_COMMENTS, c.id));
      dbDelete_(SHEETS.EVENTS, rowId);
    });

    audit_('event.delete',
      targets.length > 1
        ? 'Smazána opakující se událost „' + event.title + '" (' + targets.length + '× od tohoto data dál)'
        : 'Smazána událost „' + event.title + '"',
      id);
    return null;
  });
}

/**
 * Založí celou sérii opakující se události najednou (dbInsertMany_) — jedno
 * sdílené recurrence_id, jeden souhrnný záznam v audit logu/oznámení místo
 * N jednotlivých. `dayCount`/čas dne zůstávají u všech výskytů stejné jako
 * u prvního (zadaného ve `fields.start`/`fields.end`), mění se jen DATUM
 * podle frekvence (viz _recurrenceOccurrenceDates_).
 *
 * @param {Object} recurrence  { freq: 'daily'|'weekly'|'biweekly'|'monthly', count? nebo until? }
 */
function _saveRecurringEvent_(user, fields, recurrence, startDate, dayCount, whenText) {
  const freq = pickFrom_((recurrence || {}).freq, ['daily', 'weekly', 'biweekly', 'monthly'], 'Frekvence opakování');
  const count = _recurrenceCount_(recurrence || {}, startDate, freq);

  const recurrenceId = uuid_();
  const startTime = fields.start.slice(11);
  const endTime = fields.end.slice(11);
  const occurrenceDates = _recurrenceOccurrenceDates_(startDate, freq, count);

  const records = occurrenceDates.map((occStartDate) => {
    const occEndDate = _addDaysToIsoDate_(occStartDate, dayCount - 1);
    return Object.assign({ owner_email: user.email, recurrence_id: recurrenceId }, fields, {
      start: occStartDate + 'T' + startTime,
      end: occEndDate + 'T' + endTime,
    });
  });

  const inserted = dbInsertMany_(SHEETS.EVENTS, records);
  audit_('event.create',
    'Vytvořena opakující se událost „' + fields.title + '" (' + whenText + ', ' + count + '× ' + _recurrenceFreqLabel_(freq) + ')',
    inserted[0].id);

  return { id: inserted[0].id };
}

/**
 * Upraví TENTO výskyt a všechny pozdější ve stejné sérii („tuto a všechny
 * následující") — datum každého výskytu zůstává jeho vlastní (jinak by se
 * všechny sesypaly na jeden den), mění se jen čas dne a délka trvání
 * (podle nově zadaného start/end u TOHOTO výskytu) a ostatní pole (název/
 * typ/popis/celý den) stejně pro všechny naráz. Dřívější výskyty (před
 * tímto) appka nikdy hromadně nemění, jen tenhle a novější.
 */
function _saveFollowingOccurrences_(existing, fields, start, end, whenText) {
  const startTime = start.slice(11);
  const endTime = end.slice(11);
  const dayCount = Math.round(
    (new Date(end.slice(0, 10) + 'T00:00') - new Date(start.slice(0, 10) + 'T00:00')) / 86400000
  ) + 1;

  const series = dbGetAll_(SHEETS.EVENTS).filter((row) =>
    String(row.recurrence_id) === String(existing.recurrence_id) &&
    String(row.start).slice(0, 10) >= String(existing.start).slice(0, 10));

  series.forEach((row) => {
    const occStartDate = String(row.start).slice(0, 10);
    const occEndDate = _addDaysToIsoDate_(occStartDate, dayCount - 1);
    dbUpdate_(SHEETS.EVENTS, String(row.id), Object.assign({}, fields, {
      start: occStartDate + 'T' + startTime,
      end: occEndDate + 'T' + endTime,
    }));
  });

  audit_('event.update',
    'Upravena opakující se událost „' + fields.title + '" (' + whenText + ', ' + series.length + '× od tohoto data dál)',
    existing.id);

  return { id: existing.id };
}

/** Datum n-tého výskytu (0 = první, sám startDate) opakující se události dané frekvence — čistě datová aritmetika, žádný čas. */
function _recurrenceStepDate_(startDate, freq, n) {
  if (n === 0) return startDate;
  if (freq === 'daily') return _addDaysToIsoDate_(startDate, n);
  if (freq === 'weekly') return _addDaysToIsoDate_(startDate, n * 7);
  if (freq === 'biweekly') return _addDaysToIsoDate_(startDate, n * 14);
  if (freq === 'monthly') return _addMonthsToIsoDate_(startDate, n);
  throw userError_('Neplatná frekvence opakování.');
}

/** Data (RRRR-MM-DD) všech `count` výskytů opakující se události, od startDate. */
function _recurrenceOccurrenceDates_(startDate, freq, count) {
  const dates = [];
  for (let i = 0; i < count; i++) dates.push(_recurrenceStepDate_(startDate, freq, i));
  return dates;
}

/**
 * Počet výskytů opakující se události — buď přímo zadaný (recurrence.count),
 * nebo dopočítaný z recurrence.until (poslední den, kdy má ještě vzniknout
 * výskyt). Právě jedno z obojí musí přijít z klienta. Vždy omezeno na
 * LIMITS.RECURRENCE_MAX_COUNT, ať appka nevygeneruje neúnosně dlouhou sérii
 * (např. kvůli překlepu v „Do data" o pár desítek let dál).
 */
function _recurrenceCount_(recurrence, startDate, freq) {
  if (recurrence.count) {
    const count = parseInt(recurrence.count, 10);
    if (!count || count < 1) throw userError_('Počet výskytů musí být kladné číslo.');
    if (count > LIMITS.RECURRENCE_MAX_COUNT) {
      throw userError_('Opakování může mít nejvýše ' + LIMITS.RECURRENCE_MAX_COUNT + ' výskytů.');
    }
    return count;
  }
  if (recurrence.until) {
    const until = cleanDateOnly_(recurrence.until, 'Konec opakování');
    if (until < startDate) throw userError_('Konec opakování musí být až po datu začátku.');
    let count = 1;
    while (count <= LIMITS.RECURRENCE_MAX_COUNT && _recurrenceStepDate_(startDate, freq, count) <= until) count++;
    return count;
  }
  throw userError_('Zadejte počet opakování, nebo datum konce.');
}

/** Český popisek frekvence opakování pro audit log/oznámení. */
function _recurrenceFreqLabel_(freq) {
  return { daily: 'denně', weekly: 'týdně', biweekly: 'co 2 týdny', monthly: 'měsíčně' }[freq] || freq;
}

/**
 * Přidá dny k datu RRRR-MM-DD — přes bezpečnou UTC aritmetiku
 * _addDaysToDate_ (viz výše, u státních svátků), jen ve tvaru pro
 * datum-jako-řetězec, se kterým pracuje zbytek téhle funkce.
 */
function _addDaysToIsoDate_(isoDate, deltaDays) {
  const parts = isoDate.split('-').map(Number);
  const shifted = _addDaysToDate_(parts[0], parts[1], parts[2], deltaDays);
  return shifted.year + '-' + _pad2_(shifted.month) + '-' + _pad2_(shifted.day);
}

/**
 * Přidá měsíce k datu RRRR-MM-DD — den v měsíci ořízne na poslední platný
 * den cílového měsíce (např. 31. 1. + 1 měsíc => 28./29. 2., NE automatické
 * přetečení do března, jak by to udělal obyčejný `new Date(y, m+1, 31)`).
 * Čistě celočíselná aritmetika + `Date.UTC` jen pro zjištění počtu dní
 * v cílovém měsíci — žádný lokální čas, stejný princip jako u svátků.
 */
function _addMonthsToIsoDate_(isoDate, months) {
  const parts = isoDate.split('-').map(Number);
  const totalMonths = (parts[0] * 12 + (parts[1] - 1)) + months;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = totalMonths % 12; // 0-11
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const day = Math.min(parts[2], lastDayOfTargetMonth);
  return targetYear + '-' + _pad2_(targetMonth + 1) + '-' + _pad2_(day);
}

/**
 * Události protínající zadaný rozsah dat (typicky 42denní zobrazená mřížka).
 *
 * Vyhodnocuje se jako PRŮNIK, ne „start uvnitř rozsahu" — jinak by vícedenní
 * událost začínající v minulém měsíci v aktuální mřížce chyběla.
 *
 * @param {Object} payload  { startDate, endDate } — obě RRRR-MM-DD
 */
function apiGetEvents(payload) {
  return guard_(PERM_KEYS.CALENDAR_READ, () => {
    const data = payload || {};
    const from = cleanDateOnly_(data.startDate, 'Od');
    const to = cleanDateOnly_(data.endDate, 'Do');
    if (from > to) throw userError_('Rozsah dat je neplatný.');

    const nameCache = {};
    const eventTypes = _eventTypesMap_();

    return dbGetAll_(SHEETS.EVENTS)
      .filter((row) => {
        const start = String(row.start).slice(0, 10);
        const end = String(row.end).slice(0, 10);
        return start <= to && end >= from;
      })
      .map((row) => ({
        id: String(row.id),
        start: String(row.start),
        end: String(row.end),
        allDay: toBool_(row.all_day),
        // Neplatný/starý typ v datech (např. mezitím smazaný v Nastavení)
        // se nezobrazí rozbitě — spadne do "default", který nejde smazat
        // (viz apiDeleteEventType) a existuje tak vždycky.
        type: eventTypes[row.type] ? String(row.type) : 'default',
        title: String(row.title || ''),
        description: String(row.description || ''),
        ownerEmail: String(row.owner_email || ''),
        ownerName: _resolveUserName_(row.owner_email, nameCache),
        // Prázdné u jednorázové události, jinak sdílené napříč výskyty
        // jedné opakující se série (viz DB_SCHEMA.events v 20_db.js) —
        // klient podle toho pozná, že má u úpravy/smazání nabídnout volbu
        // „jen tuto" / „tuto a všechny následující" (viz openEventFormModal).
        recurrenceId: String(row.recurrence_id || ''),
      }))
      .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  });
}

/**
 * Jméno uživatele pro zobrazení — z `_users`, jinak e-mail jako záloha.
 * `cache` drží výsledky v rámci jednoho volání, ať se stejný e-mail
 * neprohledává v tabulce opakovaně.
 */
function _resolveUserName_(email, cache) {
  const low = cleanEmail_(email);
  if (cache[low] !== undefined) return cache[low];

  const user = dbFindBy_(SHEETS.USERS, 'email', low);
  const fullName = user ? (String(user.firstName || '') + ' ' + String(user.lastName || '')).trim() : '';
  cache[low] = fullName || low;
  return cache[low];
}

/* ══════════════════════════════════════════════════════════════════════════
   KOMENTÁŘE K UDÁLOSTI

   Přístupné každému, kdo vidí kalendář (CALENDAR_READ) — i uživateli jen
   se čtením. Komentář smí smazat jen autor, nebo kdo smí spravovat cizí
   události (ADMIN/SUPERADMIN) — stejná logika jako u samotných událostí.
   ══════════════════════════════════════════════════════════════════════════ */

/** Komentáře k jedné události, seřazené od nejstaršího. */
function apiGetEventComments(payload) {
  return guard_(PERM_KEYS.CALENDAR_READ, (user) => {
    const data = payload || {};
    const eventId = cleanText_(data.eventId, 'ID události', 100, true);
    const nameCache = {};

    return dbGetAll_(SHEETS.EVENT_COMMENTS)
      .filter((row) => String(row.event_id) === eventId)
      .map((row) => _publicComment_(row, user, nameCache))
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
  });
}

/** Přidá komentář k události. Vrací rovnou vytvořený komentář (bez dalšího čtení). */
function apiAddEventComment(payload) {
  return guard_(PERM_KEYS.CALENDAR_READ, (user) => {
    const data = payload || {};
    const eventId = cleanText_(data.eventId, 'ID události', 100, true);
    const text = cleanText_(data.text, 'Komentář', LIMITS.COMMENT_MAX, true);

    // Nejde komentovat neexistující (např. smazanou) událost.
    const event = dbFindById_(SHEETS.EVENTS, eventId);
    if (!event) {
      throw userError_('Událost nebyla nalezena.');
    }

    const comment = dbInsert_(SHEETS.EVENT_COMMENTS, {
      event_id: eventId,
      author_email: user.email,
      text: text,
    });

    audit_('comment.create', 'Nový komentář k události „' + event.title + '": ' + text.slice(0, 80), eventId);

    return _publicComment_(comment, user, {});
  });
}

/** Smaže komentář — jen vlastní, nebo (ADMIN/SUPERADMIN) kterýkoli. */
function apiDeleteEventComment(payload) {
  return guard_(PERM_KEYS.CALENDAR_READ, (user) => {
    const data = payload || {};
    const id = cleanText_(data.id, 'ID komentáře', 100, true);

    const comment = dbFindById_(SHEETS.EVENT_COMMENTS, id);
    if (!comment) {
      throw userError_('Komentář nebyl nalezen — možná ho mezitím smazal někdo jiný.');
    }

    const isOwner = cleanEmail_(comment.author_email) === user.email;
    if (!isOwner && !canManageForeignEvents_(user)) {
      throw userError_('Můžete mazat jen vlastní komentáře.');
    }

    const parentEvent = dbFindById_(SHEETS.EVENTS, comment.event_id);
    const eventTitle = parentEvent ? parentEvent.title : '(smazaná událost)';

    dbDelete_(SHEETS.EVENT_COMMENTS, id);
    audit_('comment.delete', 'Smazán komentář k události „' + eventTitle + '"', comment.event_id);
    return null;
  });
}

/** Přemění řádek/nově vytvořený záznam komentáře na podobu pro klienta. */
function _publicComment_(row, user, nameCache) {
  const authorEmail = cleanEmail_(row.author_email);
  return {
    id: String(row.id),
    authorEmail: authorEmail,
    authorName: _resolveUserName_(row.author_email, nameCache),
    text: String(row.text),
    createdAt: String(row.created_at),
    canDelete: authorEmail === user.email || canManageForeignEvents_(user),
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   UŽIVATELÉ

   Přístupné jen SUPERADMIN/ADMIN (users_manage). apiSaveUser slouží na
   VYTVOŘENÍ i ÚPRAVU (s payload.id = úprava, stejný vzor jako u budoucího
   apiSaveEvent), apiSetUserActive na deaktivaci/reaktivaci (viz
   SPECIFIKACE.md kapitola 8 a bezpečnostní bod 14 — nejde odebrat roli ani
   deaktivovat posledního aktivního superadmina).
   ══════════════════════════════════════════════════════════════════════════ */

/** Kolik aktivních uživatelů má právě roli SUPERADMIN — pojistka proti nenávratnému uzamčení appky. */
function _activeSuperadminCount_() {
  return dbGetAll_(SHEETS.USERS)
    .filter((row) => row.role === ROLES.SUPERADMIN && toBool_(row.active))
    .length;
}

/**
 * Seznam všech uživatelů, seřazený podle data vytvoření — od nejstaršího.
 * Řadí se podle syrového created_at (chráněný textový sloupec, viz
 * TEXT_COLUMNS — čistý ISO řetězec, bezpečně porovnatelný lexikograficky)
 * ještě PŘED převodem na veřejnou podobu, takže createdAt nemusí chodit
 * na klienta.
 */
function apiGetUsers() {
  return guard_(PERM_KEYS.USERS_MANAGE, () => {
    return dbGetAll_(SHEETS.USERS)
      .slice()
      .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')))
      .map(_publicUserRow_);
  });
}

/**
 * Vytvoří nového uživatele, nebo upraví existujícího (payload.id = úprava,
 * stejný vzor jako plánovaný apiSaveEvent). Roli SUPERADMIN smí přidělit
 * jen SUPERADMIN — jinak by si ADMIN mohl sám sobě nebo komukoli přidat
 * nejvyšší oprávnění. Odebrat roli SUPERADMIN poslednímu aktivnímu
 * superadminovi nejde (bezpečnostní bod 14 v SPECIFIKACI.md) — appka by se
 * tím nenávratně uzamkla, protože jen SUPERADMIN smí přidělovat SUPERADMIN.
 *
 * E-mail je u ÚPRAVY neměnný a payload.email se ignoruje — na e-mailu jsou
 * navázané starší události a komentáře (owner_email/author_email, viz
 * _resolveUserName_), jeho změna by je odpojila od jména. Kdo si spletl
 * doménu, musí založit nový účet a starý deaktivovat, ne přejmenovat.
 *
 * Umístění/Oddělení/Pozice jsou zatím volný text (nepovinný) — Umístění se
 * později nahradí výběrem z importovaného seznamu logistických center,
 * Oddělení/Pozice výběrem ze seznamu spravovaného v Nastavení.
 *
 * @param {Object} payload  { id?, email, firstName, lastName, role,
 *                            permission, location, department, position }
 */
function apiSaveUser(payload) {
  return guard_(PERM_KEYS.USERS_MANAGE, (user) => {
    const data = payload || {};
    const id = data.id ? String(data.id) : null;
    const existing = id ? dbFindById_(SHEETS.USERS, id) : null;
    if (id && !existing) {
      throw userError_('Uživatel nebyl nalezen — mohl ho mezitím upravit někdo jiný.');
    }
    // Účet superadmina smí upravit jen jiný superadmin — jinak by ADMIN mohl
    // superadminovi sebrat roli, aniž by mu ji SUPERADMIN kdy sám přidělil.
    if (existing && existing.role === ROLES.SUPERADMIN && user.role !== ROLES.SUPERADMIN) {
      throw userError_('Jen správce aplikace může upravit účet jiného správce.');
    }

    // E-mail: u nové osoby se validuje a kontroluje na duplicitu, u úpravy
    // se převezme beze změny z existujícího záznamu (viz komentář výše).
    let email;
    if (existing) {
      email = String(existing.email);
    } else {
      email = cleanEmail_(data.email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw userError_('Zadejte platný e-mail.');
      }
      if (!email.endsWith('@' + CONFIG.allowedEmailDomain)) {
        throw userError_('E-mail musí být z domény @' + CONFIG.allowedEmailDomain + '.');
      }
      if (dbFindBy_(SHEETS.USERS, 'email', email)) {
        throw userError_('Uživatel s tímto e-mailem už existuje.');
      }
    }

    const firstName = cleanText_(data.firstName, 'Jméno', LIMITS.NAME_MAX, true);
    const lastName = cleanText_(data.lastName, 'Příjmení', LIMITS.NAME_MAX, true);
    const role = pickFrom_(data.role, Object.keys(ROLES), 'Role');

    if (role === ROLES.SUPERADMIN && user.role !== ROLES.SUPERADMIN) {
      throw userError_('Jen správce aplikace může vytvořit dalšího správce.');
    }
    if (existing && existing.role === ROLES.SUPERADMIN && toBool_(existing.active)
        && role !== ROLES.SUPERADMIN && _activeSuperadminCount_() <= 1) {
      throw userError_('Poslednímu aktivnímu správci aplikace nejde odebrat roli.');
    }

    // Oprávnění (EDITOR/VIEWER) má smysl jen u role USER — ADMIN/SUPERADMIN
    // mají v matici oprávnění vždy plný zápis bez ohledu na tento sloupec.
    const permission = role === ROLES.USER
      ? pickFrom_(data.permission, Object.keys(PERMISSIONS), 'Oprávnění')
      : PERMISSIONS.EDITOR;

    const location = cleanText_(data.location, 'Umístění', LIMITS.ORG_FIELD_MAX, false);
    const department = cleanText_(data.department, 'Oddělení', LIMITS.ORG_FIELD_MAX, false);
    const position = cleanText_(data.position, 'Pozice', LIMITS.ORG_FIELD_MAX, false);

    const fields = {
      email: email,
      firstName: firstName,
      lastName: lastName,
      role: role,
      permission: permission,
      location: location,
      department: department,
      position: position,
    };

    let record;
    if (existing) {
      record = dbUpdate_(SHEETS.USERS, id, fields);
      audit_('user.update', 'Upraven uživatel ' + email + ' (role ' + role + ')');
    } else {
      record = dbInsert_(SHEETS.USERS, Object.assign({ active: true, last_visit_at: '' }, fields));
      audit_('user.create', 'Vytvořen uživatel ' + email + ' (role ' + role + ')');
    }

    return _publicUserRow_(record);
  });
}

/**
 * Deaktivuje nebo znovu aktivuje uživatele. Rozšiřuje původně plánovaný
 * apiDeactivateUser(id) (SPECIFIKACE.md) o opačný směr (aktivace zpět) —
 * bez něj by deaktivace byla nevratná jinak než ruční úpravou tabulky, což
 * popírá smysl toho, proč jsme zvolili deaktivaci místo trvalého smazání.
 *
 * Nejde deaktivovat sám sebe (uzamklo by to vlastní přístup uprostřed
 * session) ani posledního aktivního superadmina (bezpečnostní bod 14).
 *
 * @param {Object} payload  { id, active }
 */
function apiSetUserActive(payload) {
  return guard_(PERM_KEYS.USERS_MANAGE, (user) => {
    const data = payload || {};
    const id = String(data.id || '');
    const active = data.active === true;

    const existing = dbFindById_(SHEETS.USERS, id);
    if (!existing) {
      throw userError_('Uživatel nebyl nalezen — mohl ho mezitím upravit někdo jiný.');
    }
    // Stejná pojistka jako v apiSaveUser — účet superadmina smí (de)aktivovat jen jiný superadmin.
    if (existing.role === ROLES.SUPERADMIN && user.role !== ROLES.SUPERADMIN) {
      throw userError_('Jen správce aplikace může upravit účet jiného správce.');
    }

    if (!active) {
      if (String(existing.email) === user.email) {
        throw userError_('Nemůžete deaktivovat sami sebe.');
      }
      if (existing.role === ROLES.SUPERADMIN && toBool_(existing.active) && _activeSuperadminCount_() <= 1) {
        throw userError_('Posledního aktivního správce aplikace nejde deaktivovat.');
      }
    }

    const record = dbUpdate_(SHEETS.USERS, id, { active: active });
    audit_(active ? 'user.activate' : 'user.deactivate',
      (active ? 'Aktivován' : 'Deaktivován') + ' uživatel ' + existing.email);

    return _publicUserRow_(record);
  });
}

/** Přemění řádek uživatele na podobu pro klienta. */
function _publicUserRow_(row) {
  const firstName = String(row.firstName || '');
  const lastName = String(row.lastName || '');
  return {
    id: String(row.id),
    email: String(row.email),
    firstName: firstName,
    lastName: lastName,
    fullName: (firstName + ' ' + lastName).trim() || String(row.email),
    role: row.role,
    permission: row.permission,
    active: toBool_(row.active),
    location: String(row.location || ''),
    department: String(row.department || ''),
    position: String(row.position || ''),
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   NASTAVENÍ — TYPY UDÁLOSTÍ A PRACOVNÍ POZICE

   Obojí přístupné jen SUPERADMINovi (settings_manage — viz matice v
   30_auth.js). Typy událostí bývaly napevno v kódu (00_config.js); od
   téhle verze je plná správa (přidat/upravit/smazat) v appce — jediná
   zbylá pojistka z kódu je EVENT_TYPE_ICONS (whitelist ikon) a to, že typ
   „default" nejde smazat (viz apiDeleteEventType).
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Zajistí, že `_event_types` NENÍ prázdná — jednorázově ji naseje výchozím
 * obsahem (DEFAULT_EVENT_TYPES, 00_config.js). Typicky se uplatní buď při
 * první instalaci, nebo u appky, která už běžela před touto verzí (typy
 * dřív žily jen v kódu, ne v databázi). Bezpečné volat opakovaně — jakmile
 * list není prázdný, dál nic nedělá.
 */
function _ensureEventTypesSeeded_() {
  if (dbGetAll_(SHEETS.EVENT_TYPES).length > 0) return;
  DEFAULT_EVENT_TYPES.forEach((t) => {
    dbInsert_(SHEETS.EVENT_TYPES, { id: t.id, label: t.label, icon: t.icon, color: t.color, bg_color: t.bgColor });
  });
}

/**
 * Typy událostí jako mapa `{ id: { label, icon, color, bgColor } }` —
 * přesně podoba, kterou čeká klient (this.eventTypes, viz ui/view_app.html)
 * i validace typu v apiSaveEvent (Object.keys). Volá _ensureEventTypesSeeded_,
 * takže funguje i na appce, kde `_event_types` ještě nikdy nikdo nenaplnil.
 */
function _eventTypesMap_() {
  _ensureEventTypesSeeded_();
  const map = {};
  dbGetAll_(SHEETS.EVENT_TYPES).forEach((row) => {
    map[String(row.id)] = {
      label: String(row.label),
      icon: String(row.icon),
      color: String(row.color),
      bgColor: String(row.bg_color),
    };
  });
  return map;
}

/**
 * Seznam typů událostí pro správu v Nastavení (na rozdíl od _eventTypesMap_
 * vrací pole, ne mapu, a v pořadí, jak jsou v tabulce) plus whitelist ikon
 * pro výběr ve formuláři (EVENT_TYPE_ICONS z 00_config.js) — appka ho posílá
 * ze serveru, ne aby ho měla natvrdo i v klientském JS a obě verze se
 * časem rozešly.
 */
function apiGetEventTypes() {
  return guard_(PERM_KEYS.SETTINGS_MANAGE, () => {
    _ensureEventTypesSeeded_();
    return {
      items: dbGetAll_(SHEETS.EVENT_TYPES).map(_publicEventType_),
      availableIcons: EVENT_TYPE_ICONS,
    };
  });
}

/**
 * Vytvoří nový typ události, nebo upraví existující (payload.id = úprava,
 * stejný vzor jako apiSaveEvent/apiSaveUser). Ikona jen z whitelistu
 * EVENT_TYPE_ICONS (00_config.js) — volný text by mohl odkázat na
 * neexistující ikonu (nikde by nebyla vidět) nebo mimo Phosphor sadu.
 * `color` (ikona/text) a `bgColor` (podklad) jsou DVĚ NEZÁVISLÉ barvy —
 * obě musí být platný hex zápis (#rrggbb), appka je vkládá přímo do CSS.
 *
 * @param {Object} payload  { id?, label, icon, color, bgColor }
 */
function apiSaveEventType(payload) {
  return guard_(PERM_KEYS.SETTINGS_MANAGE, () => {
    const data = payload || {};
    const id = data.id ? String(data.id) : null;
    const existing = id ? dbFindById_(SHEETS.EVENT_TYPES, id) : null;
    if (id && !existing) {
      throw userError_('Typ události nebyl nalezen — mohl ho mezitím upravit někdo jiný.');
    }

    const label = cleanText_(data.label, 'Popisek', LIMITS.EVENT_TYPE_LABEL_MAX, true);
    const icon = pickFrom_(data.icon, EVENT_TYPE_ICONS, 'Ikona');
    const color = cleanText_(data.color, 'Barva ikony', 7, true);
    if (!/^#[0-9a-f]{6}$/i.test(color)) {
      throw userError_('Barva ikony musí být v zápisu #rrggbb.');
    }
    const bgColor = cleanText_(data.bgColor, 'Barva podkladu', 7, true);
    if (!/^#[0-9a-f]{6}$/i.test(bgColor)) {
      throw userError_('Barva podkladu musí být v zápisu #rrggbb.');
    }

    const fields = { label: label, icon: icon, color: color, bg_color: bgColor };
    let record;
    if (existing) {
      record = dbUpdate_(SHEETS.EVENT_TYPES, id, fields);
      audit_('eventType.update', 'Upraven typ události „' + label + '"');
    } else {
      record = dbInsert_(SHEETS.EVENT_TYPES, fields);
      audit_('eventType.create', 'Vytvořen typ události „' + label + '"');
    }

    return _publicEventType_(record);
  });
}

/**
 * Smaže typ události. Typ „default" nejde smazat NIKDY — je to záchranná
 * varianta pro události, jejichž typ mezitím zmizel (viz apiGetEvents),
 * takže musí existovat vždycky. Existující události s tímto typem se
 * po smazání zobrazí jako „default" (stejná záchranná logika) — nejde
 * o chybu, jen o vědomý důsledek, appka ho proto sama neblokuje.
 *
 * @param {Object} payload  { id }
 */
function apiDeleteEventType(payload) {
  return guard_(PERM_KEYS.SETTINGS_MANAGE, () => {
    const data = payload || {};
    const id = cleanText_(data.id, 'ID typu události', 100, true);

    if (id === 'default') {
      throw userError_('Výchozí typ „Běžné" nejde smazat.');
    }

    const type = dbFindById_(SHEETS.EVENT_TYPES, id);
    if (!type) {
      throw userError_('Typ události nebyl nalezen — možná ho mezitím smazal někdo jiný.');
    }

    dbDelete_(SHEETS.EVENT_TYPES, id);
    audit_('eventType.delete', 'Smazán typ události „' + type.label + '"');
    return null;
  });
}

/** Přemění řádek typu události na podobu pro klienta (seznam v Nastavení). */
function _publicEventType_(row) {
  return {
    id: String(row.id),
    label: String(row.label),
    icon: String(row.icon),
    color: String(row.color),
    bgColor: String(row.bg_color),
  };
}

/**
 * Šablony událostí (Nastavení → Šablony událostí, viz SPECIFIKACE.md 9.9) —
 * appka je jen nabízí k předvyplnění formuláře nové události
 * (App.applyEventTemplate), nikam je needituje. Guard CALENDAR_WRITE (ne
 * SETTINGS_MANAGE jako správa níže) — použít šablonu smí každý, kdo smí
 * zakládat události, spravovat seznam (přidat/upravit/smazat) jen SUPERADMIN,
 * stejný vzor jako u apiGetPositions/apiGetDepartments výše.
 */
function apiGetEventTemplates() {
  return guard_(PERM_KEYS.CALENDAR_WRITE, () => {
    return dbGetAll_(SHEETS.EVENT_TEMPLATES)
      .map(_publicEventTemplate_)
      .sort((a, b) => a.label.localeCompare(b.label, 'cs'));
  });
}

/**
 * Vytvoří novou šablonu, nebo upraví existující (payload.id = úprava) —
 * stejný vzor jako apiSaveEventType. `label` slouží zároveň jako
 * předvyplněný název události při použití šablony.
 *
 * @param {Object} payload  { id?, label, type, allDay, startTime?, endTime?, durationDays, description }
 */
function apiSaveEventTemplate(payload) {
  return guard_(PERM_KEYS.SETTINGS_MANAGE, () => {
    const data = payload || {};
    const id = data.id ? String(data.id) : null;
    const existing = id ? dbFindById_(SHEETS.EVENT_TEMPLATES, id) : null;
    if (id && !existing) {
      throw userError_('Šablona nebyla nalezena — mohl ji mezitím upravit někdo jiný.');
    }

    const label = cleanText_(data.label, 'Název šablony', LIMITS.EVENT_TEMPLATE_LABEL_MAX, true);
    const type = pickFrom_(data.type, Object.keys(_eventTypesMap_()), 'Typ');
    const allDay = data.allDay === true;
    const startTime = allDay ? '' : cleanTimeOnly_(data.startTime, 'Čas od');
    const endTime = allDay ? '' : cleanTimeOnly_(data.endTime, 'Čas do');
    if (!allDay && endTime <= startTime) {
      throw userError_('Čas do musí být později než čas od.');
    }
    const durationDays = parseInt(data.durationDays, 10) || 1;
    if (durationDays < 1 || durationDays > LIMITS.EVENT_MAX_DAYS) {
      throw userError_('Délka trvání musí být 1 až ' + LIMITS.EVENT_MAX_DAYS + ' dní.');
    }
    const description = cleanText_(data.description, 'Popis', LIMITS.DESCRIPTION_MAX, false);

    const fields = {
      label: label, type: type, all_day: allDay,
      start_time: startTime, end_time: endTime,
      duration_days: durationDays, description: description,
    };

    let record;
    if (existing) {
      record = dbUpdate_(SHEETS.EVENT_TEMPLATES, id, fields);
      audit_('eventTemplate.update', 'Upravena šablona události „' + label + '"');
    } else {
      record = dbInsert_(SHEETS.EVENT_TEMPLATES, fields);
      audit_('eventTemplate.create', 'Vytvořena šablona události „' + label + '"');
    }

    return _publicEventTemplate_(record);
  });
}

/** Smaže šablonu. Bez dopadu na existující události (appka jimi šablonu jen jednorázově předvyplní, žádná trvalá vazba). */
function apiDeleteEventTemplate(payload) {
  return guard_(PERM_KEYS.SETTINGS_MANAGE, () => {
    const data = payload || {};
    const id = cleanText_(data.id, 'ID šablony', 100, true);

    const template = dbFindById_(SHEETS.EVENT_TEMPLATES, id);
    if (!template) {
      throw userError_('Šablona nebyla nalezena — možná ji mezitím smazal někdo jiný.');
    }

    dbDelete_(SHEETS.EVENT_TEMPLATES, id);
    audit_('eventTemplate.delete', 'Smazána šablona události „' + template.label + '"');
    return null;
  });
}

/** Přemění řádek šablony na podobu pro klienta. */
function _publicEventTemplate_(row) {
  return {
    id: String(row.id),
    label: String(row.label),
    type: String(row.type),
    allDay: toBool_(row.all_day),
    startTime: String(row.start_time || ''),
    endTime: String(row.end_time || ''),
    durationDays: parseInt(row.duration_days, 10) || 1,
    description: String(row.description || ''),
  };
}

/**
 * Seznam pracovních pozic, řazený podle názvu. Guard je záměrně
 * users_manage, ne settings_manage jako zbytek téhle sekce — ADMIN sice
 * nesmí pozice spravovat (přidat/upravit/smazat, viz apiSavePosition níže),
 * ale potřebuje si je aspoň PŘEČÍST pro výběr ve formuláři uživatele
 * (viz fillPositionSelect na klientovi), jinak by tam s pouhým
 * settings_manage neviděl vůbec nic.
 */
function apiGetPositions() {
  return guard_(PERM_KEYS.USERS_MANAGE, () => {
    return dbGetAll_(SHEETS.POSITIONS)
      .map(_publicPosition_)
      .sort((a, b) => a.name.localeCompare(b.name, 'cs'));
  });
}

/**
 * Vytvoří novou pracovní pozici, nebo upraví existující (payload.id =
 * úprava). Uložený název je jen volný text nabízený ve formuláři uživatele
 * (viz apiSaveUser) — přejmenování/smazání pozice se NEPROMÍTNE zpětně do
 * uživatelů, kteří ji už mají vyplněnou (stejně jako Umístění/Oddělení),
 * takže tu není žádná vazba, kterou by bylo nutné hlídat.
 *
 * @param {Object} payload  { id?, name }
 */
function apiSavePosition(payload) {
  return guard_(PERM_KEYS.SETTINGS_MANAGE, () => {
    const data = payload || {};
    const id = data.id ? String(data.id) : null;
    const existing = id ? dbFindById_(SHEETS.POSITIONS, id) : null;
    if (id && !existing) {
      throw userError_('Pozice nebyla nalezena — mohl ji mezitím upravit někdo jiný.');
    }

    const name = cleanText_(data.name, 'Název', LIMITS.POSITION_NAME_MAX, true);

    const isDuplicate = dbGetAll_(SHEETS.POSITIONS).some((row) =>
      String(row.id) !== id && String(row.name).toLowerCase() === name.toLowerCase()
    );
    if (isDuplicate) {
      throw userError_('Tato pozice už v seznamu je.');
    }

    let record;
    if (existing) {
      record = dbUpdate_(SHEETS.POSITIONS, id, { name: name });
      audit_('position.update', 'Upravena pracovní pozice „' + name + '"');
    } else {
      record = dbInsert_(SHEETS.POSITIONS, { name: name });
      audit_('position.create', 'Vytvořena pracovní pozice „' + name + '"');
    }

    return _publicPosition_(record);
  });
}

/**
 * Smaže pracovní pozici. Bez dopadu na uživatele, kteří ji mají vyplněnou
 * (viz komentář u apiSavePosition) — proto žádná kontrola použití, prosté
 * smazání jako u jiných jednoduchých seznamů.
 *
 * @param {Object} payload  { id }
 */
function apiDeletePosition(payload) {
  return guard_(PERM_KEYS.SETTINGS_MANAGE, () => {
    const data = payload || {};
    const id = cleanText_(data.id, 'ID pozice', 100, true);

    const position = dbFindById_(SHEETS.POSITIONS, id);
    if (!position) {
      throw userError_('Pozice nebyla nalezena — možná ji mezitím smazal někdo jiný.');
    }

    dbDelete_(SHEETS.POSITIONS, id);
    audit_('position.delete', 'Smazána pracovní pozice „' + position.name + '"');
    return null;
  });
}

/** Přemění řádek pracovní pozice na podobu pro klienta. */
function _publicPosition_(row) {
  return {
    id: String(row.id),
    name: String(row.name),
  };
}

/**
 * Seznam oddělení, řazený podle názvu — stejný vzor jako apiGetPositions
 * (guard je záměrně users_manage, ne settings_manage: ADMIN sice oddělení
 * nesmí spravovat, ale potřebuje si je přečíst pro výběr ve formuláři
 * uživatele, viz fillDepartmentSelect na klientovi).
 */
function apiGetDepartments() {
  return guard_(PERM_KEYS.USERS_MANAGE, () => {
    return dbGetAll_(SHEETS.DEPARTMENTS)
      .map(_publicDepartment_)
      .sort((a, b) => a.name.localeCompare(b.name, 'cs'));
  });
}

/**
 * Vytvoří nové oddělení, nebo upraví existující (payload.id = úprava) —
 * stejný vzor jako apiSavePosition, včetně kontroly na duplicitní název
 * bez ohledu na velikost písmen.
 *
 * @param {Object} payload  { id?, name }
 */
function apiSaveDepartment(payload) {
  return guard_(PERM_KEYS.SETTINGS_MANAGE, () => {
    const data = payload || {};
    const id = data.id ? String(data.id) : null;
    const existing = id ? dbFindById_(SHEETS.DEPARTMENTS, id) : null;
    if (id && !existing) {
      throw userError_('Oddělení nebylo nalezeno — mohl ho mezitím upravit někdo jiný.');
    }

    const name = cleanText_(data.name, 'Název', LIMITS.DEPARTMENT_NAME_MAX, true);

    const isDuplicate = dbGetAll_(SHEETS.DEPARTMENTS).some((row) =>
      String(row.id) !== id && String(row.name).toLowerCase() === name.toLowerCase()
    );
    if (isDuplicate) {
      throw userError_('Toto oddělení už v seznamu je.');
    }

    let record;
    if (existing) {
      record = dbUpdate_(SHEETS.DEPARTMENTS, id, { name: name });
      audit_('department.update', 'Upraveno oddělení „' + name + '"');
    } else {
      record = dbInsert_(SHEETS.DEPARTMENTS, { name: name });
      audit_('department.create', 'Vytvořeno oddělení „' + name + '"');
    }

    return _publicDepartment_(record);
  });
}

/**
 * Smaže oddělení. Bez dopadu na uživatele, kteří ho mají vyplněné (stejný
 * princip jako u apiDeletePosition) — proto žádná kontrola použití.
 *
 * @param {Object} payload  { id }
 */
function apiDeleteDepartment(payload) {
  return guard_(PERM_KEYS.SETTINGS_MANAGE, () => {
    const data = payload || {};
    const id = cleanText_(data.id, 'ID oddělení', 100, true);

    const department = dbFindById_(SHEETS.DEPARTMENTS, id);
    if (!department) {
      throw userError_('Oddělení nebylo nalezeno — možná ho mezitím smazal někdo jiný.');
    }

    dbDelete_(SHEETS.DEPARTMENTS, id);
    audit_('department.delete', 'Smazáno oddělení „' + department.name + '"');
    return null;
  });
}

/** Přemění řádek oddělení na podobu pro klienta. */
function _publicDepartment_(row) {
  return {
    id: String(row.id),
    name: String(row.name),
  };
}

/**
 * Státní svátky ČR pro daný rok — záložka „Státní svátky ČR" v Nastavení
 * i barevné pruhy v mřížce kalendáře. Vidí je každý přihlášený uživatel
 * (CALENDAR_READ), ne jen SUPERADMIN, i když samotnou záložku Nastavení
 * (a tedy i editaci) má přístupnou jen on — čtení svátků se týká celého
 * sdíleného kalendáře.
 *
 * Od plné editovatelnosti (viz apiSaveHoliday/apiDeleteHoliday) jde
 * o obyčejnou databázovou tabulku `_holidays`, ne čisté dopočítávání —
 * první zobrazení daného roku ji ale sama naseje výchozí sadou
 * (_ensureHolidaysSeededForYear_), ať appka nepůsobí prázdně, dokud ji
 * SUPERADMIN sám neručně naplní.
 *
 * @param {Object} payload  { year } — RRRR, výchozí aktuální rok
 */
function apiGetHolidays(payload) {
  return guard_(PERM_KEYS.CALENDAR_READ, () => {
    const data = payload || {};
    let year = parseInt(data.year, 10);
    if (!year || year < 1900 || year > 2200) year = new Date().getFullYear();

    _ensureHolidaysSeededForYear_(year);

    const holidays = dbGetAll_(SHEETS.HOLIDAYS)
      .filter((row) => String(row.date).slice(0, 4) === String(year))
      .map(_publicHoliday_)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    return { year: year, holidays: holidays };
  });
}

/**
 * Vytvoří nový svátek, nebo upraví existující (payload.id = úprava) —
 * stejný vzor jako apiSaveDepartment. Datum i po úpravě může spadnout
 * do jiného roku, než ve kterém svátek původně byl (appka po uložení
 * na klientovi přepne zobrazený rok podle vráceného záznamu, viz
 * submitHolidayForm) — na serveru na tom nezáleží, `_holidays` netřídí
 * podle roku, jen ho z data odvozuje při čtení (apiGetHolidays).
 *
 * @param {Object} payload  { id?, date, name }
 */
function apiSaveHoliday(payload) {
  return guard_(PERM_KEYS.SETTINGS_MANAGE, () => {
    const data = payload || {};
    const id = data.id ? String(data.id) : null;
    const existing = id ? dbFindById_(SHEETS.HOLIDAYS, id) : null;
    if (id && !existing) {
      throw userError_('Svátek nebyl nalezen — mohl ho mezitím upravit někdo jiný.');
    }

    const date = cleanDateOnly_(data.date, 'Datum');
    const name = cleanText_(data.name, 'Název svátku', LIMITS.HOLIDAY_NAME_MAX, true);

    let record;
    if (existing) {
      record = dbUpdate_(SHEETS.HOLIDAYS, id, { date: date, name: name });
      audit_('holiday.update', 'Upraven svátek „' + name + '" (' + date + ')');
    } else {
      record = dbInsert_(SHEETS.HOLIDAYS, { date: date, name: name });
      audit_('holiday.create', 'Vytvořen svátek „' + name + '" (' + date + ')');
    }

    return _publicHoliday_(record);
  });
}

/**
 * Smaže svátek. Bez dopadu na cokoli jiného (svátky se nikam jinam
 * neváží, jen se zobrazují) — přesto přes potvrzovací okno na klientovi,
 * je to nevratné.
 *
 * @param {Object} payload  { id }
 */
function apiDeleteHoliday(payload) {
  return guard_(PERM_KEYS.SETTINGS_MANAGE, () => {
    const data = payload || {};
    const id = cleanText_(data.id, 'ID svátku', 100, true);

    const holiday = dbFindById_(SHEETS.HOLIDAYS, id);
    if (!holiday) {
      throw userError_('Svátek nebyl nalezen — možná ho mezitím smazal někdo jiný.');
    }

    dbDelete_(SHEETS.HOLIDAYS, id);
    audit_('holiday.delete', 'Smazán svátek „' + holiday.name + '" (' + holiday.date + ')');
    return null;
  });
}

/** Přemění řádek svátku na podobu pro klienta. */
function _publicHoliday_(row) {
  return {
    id: String(row.id),
    date: String(row.date),
    name: String(row.name),
  };
}

/**
 * Naseje výchozí sadu svátků (CZECH_FIXED_HOLIDAYS + pohyblivé, viz
 * _czechHolidaysForYear_) pro daný rok do `_holidays`, ale JEN JEDNOU —
 * `_settings.holidaysSeededYears` (čárkou oddělený seznam let) drží
 * evidenci, který rok už appka naplnila, ať se výchozí sada nevrátí
 * zpátky, kdyby SUPERADMIN pro daný rok smazal úplně všechny záznamy
 * (prázdná tabulka pro daný rok by jinak vypadala jako "ještě nikdy
 * neseto" a naseje se znovu — tenhle příznak tomu brání).
 */
function _ensureHolidaysSeededForYear_(year) {
  const settings = settingsAll_();
  const seededYears = String(settings.holidaysSeededYears || '').split(',').filter(Boolean);
  if (seededYears.indexOf(String(year)) !== -1) return;

  _czechHolidaysForYear_(year).forEach((h) => {
    dbInsert_(SHEETS.HOLIDAYS, { date: h.date, name: h.name });
  });

  seededYears.push(String(year));
  settingsSet_('holidaysSeededYears', seededYears.join(','));
}

/**
 * Datum velikonoční neděle pro daný rok — anonymní gregoriánský algoritmus
 * (Meeus/Jones/Butcher), čistě celočíselná aritmetika, bez jediného
 * Date objektu — vrací {month, day} (měsíc 1-12).
 */
function _easterSunday_(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month: month, day: day };
}

/**
 * Datum posunuté o `deltaDays` dní od zadaného {year, month, day} — počítáno
 * přes Date.UTC/getUTC*, ne přes lokální časovou zónu, aby posun přes
 * půlnoc/měsíc/rok nezávisel na TIMEZONE appky (viz opakovaně zdokumentovaná
 * chyba UTC/lokální čas v SPECIFIKACE.md — tady jde jen o kalendářní
 * aritmetiku, ne o okamžik v čase, takže UTC je bezpečná volba).
 */
function _addDaysToDate_(year, month, day, deltaDays) {
  const utcMs = Date.UTC(year, month - 1, day) + deltaDays * 86400000;
  const d = new Date(utcMs);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** Doplní nulu zleva na dvě číslice (měsíc/den v RRRR-MM-DD). */
function _pad2_(n) {
  return n < 10 ? '0' + n : String(n);
}

/**
 * Všechny státní svátky ČR pro daný rok — pevné (CZECH_FIXED_HOLIDAYS)
 * i pohyblivé (Velký pátek = neděle Velikonoc - 2 dny, Velikonoční
 * pondělí = neděle Velikonoc + 1 den), seřazené podle data.
 *
 * @return {Array<{date, name}>}  date jako RRRR-MM-DD
 */
function _czechHolidaysForYear_(year) {
  const easter = _easterSunday_(year);
  const goodFriday = _addDaysToDate_(year, easter.month, easter.day, -2);
  const easterMonday = _addDaysToDate_(year, easter.month, easter.day, 1);

  const items = CZECH_FIXED_HOLIDAYS.map((h) => ({ year: year, month: h.month, day: h.day, name: h.name }))
    .concat([
      { year: goodFriday.year, month: goodFriday.month, day: goodFriday.day, name: 'Velký pátek' },
      { year: easterMonday.year, month: easterMonday.month, day: easterMonday.day, name: 'Velikonoční pondělí' },
    ]);

  return items
    .map((h) => ({ date: h.year + '-' + _pad2_(h.month) + '-' + _pad2_(h.day), name: h.name }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
