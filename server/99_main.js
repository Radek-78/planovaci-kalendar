/**
 * ════════════════════════════════════════════════════════════════════════════
 *  99_main.js — vstupní bod webové aplikace
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Routing podle stavu:
 *   aplikace není inicializovaná  →  úvodní průvodce (wizard)
 *   aplikace je inicializovaná    →  aplikace
 *
 * Pozn. k rozlišení „má / nemá přístup": v doGet() nelze u tohoto typu
 * nasazení („Execute as me") spolehlivě zjistit přihlášeného uživatele —
 * Session.getActiveUser() tu vrací prázdný e-mail. Přístup proto vyhodnocuje
 * až první volání apiGetBootstrap() z prohlížeče a podle výsledku UI zobrazí
 * buď aplikaci, nebo obrazovku „bez přístupu".
 */

function doGet() {
  // Stejný důvod jako v guard_() (30_auth.js) — "teplá" instance běhu si
  // může nést zastaralou dbCache_ z předchozího požadavku.
  dbCache_ = {};

  let page = 'wizard';
  let settings = {};

  try {
    if (isSetupDone_()) {
      page = 'app';
      settings = settingsAll_();
    }
  } catch (error) {
    // Chyba při zjišťování stavu nesmí skončit prázdnou stránkou —
    // aplikace se v takovém případě chová, jako by nebyla inicializovaná,
    // a uživatel uvidí wizard s vysvětlením.
    console.error('doGet — vyhodnocení stavu selhalo: ' + error);
  }

  // Data předaná do stránky. Vědomě NEOBSAHUJÍ nic citlivého — bootstrap je
  // v HTML čitelný komukoliv, kdo stránku otevře.
  const data = {
    page: page,
    appName: settings.appName || CONFIG.defaultAppName,
    appSubtitle: settings.appSubtitle || CONFIG.defaultAppSubtitle,
    version: CONFIG.version,
    releaseDate: CONFIG.releaseDate,
    setup: page === 'wizard' ? wizardInfo_() : null,
  };

  const template = HtmlService.createTemplateFromFile('index');
  template.app = data;
  // Escapování "<" zabrání tomu, aby hodnota v JSON předčasně ukončila
  // <script> blok (klasická cesta k XSS přes vložený "</script>").
  template.bootstrapJson = JSON.stringify(data).replace(/</g, '\\u003c');

  return template
    .evaluate()
    .setTitle(data.appName)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Vloží obsah jiného HTML souboru do šablony (`<?!= include('ui/styles') ?>`).
 * Apps Script nemá skutečné složky — název včetně lomítka je celý název souboru.
 */
function include(fileName) {
  return HtmlService.createHtmlOutputFromFile(fileName).getContent();
}
