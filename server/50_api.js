/**
 * ════════════════════════════════════════════════════════════════════════════
 *  50_api.js — veřejné API volané z prohlížeče
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Vše, co je odsud volatelné přes google.script.run, MUSÍ projít guard_().
 * Bez guardu by šel endpoint zavolat přímo z konzole prohlížeče, i kdyby
 * v UI žádné tlačítko neexistovalo.
 *
 * Stav: bootstrap + čtení událostí. Zápis (vytváření/úprava/mazání) a
 * endpointy pro uživatele a nastavení přibývají v dalších krocích podle
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
      version: CONFIG.version,
      releaseDate: CONFIG.releaseDate,
    };
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
