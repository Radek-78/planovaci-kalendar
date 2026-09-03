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

/**
 * Formátuje místní datum a čas (tvar `YYYY-MM-DDTHH:mm`, stejný jako
 * events.start/end nebo nowLocalIso_()) na čitelné „D.M.RRRR HH:mm" —
 * jednotný formát datumu a času v celé appce (na klientovi App.formatDateTime
 * v ui/view_app.html). Používá se v textech pro audit log/oznámení, ať
 * v nich není syrové ISO.
 */
function formatDateTimeCz_(localIso) {
  const text = String(localIso);
  const dateParts = text.slice(0, 10).split('-');
  return Number(dateParts[2]) + '.' + Number(dateParts[1]) + '.' + dateParts[0] + ' ' + text.slice(11, 16);
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
 * Zapíše řádek do listu `_audit_log` — kdo, kdy, co (a k čemu — entityId).
 *
 * `timestamp` je v MÍSTNÍM čase (nowLocalIso_, ne nowIso_) — appka zobrazuje
 * jednotný formát „D.M.RRRR HH:MM" (viz App.formatDateTime), a UTC čas
 * z nowIso_() by se pod tímhle formátem zobrazil o 1–2 hodiny posunutý
 * (rozdíl Europe/Prague od UTC), takže musí sedět místní.
 *
 * `detail` NIKDY nesmí obsahovat technické ID (viz zvoneček s oznámeními) —
 * je to čitelný text pro člověka, ne data pro appku. Cokoli, na co appka
 * potřebuje odkázat (např. proklik z oznámení na konkrétní událost), patří
 * do `entityId`, ne do textu.
 *
 * Selhání auditu NIKDY neshodí hlavní operaci: kdyby zápis do logu shodil
 * uložení události, přišel by uživatel o data kvůli vedlejšímu zápisu.
 * Neúspěch se proto jen zaloguje do Stackdriveru.
 *
 * @param {string} action    krátký kód akce, např. 'setup', 'user.create', 'event.delete'
 * @param {string} detail    lidsky čitelný popis změny — bez ID
 * @param {string} [entityId] id záznamu, kterého se akce týká (u komentářů id UDÁLOSTI, ne komentáře — proklik vždy vede na událost)
 */
function audit_(action, detail, entityId) {
  try {
    dbAppend_(SHEETS.AUDIT, {
      timestamp: nowLocalIso_(),
      user: currentEmail_() || 'system',
      action: String(action || ''),
      detail: String(detail || ''),
      entity_id: entityId ? String(entityId) : '',
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

/**
 * Ověří, že hodnota je platné datum ve tvaru `YYYY-MM-DD`.
 *
 * Kontroluje i to, že datum skutečně existuje (např. „2026-02-31" formát
 * splní, ale zpětné složení z Date objektu se neshoduje — takže neprojde).
 */
function cleanDateOnly_(value, fieldName) {
  const text = String(value === null || value === undefined ? '' : value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw userError_('Pole „' + fieldName + '" musí být datum ve tvaru RRRR-MM-DD.');
  }

  const parts = text.split('-').map(Number);
  const year = parts[0], month = parts[1], day = parts[2];
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw userError_('Pole „' + fieldName + '" obsahuje neplatné datum.');
  }
  return text;
}

/**
 * Ověří, že hodnota je platné datum a čas ve tvaru `YYYY-MM-DDTHH:mm`
 * (formát sloupců events.start/end). Stejná logika jako cleanDateOnly_,
 * navíc s kontrolou hodin a minut.
 */
function cleanDateTime_(value, fieldName) {
  const text = String(value === null || value === undefined ? '' : value).trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(text);
  if (!match) {
    throw userError_('Pole „' + fieldName + '" musí být ve tvaru RRRR-MM-DDTHH:mm.');
  }

  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const hour = Number(match[4]), minute = Number(match[5]);
  const date = new Date(year, month - 1, day, hour, minute);
  const valid = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    && date.getHours() === hour && date.getMinutes() === minute;
  if (!valid) {
    throw userError_('Pole „' + fieldName + '" obsahuje neplatné datum nebo čas.');
  }
  return text;
}
