/**
 * ════════════════════════════════════════════════════════════════════════════
 *  40_setup.js — inicializace aplikace (backend úvodního průvodce)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Toto je JEDINÉ místo v celé aplikaci, kde vzniká databáze. Nikde jinde se
 * spreadsheet nezakládá ani „nedoplňuje za běhu" — kdyby to šlo, dala by se
 * neúmyslně vytvořit druhá, prázdná databáze a aplikace by tiše přišla o data.
 *
 * Průběh prvního spuštění:
 *   doGet() zjistí, že chybí Script Property DB_SPREADSHEET_ID
 *   → místo aplikace vyrenderuje wizard
 *   → wizard smí dokončit POUZE vlastník skriptu
 *   → vznikne databáze ve složce skriptu, vlastník se zapíše jako SUPERADMIN
 */

/* ══════════════════════════════════════════════════════════════════════════
   STAV INICIALIZACE
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Je aplikace inicializovaná?
 *
 * Nestačí, že property existuje — spreadsheet mohl být mezitím smazán.
 * V takovém případě property vynulujeme, aby se dal wizard spustit znovu
 * a aplikace nezůstala trvale rozbitá s odkazem na neexistující soubor.
 */
function isSetupDone_() {
  const properties = PropertiesService.getScriptProperties();
  const id = properties.getProperty(PROPS.DB_ID);
  if (!id) return false;

  try {
    // Otevřený spreadsheet se rovnou uloží jako handle repository vrstvy.
    // Bez toho by ho dbSpreadsheet_() otevíralo podruhé — a otevření
    // spreadsheetu je v Apps Scriptu nejdražší část celého požadavku.
    dbHandle_ = SpreadsheetApp.openById(id);
    return true;
  } catch (e) {
    console.error('Databáze podle uloženého ID nejde otevřít, property se ruší: ' + e);
    properties.deleteProperty(PROPS.DB_ID);
    dbHandle_ = null;
    return false;
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   SLOŽKA V DRIVE
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Složka, ve které leží tento Apps Script projekt — právě tam vznikne databáze.
 *
 * POZOR: rozhoduje umístění skriptu v okamžiku spuštění wizardu. Pozdější
 * přesun skriptu už s databází nepohne, ta zůstane tam, kde vznikla.
 *
 * @returns {Folder|null} null = kořen Disku nebo nedostatečná práva
 */
function scriptFolder_() {
  try {
    const parents = DriveApp.getFileById(ScriptApp.getScriptId()).getParents();
    return parents.hasNext() ? parents.next() : null;
  } catch (e) {
    console.error('Složku skriptu se nepodařilo zjistit: ' + e);
    return null;
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   DATA PRO ÚVODNÍ OBRAZOVKU WIZARDU
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Údaje, které wizard vykreslí ještě před prvním voláním serveru.
 * Volá se z doGet(), takže tu NELZE spolehlivě zjistit přihlášeného uživatele
 * (Session.getActiveUser() v doGet u tohoto typu nasazení vrací prázdno) —
 * e-mail se proto dotahuje až klientsky přes wizardGetOwnerEmail().
 */
function wizardInfo_() {
  const folder = scriptFolder_();
  return {
    folderName: folder ? folder.getName() : null,
    defaultAppName: CONFIG.defaultAppName,
    defaultAppSubtitle: CONFIG.defaultAppSubtitle,
  };
}

/**
 * Vrátí klientovi e-mail přihlášeného uživatele, e-mail vlastníka skriptu,
 * cílovou složku a informaci, jestli je přihlášený opravdu vlastník.
 *
 * Wizard podle `isOwner` povolí, nebo zablokuje tlačítko „Pokračovat".
 * Skutečná kontrola je ale až v setupInitialize() — UI jen zabraňuje tomu,
 * aby uživatel proklikal celý průvodce a teprve na konci se dozvěděl, že nesmí.
 */
function wizardGetOwnerEmail() {
  try {
    const folder = scriptFolder_();
    const email = currentEmail_();
    const owner = ownerEmail_();

    return ok_({
      email: email,
      folderName: folder ? folder.getName() : null,
      isOwner: !!email && !!owner && email === owner,
    });
  } catch (e) {
    return fail_(e);
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   DOKONČENÍ WIZARDU
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Vytvoří databázi, zapíše superadmina a nastavení.
 *
 * Bezpečnostní pravidla:
 *  - smí jen vlastník skriptu (ověřeno proti Session, ne proti payloadu),
 *  - role SUPERADMIN je v kódu natvrdo — nikdy nepřichází z formuláře,
 *  - celý průběh je pod zámkem a kontrola „už inicializováno" se opakuje
 *    uvnitř zámku, takže dvě souběžná dokončení nevytvoří dvě databáze,
 *  - nepřijímá ID existujícího spreadsheetu; jediná databáze je ta, kterou
 *    si funkce vytvoří sama.
 *
 * @param {Object} payload  { appName, appSubtitle, firstName, lastName }
 */
function setupInitialize(payload) {
  try {
    // 1) Rychlá kontrola ještě před zámkem — ušetří čekání v běžném případě.
    if (isSetupDone_()) {
      throw userError_('Aplikace už je inicializována.');
    }

    // 2) Inicializaci smí provést pouze vlastník skriptu.
    const email = currentEmail_();
    const owner = ownerEmail_();
    if (!email) {
      throw userError_('Nepodařilo se zjistit váš účet. Přihlaste se firemním účtem a zkuste to znovu.');
    }
    if (email !== owner) {
      throw userError_('Inicializaci může provést pouze vlastník skriptu.');
    }

    // 3) Validace vstupů z formuláře.
    const data = payload || {};
    const appName = cleanText_(data.appName, 'Název aplikace', LIMITS.APP_NAME_MAX, true);
    const appSubtitle = cleanText_(data.appSubtitle, 'Podtitul', LIMITS.APP_SUBTITLE_MAX, false);
    const firstName = cleanText_(data.firstName, 'Jméno', LIMITS.NAME_MAX, true);
    const lastName = cleanText_(data.lastName, 'Příjmení', LIMITS.NAME_MAX, true);

    return withLock_(() => {
      // 4) Kontrola se opakuje UVNITŘ zámku — mezi bodem 1 a získáním zámku
      //    mohl inicializaci dokončit jiný souběžný běh.
      if (isSetupDone_()) {
        throw userError_('Aplikace už je inicializována.');
      }

      // 5) Vytvoření spreadsheetu a jeho přesun do složky skriptu.
      const spreadsheet = SpreadsheetApp.create(appName + ' – databáze');
      const defaultSheet = spreadsheet.getSheets()[0];

      const folder = scriptFolder_();
      if (folder) {
        DriveApp.getFileById(spreadsheet.getId()).moveTo(folder);
      }

      // 6) Listy podle schématu (včetně firemního fontu a textových sloupců).
      dbEnsureSchema_(spreadsheet);

      // 7) Výchozí prázdný list, který Sheets vytvoří spolu se souborem,
      //    už není potřeba. Maže se až po vytvoření ostatních — spreadsheet
      //    nesmí zůstat bez jediného listu.
      spreadsheet.deleteSheet(defaultSheet);

      // 8) Propojení skriptu s databází. Od této chvíle je aplikace inicializovaná.
      const properties = {};
      properties[PROPS.DB_ID] = spreadsheet.getId();
      properties[PROPS.SETUP_AT] = nowIso_();
      PropertiesService.getScriptProperties().setProperties(properties);

      // Repository vrstva si drží handle a cache z běhu před inicializací —
      // je nutné je přepnout na nově vzniklou databázi.
      dbHandle_ = spreadsheet;
      dbCache_ = {};

      // 9) Vlastník se stává superadminem. Role je natvrdo, ne z payloadu.
      dbInsert_(SHEETS.USERS, {
        email: email,
        firstName: firstName,
        lastName: lastName,
        role: ROLES.SUPERADMIN,
        permission: PERMISSIONS.EDITOR,
        active: true,
        last_visit_at: '',
      });

      // 10) Základní nastavení aplikace.
      settingsSet_('appName', appName);
      settingsSet_('appSubtitle', appSubtitle);

      // 11) Záznam do auditu.
      audit_(
        'setup',
        'Inicializace aplikace. Databáze: ' + spreadsheet.getId() +
        ', složka: ' + (folder ? folder.getName() : 'kořen Disku') +
        ', superadmin: ' + email
      );

      return ok_({
        spreadsheetUrl: spreadsheet.getUrl(),
        appUrl: ScriptApp.getService().getUrl(),
        folderName: folder ? folder.getName() : null,
      });
    });
  } catch (error) {
    return fail_(error);
  }
}
