/**
 * ════════════════════════════════════════════════════════════════════════════
 *  10_util.js — sdílené pomocné funkce
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Odpovědní obálka, generování ID, čas, formátování listů a auditní log.
 * Nic z toho nesmí obsahovat aplikační logiku — jen nástroje, které používají
 * ostatní vrstvy.
 */

/* ══════════════════════════════════════════════════════════════════════════
   ODPOVĚDNÍ OBÁLKA

   Každý veřejný endpoint vrací klientovi { ok: true, data } nebo
   { ok: false, error }. Klient to rozbaluje v Ui.call() (ui/core.html).

   Proč obálka a ne prosté vyhození výjimky: google.script.run předává výjimky
   klientovi v ořezané podobě a s textem, který nemáme pod kontrolou. Obálkou
   máme jistotu, co se k uživateli dostane.
   ══════════════════════════════════════════════════════════════════════════ */

/** Úspěšná odpověď. */
function ok_(data) {
  return { ok: true, data: data === undefined ? null : data };
}

/**
 * Vytvoří chybu, jejíž text SMÍ vidět uživatel.
 *
 * Bezpečnostní pravidlo (checklist č. 15): uživateli se nikdy nesmí dostat
 * technická chyba — obsahuje stack, ID souborů, někdy i e-maily. Proto
 * rozlišujeme dva druhy chyb:
 *   - userError_()  → srozumitelná hláška, kterou jsme sami napsali, projde ven
 *   - cokoliv jiné  → do logu jde vše, uživateli jen obecná věta
 */
function userError_(message) {
  const error = new Error(message);
  error.isUserError = true;
  return error;
}

/** Chybová odpověď. Technické detaily zůstávají v logu, ven jde bezpečný text. */
function fail_(error) {
  // Do serverového logu vždy celá chyba i se stackem — tam ji smí vidět jen správce.
  console.error(error && error.stack ? error.stack : error);

  const isUserError = !!(error && error.isUserError);
  return {
    ok: false,
    error: isUserError
      ? String(error.message)
      : 'Došlo k neočekávané chybě. Zkuste akci zopakovat, případně kontaktujte správce aplikace.',
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   IDENTIFIKÁTORY A ČAS
   ══════════════════════════════════════════════════════════════════════════ */

/** Nové unikátní ID záznamu. */
function uuid_() {
  return Utilities.getUuid();
}

/** Aktuální čas v ISO 8601 — jednotný formát pro všechny sloupce *_at. */
function nowIso_() {
  return new Date().toISOString();
}

/**
 * Dnešní datum v aplikační časové zóně jako `YYYY-MM-DD`.
 *
 * Používá se pro kontrolu „událost nelze založit do minulosti". Záměrně
 * serverový čas v Europe/Prague — čas z prohlížeče uživatele je vstup jako
 * každý jiný a nesmí rozhodovat o platnosti zápisu.
 */
function todayIso_() {
  return Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
}

/** Aktuální datum a čas v aplikační zóně jako `YYYY-MM-DDTHH:mm`. */
function nowLocalIso_() {
  return Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd'T'HH:mm");
}

/* ══════════════════════════════════════════════════════════════════════════
   FORMÁTOVÁNÍ LISTŮ
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Nastaví celému listu firemní font (CONFIG.sheetFont).
 *
 * Selhání se jen zaloguje — font je kosmetika a nesmí shodit vytvoření
 * databáze. Pokud se název fontu netrefí, Sheets nic neohlásí a list
 * zůstane v Arialu; opravu bez zakládání databáze znovu umí
 * TOOLS_prefontujDb() v 90_tools.js.
 */
function applySheetFont_(sheet) {
  try {
    sheet
      .getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns())
      .setFontFamily(CONFIG.sheetFont);
  } catch (e) {
    console.error('Nastavení fontu listu selhalo: ' + e);
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   AUDITNÍ LOG
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Zapíše řádek do listu `_audit_log` — kdo, kdy, co.
 *
 * Selhání auditu NIKDY neshodí hlavní operaci: kdyby zápis do logu shodil
 * uložení události, přišel by uživatel o data kvůli vedlejšímu zápisu.
 * Neúspěch se proto jen zaloguje do Stackdriveru.
 *
 * @param {string} action  krátký kód akce, např. 'setup', 'user.create', 'event.delete'
 * @param {string} detail  lidsky čitelný popis změny
 */
function audit_(action, detail) {
  try {
    dbAppend_(SHEETS.AUDIT, {
      timestamp: nowIso_(),
      user: currentEmail_() || 'system',
      action: String(action || ''),
      detail: String(detail || ''),
    });
  } catch (e) {
    console.error('Zápis do auditního logu selhal: ' + e);
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   NORMALIZACE VSTUPŮ

   Používá se ve validační vrstvě 50_api.js. Cílem je, aby se do databáze
   nikdy nedostal neořezaný, příliš dlouhý nebo neočekávaný text.
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Ořeže text a ověří délku. Vyhodí srozumitelnou chybu, když je pole
 * povinné a prázdné, nebo když překročí limit.
 *
 * @param {*} value          hodnota z klienta (může být cokoliv)
 * @param {string} fieldName název pole pro chybovou hlášku
 * @param {number} maxLength maximální délka po ořezu
 * @param {boolean} required true = prázdná hodnota je chyba
 */
function cleanText_(value, fieldName, maxLength, required) {
  const text = String(value === null || value === undefined ? '' : value).trim();

  if (required && !text) {
    throw userError_('Pole „' + fieldName + '" je povinné.');
  }
  if (text.length > maxLength) {
    throw userError_('Pole „' + fieldName + '" může mít nejvýše ' + maxLength + ' znaků.');
  }
  return text;
}

/**
 * Normalizuje e-mail na malá písmena bez okrajových mezer.
 * Všechna porovnání e-mailů v aplikaci probíhají nad touto podobou —
 * jinak by „Jan.Novak@…" a „jan.novak@…" byli dva různí lidé.
 */
function cleanEmail_(value) {
  return String(value === null || value === undefined ? '' : value).trim().toLowerCase();
}

/**
 * Ověří, že hodnota je jedna z povolených (whitelist).
 * Použití: role, oprávnění, typ události, klíče nastavení.
 */
function pickFrom_(value, allowedValues, fieldName) {
  const text = String(value === null || value === undefined ? '' : value).trim();
  if (allowedValues.indexOf(text) === -1) {
    throw userError_('Neplatná hodnota pole „' + fieldName + '".');
  }
  return text;
}
