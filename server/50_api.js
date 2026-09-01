/**
 * ════════════════════════════════════════════════════════════════════════════
 *  50_api.js — veřejné API volané z prohlížeče
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Vše, co je odsud volatelné přes google.script.run, MUSÍ projít guard_().
 * Bez guardu by šel endpoint zavolat přímo z konzole prohlížeče, i kdyby
 * v UI žádné tlačítko neexistovalo.
 *
 * Stav: fáze 1 — zatím jen bootstrap aplikace. Endpointy pro kalendář,
 * uživatele a nastavení přibývají ve fázích 3 až 5 podle SPECIFIKACE.md.
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
