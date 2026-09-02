/**
 * ════════════════════════════════════════════════════════════════════════════
 *  50_api.js — veřejné API volané z prohlížeče
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Vše, co je odsud volatelné přes google.script.run, MUSÍ projít guard_().
 * Bez guardu by šel endpoint zavolat přímo z konzole prohlížeče, i kdyby
 * v UI žádné tlačítko neexistovalo.
 *
 * Stav: bootstrap, čtení událostí, komentáře k události (čtení/přidání/
 * smazání vlastního). Zápis událostí samotných (vytváření/úprava/mazání)
 * a endpointy pro uživatele a nastavení přibývají v dalších krocích podle
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
      },
      settings: {
        appName: settings.appName,
        appSubtitle: settings.appSubtitle,
        holidaysEnabled: settings.holidaysEnabled,
      },
      eventTypes: EVENT_TYPES,
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
 * Vytvoří novou událost. Smí jen ten, kdo má právo zápisu (calendar_write) —
 * VIEWER kalendář jen čte. Vlastník se bere ze SESSION, nikdy z payloadu.
 *
 * Zatím jen VYTVOŘENÍ — úprava a mazání existující události je další krok
 * (potřebuje navíc kontrolu vlastnictví a pravidlo pro proběhlé události,
 * viz SPECIFIKACE.md kapitola 7.2, body 8–9).
 *
 * @param {Object} payload  { start, end, allDay, type, title, description } —
 *                          start/end RRRR-MM-DDTHH:mm
 */
function apiSaveEvent(payload) {
  return guard_(PERM_KEYS.CALENDAR_WRITE, (user) => {
    const data = payload || {};
    const start = cleanDateTime_(data.start, 'Začátek');
    const end = cleanDateTime_(data.end, 'Konec');
    const allDay = data.allDay === true;
    const type = pickFrom_(data.type, Object.keys(EVENT_TYPES), 'Typ');
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
      throw userError_('Událost nelze založit do minulosti.');
    }

    const record = dbInsert_(SHEETS.EVENTS, {
      start: start,
      end: end,
      all_day: allDay,
      type: type,
      title: title,
      description: description,
      owner_email: user.email,
    });

    audit_('event.create', 'Vytvořena událost „' + title + '" (' + start + ' – ' + end + ')');

    return { id: record.id };
  });
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
        // Neplatný/starý typ v datech se nezobrazí rozbitě — spadne do "default".
        type: EVENT_TYPES[row.type] ? String(row.type) : 'default',
        title: String(row.title || ''),
        description: String(row.description || ''),
        ownerEmail: String(row.owner_email || ''),
        ownerName: _resolveUserName_(row.owner_email, nameCache),
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
    if (!dbFindById_(SHEETS.EVENTS, eventId)) {
      throw userError_('Událost nebyla nalezena.');
    }

    const comment = dbInsert_(SHEETS.EVENT_COMMENTS, {
      event_id: eventId,
      author_email: user.email,
      text: text,
    });

    audit_('comment.create', 'Komentář k události ' + eventId + ': ' + text.slice(0, 80));

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

    dbDelete_(SHEETS.EVENT_COMMENTS, id);
    audit_('comment.delete', 'Smazán komentář ' + id + ' k události ' + comment.event_id);
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

   Přístupné jen SUPERADMIN/ADMIN (users_manage). Zatím jen ČTENÍ SEZNAMU
   a VYTVÁŘENÍ — úprava/deaktivace existujícího uživatele je další krok
   (viz SPECIFIKACE.md kapitola 8, apiDeactivateUser).
   ══════════════════════════════════════════════════════════════════════════ */

/** Seznam všech uživatelů, seřazený podle jména. */
function apiGetUsers() {
  return guard_(PERM_KEYS.USERS_MANAGE, () => {
    return dbGetAll_(SHEETS.USERS)
      .map(_publicUserRow_)
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'cs'));
  });
}

/**
 * Vytvoří nového uživatele. E-mail musí být z povolené domény (CONFIG.
 * allowedEmailDomain) a nesmí už v `_users` existovat. Roli SUPERADMIN smí
 * přidělit jen SUPERADMIN — jinak by si ADMIN mohl sám sobě nebo komukoli
 * přidat nejvyšší oprávnění.
 *
 * Zatím jen VYTVOŘENÍ — payload.id se ignoruje, úprava existujícího
 * uživatele je další krok.
 *
 * Umístění/Oddělení/Pozice jsou zatím volný text (nepovinný) — Umístění se
 * později nahradí výběrem z importovaného seznamu logistických center,
 * Oddělení/Pozice výběrem ze seznamu spravovaného v Nastavení.
 *
 * @param {Object} payload  { email, firstName, lastName, role, permission,
 *                            location, department, position }
 */
function apiSaveUser(payload) {
  return guard_(PERM_KEYS.USERS_MANAGE, (user) => {
    const data = payload || {};
    const email = cleanEmail_(data.email);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw userError_('Zadejte platný e-mail.');
    }
    if (!email.endsWith('@' + CONFIG.allowedEmailDomain)) {
      throw userError_('E-mail musí být z domény @' + CONFIG.allowedEmailDomain + '.');
    }
    if (dbFindBy_(SHEETS.USERS, 'email', email)) {
      throw userError_('Uživatel s tímto e-mailem už existuje.');
    }

    const firstName = cleanText_(data.firstName, 'Jméno', LIMITS.NAME_MAX, true);
    const lastName = cleanText_(data.lastName, 'Příjmení', LIMITS.NAME_MAX, true);
    const role = pickFrom_(data.role, Object.keys(ROLES), 'Role');

    if (role === ROLES.SUPERADMIN && user.role !== ROLES.SUPERADMIN) {
      throw userError_('Jen správce aplikace může vytvořit dalšího správce.');
    }

    // Oprávnění (EDITOR/VIEWER) má smysl jen u role USER — ADMIN/SUPERADMIN
    // mají v matici oprávnění vždy plný zápis bez ohledu na tento sloupec.
    const permission = role === ROLES.USER
      ? pickFrom_(data.permission, Object.keys(PERMISSIONS), 'Oprávnění')
      : PERMISSIONS.EDITOR;

    const location = cleanText_(data.location, 'Umístění', LIMITS.ORG_FIELD_MAX, false);
    const department = cleanText_(data.department, 'Oddělení', LIMITS.ORG_FIELD_MAX, false);
    const position = cleanText_(data.position, 'Pozice', LIMITS.ORG_FIELD_MAX, false);

    const record = dbInsert_(SHEETS.USERS, {
      email: email,
      firstName: firstName,
      lastName: lastName,
      role: role,
      permission: permission,
      active: true,
      last_visit_at: '',
      location: location,
      department: department,
      position: position,
    });

    audit_('user.create', 'Vytvořen uživatel ' + email + ' (role ' + role + ')');

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
