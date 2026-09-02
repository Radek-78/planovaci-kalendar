/**
 * ════════════════════════════════════════════════════════════════════════════
 *  30_auth.js — identita a oprávnění
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Aplikace je nasazená jako „Execute as me" (executeAs: USER_DEPLOYING).
 * Uživatelé proto NEPOTŘEBUJÍ přístup k databázovému spreadsheetu — o tom,
 * kdo se do aplikace dostane, rozhoduje výhradně list `_users`.
 *
 * Základní pravidlo celé vrstvy: identita se bere ze session, nikdy
 * z parametrů volání. Cokoliv, co pošle klient, je vstup — ne důkaz totožnosti.
 */

/* ══════════════════════════════════════════════════════════════════════════
   IDENTITA
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * E-mail přihlášeného uživatele (normalizovaný na malá písmena).
 *
 * U účtů mimo Workspace doménu může Apps Script vrátit prázdný řetězec —
 * takový uživatel pak nemá přístup, což je správné chování.
 */
function currentEmail_() {
  try {
    return cleanEmail_(Session.getActiveUser().getEmail());
  } catch (e) {
    console.error('Zjištění e-mailu uživatele selhalo: ' + e);
    return '';
  }
}

/** E-mail vlastníka skriptu — pod jehož účtem aplikace běží. */
function ownerEmail_() {
  try {
    return cleanEmail_(Session.getEffectiveUser().getEmail());
  } catch (e) {
    console.error('Zjištění e-mailu vlastníka selhalo: ' + e);
    return '';
  }
}

/**
 * Vrátí přihlášeného uživatele z `_users`, nebo null, když v tabulce není
 * nebo je deaktivovaný.
 *
 * Doplňuje výchozí hodnoty role a oprávnění pro případ, že by řádek vznikl
 * ručně v tabulce s prázdnými sloupci — chybějící hodnota nikdy nesmí
 * znamenat širší práva, proto USER + VIEWER (nejužší kombinace).
 */
function getCurrentUser_() {
  const email = currentEmail_();
  if (!email) return null;

  const user = dbGetAll_(SHEETS.USERS).find(
    (record) => cleanEmail_(record.email) === email
  );
  if (!user) return null;
  if (toBool_(user.active) !== true) return null;

  return {
    id: String(user.id),
    email: cleanEmail_(user.email),
    firstName: String(user.firstName || ''),
    lastName: String(user.lastName || ''),
    role: ROLES[String(user.role).trim().toUpperCase()] || ROLES.USER,
    permission: PERMISSIONS[String(user.permission).trim().toUpperCase()] || PERMISSIONS.VIEWER,
    active: true,
  };
}

/**
 * Očistí uživatele pro odeslání klientovi.
 *
 * Vrací jen to, co UI opravdu potřebuje. Interní pole (číslo řádku v listu,
 * časová razítka) ven neposíláme — klient s nimi nic nedělá a každá vyzrazená
 * informace o vnitřní struktuře je zbytečné riziko.
 */
function publicUser_(user) {
  if (!user) return null;
  return {
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: (user.firstName + ' ' + user.lastName).trim() || user.email,
    role: user.role,
    permission: user.permission,
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   OPRÁVNĚNÍ

   Matice je záměrně v kódu, ne v tabulce — pro šest uživatelů je
   konfigurovatelná matice rolí zbytečná abstrakce a další místo, kde se dá
   omylem otevřít přístup.

   |                    | read | write | users | settings |
   | SUPERADMIN         |  ✓   |   ✓   |   ✓   |    ✓     |
   | ADMIN              |  ✓   |   ✓   |   ✓   |    –     |
   | USER + EDITOR      |  ✓   |   ✓   |   –   |    –     |
   | USER + VIEWER      |  ✓   |   –   |   –   |    –     |
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Ověří, zda uživatel smí provést akci danou klíčem oprávnění.
 *
 * @param {Object|null} user          uživatel z getCurrentUser_()
 * @param {string} permissionKey      jeden z PERM_KEYS
 * @returns {boolean}
 */
function isAllowed_(user, permissionKey) {
  if (!user || user.active !== true) return false;

  // Superadmin má vždy plná práva — žádná další větev ho nesmí omezit.
  if (user.role === ROLES.SUPERADMIN) return true;

  switch (permissionKey) {
    case PERM_KEYS.CALENDAR_READ:
      // Kdo je v aplikaci, vidí všechny události — žádné skupiny neexistují.
      return true;

    case PERM_KEYS.CALENDAR_WRITE:
      // Admin zapisuje vždy; běžný uživatel jen s oprávněním EDITOR.
      return user.role === ROLES.ADMIN || user.permission === PERMISSIONS.EDITOR;

    case PERM_KEYS.USERS_MANAGE:
      return user.role === ROLES.ADMIN;

    case PERM_KEYS.SETTINGS_MANAGE:
      // Nastavení aplikace je vyhrazené superadminovi (ošetřeno výše).
      return false;

    default:
      // Neznámý klíč = zamítnout. Nikdy nepovolovat „pro jistotu".
      console.error('Neznámý klíč oprávnění: ' + permissionKey);
      return false;
  }
}

/**
 * Smí uživatel měnit a mazat CIZÍ události?
 * Vlastní události smí měnit každý, kdo má právo zápisu — to řeší volající.
 */
function canManageForeignEvents_(user) {
  return !!user && (user.role === ROLES.SUPERADMIN || user.role === ROLES.ADMIN);
}

/**
 * Smí uživatel upravit událost, která už proběhla?
 * Řídí se nastavením `pastEditAdminOnly`; když je vypnuté, smí každý,
 * kdo má právo zápisu.
 */
function canEditPastEvents_(user, settings) {
  if (!settings || settings.pastEditAdminOnly !== true) return true;
  return canManageForeignEvents_(user);
}

/* ══════════════════════════════════════════════════════════════════════════
   GUARD — jednotný obal každého veřejného endpointu
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Ověří inicializaci, přihlášení a oprávnění; teprve pak spustí fn(user).
 * Výsledek nebo chybu zabalí do odpovědní obálky.
 *
 * KAŽDÝ endpoint v 50_api.js musí projít touto funkcí. Skrytí tlačítka v UI
 * není oprávnění — bez guard_ by šel endpoint zavolat přímo z konzole
 * prohlížeče přes google.script.run.
 *
 * @param {string} permissionKey  jeden z PERM_KEYS
 * @param {Function} fn           tělo endpointu, dostane přihlášeného uživatele
 */
function guard_(permissionKey, fn) {
  // Apps Script může mezi jednotlivými voláními znovu použít stejnou "teplou"
  // instanci běhu — modulové proměnné (dbCache_) se tedy NEMUSÍ vynulovat
  // samy, jak by se dalo čekat. Bez tohoto resetu by endpoint mohl vrátit
  // zastaralá data, pokud tabulku mezitím změnil jiný běh (typicky ruční
  // TOOLS_* funkce spuštěná z editoru — ta běží ve zcela jiné instanci
  // a dbInvalidate_, který volá, na tuto instanci nemá žádný vliv).
  dbCache_ = {};

  try {
    if (!isSetupDone_()) {
      throw userError_('Aplikace není inicializována. Kontaktujte správce.');
    }

    const user = getCurrentUser_();
    if (!user) {
      throw userError_('Nemáte přístup do aplikace. Kontaktujte správce.');
    }

    if (!isAllowed_(user, permissionKey)) {
      throw userError_('Na tuto akci nemáte dostatečné oprávnění.');
    }

    return ok_(fn(user));
  } catch (error) {
    return fail_(error);
  }
}
