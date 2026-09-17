/**
 * ════════════════════════════════════════════════════════════════════════════
 *  55_requests.js — Požadavky vedoucích pracovníků LC
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Samostatná sekce appky (viz SPECIFIKACE.md 9.10): jednoduchý přehled
 * zadaných požadavků — kdo zadal, kdy, název, popis — s komentáři,
 * třístupňovým stavem a procentem pokroku.
 *
 * Rozdělení práv (schválené zadání):
 *  - zadat požadavek smí KAŽDÝ přihlášený (calendar_read, tedy i VIEWER —
 *    požadavek není zápis do kalendáře),
 *  - svůj požadavek smí upravit jeho zakladatel; ADMIN/SUPERADMIN i cizí,
 *  - stav a procento smí měnit jen ten, kdo projde canManageRequestStatus_
 *    (dvojice umístění+pozice z nastavení, viz 30_auth.js).
 *
 * Historie úprav se NEUKLÁDÁ do vlastní tabulky — jde do `_audit_log` pod
 * entity_id = id požadavku (apiGetRequestHistory ji odtud čte zpátky).
 * Důvod: audit log už existuje, umí „kdo/kdy/co" a nepotřebuje vlastní
 * schéma ani mazání spolu s požadavkem.
 *
 * Do zvonečku s oznámeními požadavky ZATÍM nevstupují — celá ta mašinérie
 * je postavená na `_event_views` a vázaná na události kalendáře (viz
 * NOTIFY_ACTIONS_EVENT_SCOPED v 00_config.js). Akce se ale do auditu píšou
 * od začátku, takže napojení půjde doplnit bez zpětné migrace dat.
 */

/* ══════════════════════════════════════════════════════════════════════════
   POMOCNÉ FUNKCE
   ══════════════════════════════════════════════════════════════════════════ */

/** Definice stavu podle klíče, nebo `null` u neznámého. */
function _requestStatusDef_(key) {
  const wanted = String(key || '').trim();
  return REQUEST_STATUSES.filter((s) => s.key === wanted)[0] || null;
}

/**
 * Ověří poslané procento pokroku. Na stavu NEZÁVISÍ — stav a procento
 * jsou dvě samostatné hodnoty (viz komentář u REQUEST_STATUSES).
 *
 * Kontroluje se i násobek REQUEST_PROGRESS_STEP: posuvník v UI jiné
 * hodnoty nenabízí, takže cokoli jiného by se sice uložilo, ale uživatel
 * by to pak nemohl trefit zpátky.
 */
function _requestProgressFor_(requestedProgress) {
  const value = Math.round(Number(requestedProgress));
  if (!isFinite(value) || value < 0 || value > 100) {
    throw userError_('Pokrok musí být celé číslo od 0 do 100.');
  }
  if (value % REQUEST_PROGRESS_STEP !== 0) {
    throw userError_('Pokrok se nastavuje po ' + REQUEST_PROGRESS_STEP + ' %.');
  }
  return value;
}

/**
 * Přemění řádek požadavku na podobu pro klienta.
 *
 * `canEdit`/`canManageStatus` posílá server proto, aby klient nemusel
 * pravidla duplikovat — server si je i tak ověřuje znovu při každém zápisu,
 * tohle řídí jen to, co má smysl vůbec nabízet v UI.
 */
function _publicRequest_(row, user, settings, authorCache, commentCounts) {
  const statusKey = String(row.status || REQUEST_STATUSES[0].key);
  const def = _requestStatusDef_(statusKey) || REQUEST_STATUSES[0];
  const authorEmail = cleanEmail_(row.created_by);
  const isOwner = authorEmail === user.email;
  const author = _resolveRequestAuthor_(row.created_by, authorCache);

  return {
    id: String(row.id),
    title: String(row.title || ''),
    description: String(row.description || ''),
    status: def.key,
    statusLabel: def.label,
    progress: Number(row.progress || 0),
    authorEmail: authorEmail,
    authorName: author.name,
    // Umístění (DL / zkratka LC) se v přehledu ukazuje jako malý štítek
    // vedle jména — kdo požadavek zadal, je tím rovnou zařazené.
    authorLocation: author.location,
    createdAt: String(row.created_at || ''),
    updatedAt: String(row.updated_at || ''),
    commentCount: commentCounts ? (commentCounts[String(row.id)] || 0) : 0,
    canEdit: isOwner || canManageForeignEvents_(user),
    canDelete: isOwner || canManageForeignEvents_(user),
    canManageStatus: canManageRequestStatus_(user, settings),
  };
}

/**
 * Jméno a umístění zadavatele. Vlastní pomocník místo _resolveUserName_
 * proto, že přehled ukazuje vedle jména i štítek umístění (DL / zkratka
 * LC) — jedno dohledání řádku v `_users` tak stačí na obojí.
 *
 * `cache` drží výsledky v rámci jednoho volání, ať se stejný e-mail
 * neprohledává v tabulce opakovaně.
 */
function _resolveRequestAuthor_(email, cache) {
  const low = cleanEmail_(email);
  if (cache[low] !== undefined) return cache[low];

  const user = dbFindBy_(SHEETS.USERS, 'email', low);
  const fullName = user ? (String(user.firstName || '') + ' ' + String(user.lastName || '')).trim() : '';
  cache[low] = {
    name: fullName || low,
    location: user ? String(user.location || '') : '',
  };
  return cache[low];
}

/** Mapa `request_id → počet komentářů` — jedním průchodem, ne dotazem na požadavek. */
function _requestCommentCounts_() {
  const counts = {};
  dbGetAll_(SHEETS.REQUEST_COMMENTS).forEach((row) => {
    const key = String(row.request_id);
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
}

/* ══════════════════════════════════════════════════════════════════════════
   PŘEHLED A ÚPRAVY
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Všechny požadavky, od nejnovějšího. Filtrování podle stavu si dělá
 * klient v hlavičce tabulky (stejný obecný mechanismus jako u Uživatelů
 * a Filiálek), server proto posílá seznam celý — při téhle velikosti dat
 * je to levnější než stránkování a filtr funguje okamžitě.
 */
function apiGetRequests() {
  return guard_(PERM_KEYS.CALENDAR_READ, (user) => {
    const settings = settingsAll_();
    const authorCache = {};
    const counts = _requestCommentCounts_();

    return dbGetAll_(SHEETS.REQUESTS)
      .map((row) => _publicRequest_(row, user, settings, authorCache, counts))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  });
}

/**
 * Založí nebo upraví požadavek. S `id` = úprava, bez `id` = nový —
 * stejný vzor jako apiSaveEvent/apiSaveUser.
 *
 * Stav ani procento se tudy NEMĚNÍ (ani při zakládání) — na to je
 * apiSetRequestStatus s vlastní kontrolou práv. Nový požadavek proto vždy
 * začíná prvním stavem z REQUEST_STATUSES.
 *
 * @param {Object} payload  { id?, title, description }
 */
function apiSaveRequest(payload) {
  return guard_(PERM_KEYS.CALENDAR_READ, (user) => {
    const data = payload || {};
    const id = data.id ? String(data.id) : null;
    const title = cleanText_(data.title, 'Název požadavku', LIMITS.REQUEST_TITLE_MAX, true);
    const description = cleanText_(data.description, 'Popis požadavku', LIMITS.REQUEST_DESCRIPTION_MAX, false);

    const settings = settingsAll_();

    if (!id) {
      const created = dbInsert_(SHEETS.REQUESTS, {
        title: title,
        description: description,
        status: REQUEST_STATUSES[0].key,
        progress: 0,
      });
      audit_('request.create', 'Nový požadavek „' + title + '"', String(created.id), ['create']);
      return _publicRequest_(created, user, settings, {}, {});
    }

    const existing = dbFindById_(SHEETS.REQUESTS, id);
    if (!existing) {
      throw userError_('Požadavek nebyl nalezen — možná ho mezitím smazal někdo jiný.');
    }
    if (cleanEmail_(existing.created_by) !== user.email && !canManageForeignEvents_(user)) {
      throw userError_('Upravit můžete jen vlastní požadavek.');
    }

    // Co se skutečně změnilo — kvůli čitelné historii. Když se nezměnilo
    // nic, do auditu se nezapisuje vůbec, jinak by historie zarostla
    // prázdnými „upraveno" řádky od každého otevření a uložení formuláře.
    const changes = [];
    const types = [];
    if (String(existing.title || '') !== title) {
      changes.push('název: „' + String(existing.title || '') + '" → „' + title + '"');
      types.push('title');
    }
    if (String(existing.description || '') !== description) {
      changes.push('upraven popis');
      types.push('description');
    }

    const updated = dbUpdate_(SHEETS.REQUESTS, id, { title: title, description: description, updated_by: user.email });
    if (changes.length) {
      audit_('request.update', 'Upraven požadavek „' + title + '" — ' + changes.join('; '), id, types);
    }

    return _publicRequest_(updated, user, settings, {}, _requestCommentCounts_());
  });
}

/**
 * Změní stav NEBO procento pokroku — obojí je nezávislé, takže volající
 * posílá jen to, co skutečně mění (klik na krok průběhu pošle jen `status`,
 * puštění posuvníku jen `progress`). Oddělený endpoint od apiSaveRequest
 * proto, že tohle je jediná část požadavku s jiným pravidlem než
 * „vlastník nebo správce" — viz canManageRequestStatus_ v 30_auth.js.
 *
 * @param {Object} payload  { id, status?, progress? } — aspoň jedno z nich
 */
function apiSetRequestStatus(payload) {
  return guard_(PERM_KEYS.CALENDAR_READ, (user) => {
    const data = payload || {};
    const id = cleanText_(data.id, 'ID požadavku', 100, true);
    const settings = settingsAll_();

    if (!canManageRequestStatus_(user, settings)) {
      // Hláška záměrně říká PROČ a jmenuje požadovanou dvojici — bez toho
      // je selhání neodladitelné (pozice je jen text v _users, viz
      // komentář u requestManagerPosition v DEFAULT_SETTINGS).
      const wanted = String(settings.requestManagerLocation || '(nenastaveno)') +
        ' / ' + String(settings.requestManagerPosition || '(nenastaveno)');
      throw userError_(
        'Stav požadavku smí měnit jen uživatel s umístěním a pozicí ' + wanted +
        '. Dvojici lze změnit v Nastavení → Požadavky.');
    }

    const existing = dbFindById_(SHEETS.REQUESTS, id);
    if (!existing) {
      throw userError_('Požadavek nebyl nalezen — možná ho mezitím smazal někdo jiný.');
    }

    const hasStatus = data.status !== undefined && data.status !== null;
    const hasProgress = data.progress !== undefined && data.progress !== null;
    if (!hasStatus && !hasProgress) {
      throw userError_('Není co změnit — chybí stav i pokrok.');
    }

    const oldDef = _requestStatusDef_(existing.status) || REQUEST_STATUSES[0];
    const oldProgress = Number(existing.progress || 0);

    const def = hasStatus ? _requestStatusDef_(data.status) : oldDef;
    if (!def) throw userError_('Neznámý stav požadavku.');
    const progress = hasProgress ? _requestProgressFor_(data.progress) : oldProgress;

    // Mění-li se SAMOTNÝ pokrok (volající stav neposlal), stav se z pokroku
    // ODVODÍ: 0 % = Nový, 100 % = Dokončeno, cokoli mezi = V procesu.
    //
    // Dřív tu byl jen jeden směr (stažení pod 100 % vracelo Dokončeno na
    // V procesu), takže naklikání pokroku tlačítky -/+ na 0 nebo 100 %
    // nechalo stav viset, kde byl — hlášeno. Teď platí obě strany a je
    // to jedno pravidlo místo výčtu výjimek.
    //
    // Výslovně zadaný stav se respektuje VŽDYCKY, i když pokroku
    // neodpovídá — jinak by nešlo označit za dokončený požadavek, který
    // zůstal rozpracovaný.
    //
    // Sedí na serveru, ne jen na klientovi, aby se vazba uplatnila při
    // každém zápisu a rovnou se objevila v historii jako skutečná změna
    // stavu.
    let statusKeyToSave = def.key;
    if (!hasStatus && hasProgress) {
      statusKeyToSave = progress <= 0 ? 'new' : (progress >= 100 ? 'done' : 'in_progress');
    }
    const finalDef = _requestStatusDef_(statusKeyToSave);

    const updated = dbUpdate_(SHEETS.REQUESTS, id, { status: finalDef.key, progress: progress, updated_by: user.email });

    const changes = [];
    const types = [];
    if (oldDef.key !== finalDef.key) {
      changes.push('stav: ' + oldDef.label + ' → ' + finalDef.label);
      types.push('status');
    }
    if (oldProgress !== progress) {
      changes.push('pokrok: ' + oldProgress + ' % → ' + progress + ' %');
      types.push('progress');
    }
    if (changes.length) {
      audit_('request.status', 'Požadavek „' + String(existing.title || '') + '" — ' + changes.join('; '), id, types);
    }

    return _publicRequest_(updated, user, settings, {}, _requestCommentCounts_());
  });
}

/**
 * Smaže požadavek i jeho komentáře. Historie v `_audit_log` ZŮSTÁVÁ —
 * je to trvalý záznam „kdo co kdy udělal", ne součást požadavku (stejný
 * princip jako u smazané události).
 *
 * @param {Object} payload  { id }
 */
function apiDeleteRequest(payload) {
  return guard_(PERM_KEYS.CALENDAR_READ, (user) => {
    const data = payload || {};
    const id = cleanText_(data.id, 'ID požadavku', 100, true);

    const existing = dbFindById_(SHEETS.REQUESTS, id);
    if (!existing) {
      throw userError_('Požadavek nebyl nalezen — možná ho mezitím smazal někdo jiný.');
    }
    if (cleanEmail_(existing.created_by) !== user.email && !canManageForeignEvents_(user)) {
      throw userError_('Smazat můžete jen vlastní požadavek.');
    }

    dbGetAll_(SHEETS.REQUEST_COMMENTS)
      .filter((row) => String(row.request_id) === id)
      .forEach((row) => dbDelete_(SHEETS.REQUEST_COMMENTS, String(row.id)));

    dbDelete_(SHEETS.REQUESTS, id);
    audit_('request.delete', 'Smazán požadavek „' + String(existing.title || '') + '"', id, ['delete']);
    return null;
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   KOMENTÁŘE — stejná pravidla jako u komentářů k události
   ══════════════════════════════════════════════════════════════════════════ */

/** Komentáře k požadavku, od nejstaršího (čte se jako rozhovor). */
function apiGetRequestComments(payload) {
  return guard_(PERM_KEYS.CALENDAR_READ, (user) => {
    const data = payload || {};
    const requestId = cleanText_(data.requestId, 'ID požadavku', 100, true);
    const nameCache = {};

    return dbGetAll_(SHEETS.REQUEST_COMMENTS)
      .filter((row) => String(row.request_id) === requestId)
      .map((row) => _publicRequestComment_(row, user, nameCache))
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
  });
}

/** Přidá komentář k požadavku. Vrací rovnou vytvořený komentář. */
function apiAddRequestComment(payload) {
  return guard_(PERM_KEYS.CALENDAR_READ, (user) => {
    const data = payload || {};
    const requestId = cleanText_(data.requestId, 'ID požadavku', 100, true);
    const text = cleanText_(data.text, 'Komentář', LIMITS.COMMENT_MAX, true);

    const request = dbFindById_(SHEETS.REQUESTS, requestId);
    if (!request) {
      throw userError_('Požadavek nebyl nalezen.');
    }

    const comment = dbInsert_(SHEETS.REQUEST_COMMENTS, {
      request_id: requestId,
      author_email: user.email,
      text: text,
    });

    audit_('request.comment', 'Nový komentář k požadavku „' + String(request.title || '') + '": ' + text.slice(0, 80), requestId, ['comment']);

    return _publicRequestComment_(comment, user, {});
  });
}

/** Smaže komentář — jen vlastní, nebo (ADMIN/SUPERADMIN) kterýkoli. */
function apiDeleteRequestComment(payload) {
  return guard_(PERM_KEYS.CALENDAR_READ, (user) => {
    const data = payload || {};
    const id = cleanText_(data.id, 'ID komentáře', 100, true);

    const comment = dbFindById_(SHEETS.REQUEST_COMMENTS, id);
    if (!comment) {
      throw userError_('Komentář nebyl nalezen — možná ho mezitím smazal někdo jiný.');
    }

    const isOwner = cleanEmail_(comment.author_email) === user.email;
    if (!isOwner && !canManageForeignEvents_(user)) {
      throw userError_('Můžete mazat jen vlastní komentáře.');
    }

    const parent = dbFindById_(SHEETS.REQUESTS, comment.request_id);
    const title = parent ? String(parent.title || '') : '(smazaný požadavek)';

    dbDelete_(SHEETS.REQUEST_COMMENTS, id);
    audit_('request.comment.delete', 'Smazán komentář k požadavku „' + title + '"', String(comment.request_id), ['comment']);
    return null;
  });
}

/** Přemění řádek komentáře požadavku na podobu pro klienta. */
function _publicRequestComment_(row, user, nameCache) {
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
   HISTORIE ÚPRAV
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Historie jednoho požadavku — čte se z `_audit_log` podle entity_id,
 * od nejnovějšího. Vlastní tabulku to nemá schválně: audit log už umí
 * „kdo/kdy/co" a je trvalý, takže historie přežije i smazání požadavku.
 *
 * @param {Object} payload  { requestId }
 */
function apiGetRequestHistory(payload) {
  return guard_(PERM_KEYS.CALENDAR_READ, () => {
    const data = payload || {};
    const requestId = cleanText_(data.requestId, 'ID požadavku', 100, true);
    const nameCache = {};

    return dbGetAll_(SHEETS.AUDIT)
      .filter((row) => String(row.entity_id) === requestId && String(row.action).indexOf('request.') === 0)
      .map((row) => ({
        action: String(row.action),
        detail: String(row.detail || ''),
        types: _requestChangeTypes_(row),
        userName: _resolveUserName_(row.user, nameCache),
        timestamp: String(row.timestamp || ''),
      }))
      .sort((a, b) => (a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0))
      .slice(0, LIMITS.REQUEST_HISTORY_MAX);
  });
}

/**
 * Kódy toho, CO se v daném řádku auditu změnilo — pro sloupec „Typ"
 * v historii. Primárně z `change_types`; u řádků zapsaných JEŠTĚ PŘED
 * přidáním toho sloupce se typ odvodí aspoň z `action`, ať stará historie
 * nezůstane úplně bez typu. Jediné, co se takhle odvodit nedá, je
 * `request.update` — z něj není poznat, jestli šlo o název, nebo popis.
 */
function _requestChangeTypes_(row) {
  const stored = String(row.change_types || '').split(',').filter((t) => t);
  if (stored.length) return stored;

  const action = String(row.action || '');
  if (action === 'request.create') return ['create'];
  if (action === 'request.delete') return ['delete'];
  if (action === 'request.status') return ['status'];
  if (action.indexOf('request.comment') === 0) return ['comment'];
  return [];
}

/* ══════════════════════════════════════════════════════════════════════════
   NASTAVENÍ — kdo smí měnit stav
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Aktuální dvojice umístění+pozice pro záložku Nastavení → Požadavky,
 * plus nabídky, ze kterých se vybírá: zkratky aktivních LC + „DL"
 * (stejná logika jako fillLocationSelect u uživatele) a názvy pozic
 * z `_positions`.
 *
 * Nabídky posílá server proto, aby klient nemusel skládat dohromady dva
 * další endpointy jen kvůli dvěma selectům.
 */
function apiGetRequestSettings() {
  return guard_(PERM_KEYS.SETTINGS_MANAGE, () => {
    const settings = settingsAll_();

    const locations = ['DL'].concat(
      dbGetAll_(SHEETS.LOGISTIC_CENTERS)
        .filter((lc) => _lcIsActive_(lc) && String(lc.zkratka || '').trim())
        .map((lc) => String(lc.zkratka).trim())
    );

    const positions = dbGetAll_(SHEETS.POSITIONS)
      .map((row) => String(row.name || '').trim())
      .filter((name) => name)
      .sort((a, b) => a.localeCompare(b, 'cs'));

    return {
      location: String(settings.requestManagerLocation || ''),
      position: String(settings.requestManagerPosition || ''),
      locationOptions: locations,
      positionOptions: positions,
    };
  });
}

/**
 * Uloží dvojici umístění+pozice. Hodnoty se ZÁMĚRNĚ nevalidují proti
 * seznamům výše — pozice se dá v Nastavení přejmenovat i smazat a uložená
 * dvojice by se tím stala „neplatnou", přestože uživatelé s původním
 * textem v `_users` pořád existují. Kontrola by v takové chvíli zablokovala
 * i prosté znovuuložení. Prázdná pozice je platný stav = jen SUPERADMIN.
 *
 * @param {Object} payload  { location, position }
 */
function apiSetRequestSettings(payload) {
  return guard_(PERM_KEYS.SETTINGS_MANAGE, () => {
    const data = payload || {};
    const location = cleanText_(data.location, 'Umístění', LIMITS.ORG_FIELD_MAX, false);
    const position = cleanText_(data.position, 'Pozice', LIMITS.ORG_FIELD_MAX, false);

    settingsSet_('requestManagerLocation', location);
    settingsSet_('requestManagerPosition', position);

    audit_('settings.update', 'Změněno, kdo smí měnit stav požadavků: ' +
      (location || '(nenastaveno)') + ' / ' + (position || '(nenastaveno)'));

    return apiGetRequestSettings();
  });
}
