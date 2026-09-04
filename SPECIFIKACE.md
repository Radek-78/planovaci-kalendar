# Plánovací kalendář — specifikace

Verze dokumentu: 1 (pracovní návrh)
Datum: 1. 9. 2026
Stav: **k odsouhlasení** — kóduje se až po schválení

---

## 1. Účel a rozsah

Samostatná webová aplikace v Google Apps Script pro **cca 6 uživatelů**. Slouží
výhradně jako sdílený plánovací kalendář.

**Co aplikace umí:**

- kalendář s událostmi — vytváření, editace, mazání
- události mají čas od–do, mohou být vícedenní nebo celodenní
- správa uživatelů a jejich oprávnění (RBAC)
- základní nastavení aplikace

**Co aplikace záměrně neumí (a nebude):**

- skupiny / plánovače — kdo je v aplikaci, vidí všechny události
- vazba na centrální databázi Planung Dashboardu, LC kódy, filiálky, sklady
- úkoly, statusy, kategorie a další agendu PMS

Základem je šablona `Výchozí aplikace 2.0`, osekaná na nutné minimum. Kalendářní
mřížka se přebírá z `Planung Dashboard` → `PMS` → Plánovací kalendář.

---

## 2. Životní cyklus — od nuly k běžící aplikaci

1. V Drive existuje **pouze Apps Script projekt** (scriptId
   `19SDXCjbQ9v8CU3CKHcm1JzmTdpS8e56YXEm4tcTiywiqNYUnKHLAy-XI`). Žádná
   databáze předem neexistuje.
2. `clasp push` nahraje soubory do projektu.
3. Deploy → New deployment → **Web app**, Execute as **Me**, Access **Domain**.
4. První otevření URL → aplikace zjistí, že chybí `DB_SPREADSHEET_ID`, a místo
   kalendáře vyrenderuje **úvodního průvodce (wizard)**.
5. Wizard smí dokončit **pouze vlastník skriptu**. Zadá název aplikace,
   podtitul a své jméno; jeho e-mail se bere ze session, needituje se.
6. Dokončením wizardu vznikne **databázový spreadsheet ve stejné složce Drive,
   kde leží Apps Script projekt**, s listy podle schématu, celý ve firemním
   fontu. Vlastník se zapíše jako **SUPERADMIN**.
7. Wizard se dál nikdy nespustí (kromě ručního resetu nástrojem). Otevření URL
   už rovnou spouští aplikaci.
8. Superadmin v sekci **Uživatelé** přidá zbylých ~5 lidí.

---

## 3. Technický základ

| Položka | Hodnota |
|---|---|
| Platforma | Google Apps Script, runtime **V8** |
| Časová zóna | `Europe/Prague` |
| Nasazení | Web app, `executeAs: USER_DEPLOYING` („Execute as me") |
| Přístup | `access: DOMAIN` |
| Databáze | Google Spreadsheet ve složce skriptu, vytvořený wizardem |
| Deploy | `clasp push`, podsložky `server/` a `ui/` (`skipSubdirectories: false`) |
| Externí závislosti | jediná — Phosphor Icons z `unpkg.com`, verze připnutá na `@2.1.1` |

**Proč Execute as me:** uživatelé pak nepotřebují přístup k databázovému
spreadsheetu. O tom, kdo se do aplikace dostane, rozhoduje **výhradně list
`_users`** — ne sdílení souboru v Drive.

### 3.1 OAuth scopes

Minimální možná sada. Gmail scope se přidá až ve fázi notifikací, ne dřív.

```
https://www.googleapis.com/auth/spreadsheets
https://www.googleapis.com/auth/drive
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/script.scriptapp
```

`drive` (ne `drive.file`) je nutný kvůli zjištění složky skriptu a přesunu nově
vytvořeného spreadsheetu do ní.

---

## 4. Struktura souborů

```text
AAA_VERZE.html      indikátor nasazené verze (první v abecedě, v aplikaci nepoužit)
appsscript.json     manifest — scopes, webapp, časová zóna
server/
  00_config.js      CONFIG, ROLES, ROLE_LEVEL, SHEETS, PROPS, EVENT_TYPES
  10_util.js        ok_/fail_, uuid_, nowIso_, audit_, applySheetFont_
  20_db.js          DB_SCHEMA, dbEnsureSchema_, CRUD, withLock_, cache
  30_auth.js        currentEmail_, getCurrentUser_, isAllowed_, guard_
  40_setup.js       isSetupDone_, scriptFolder_, wizardInfo_, setupInitialize
  50_api.js         veřejné endpointy (vše přes guard_)
  60_import.js      import dat filiálek/LC ze sdíleného souboru na Disku
  90_tools.js       ruční nástroje vlastníka (reset, diagnostika, trigger importu)
  99_main.js        doGet — routing wizard / app / bez přístupu
ui/
  styles.html       design systém (Lidl barvy, komponenty) + blok kalendáře
  core.html         Ui.call, loader, toasty, modaly, escapeHtml
  view_wizard.html  úvodní průvodce
  view_app.html     shell: Kalendář | Uživatelé | Nastavení
  view_noaccess.html obrazovka bez přístupu
index.html          vstupní šablona, bootstrap dat
tools/
  release.ps1       vydání: verze + changelog + git + clasp push (viz kapitola 12)
CHANGELOG.md        historie vydání
SPECIFIKACE.md      tento dokument
```

Soubory `tools/`, `CHANGELOG.md` a `SPECIFIKACE.md` se do Apps Scriptu
nenahrávají — patří do `.claspignore`.

Apps Script nemá skutečné složky — po pushi se soubory jmenují
`server/00_config.gs`, `ui/styles.html` atd. Pořadí načítání `.gs` souborů
neurčuje název, ale Apps Script načte všechny před spuštěním, takže číslování
je čistě pro přehlednost člověka.

---

## 5. Databáze

### 5.1 Schéma

```js
const DB_SCHEMA = {
  '_users':     ['id','email','firstName','lastName','role','permission','active',
                 'created_at','created_by','updated_at','last_visit_at',
                 'location','department','position'],
  '_settings':  ['key','value','updated_at','updated_by'],
  '_audit_log': ['timestamp','user','action','detail','entity_id'],
  'events':     ['id','start','end','all_day','type','title','description',
                 'owner_email','created_at','created_by','updated_at','updated_by'],
  'event_comments': ['id','event_id','author_email','text','created_at'],
  // Nastavení (viz kapitola 9.5) — všechno spravované v appce, ne v kódu.
  '_departments': ['id','name','created_at','created_by','updated_at','updated_by'],
  '_positions':   ['id','name','created_at','created_by','updated_at','updated_by'],
  '_event_types': ['id','label','icon','color','bg_color','created_at','created_by','updated_at','updated_by'],
  // Import dat filiálek (viz kapitola 9.6) — zrcadlo cizího souboru na
  // Disku, appka jen čte a jednou za čas přepisuje (dbReplaceAll_).
  '_stores': ['id','kod','nazev','lc','active',
              'telefon_prodejny','vt','telefon_vt','rm','telefon_rm','zastupce_rm','telefon_zastupce',
              'ulice','mesto','psc',
              'po_otevreno','po_zavreno','ut_otevreno','ut_zavreno','st_otevreno','st_zavreno',
              'ct_otevreno','ct_zavreno','pa_otevreno','pa_zavreno','so_otevreno','so_zavreno',
              'ne_otevreno','ne_zavreno','updated_at'],
  '_logistic_centers': ['id','cislo','zkratka','nazev','active','created_at','created_by','updated_at','updated_by'],
  '_store_closures':   ['id','nazev','od','do','celkem_dni','updated_at'],
  // Trvalá historie synchronizací (Log importu) — append-only.
  '_import_log': ['id','file_name',
                   'stores_added','stores_changed','stores_removed',
                   'lc_added','lc_removed','closures_added','closures_removed',
                   'summary','detail','created_at','created_by'],
  // Státní svátky ČR (viz kapitola 9.7) — plně editovatelný seznam, appka
  // pro nový rok jen JEDNOU naseje výchozí zákonnou sadu.
  '_holidays': ['id','date','name','created_at','created_by','updated_at','updated_by'],
};
```

`dbEnsureSchema_()` chybějící listy a sloupce doplní, **nikdy nic nemaže** —
funguje tedy i jako migrace při pozdějším rozšíření.

### 5.2 Formáty sloupců

| Sloupec | Typ / formát | Poznámka |
|---|---|---|
| `id` | UUID text | generuje `Utilities.getUuid()` |
| `email`, `owner_email` | text, lowercase | normalizace při zápisu i porovnání |
| `role` | `SUPERADMIN` / `ADMIN` / `USER` | whitelist |
| `permission` | `EDITOR` / `VIEWER` | uplatní se jen u role USER |
| `active` | boolean | neaktivní = žádný přístup |
| `start`, `end` | text `YYYY-MM-DDTHH:mm` | **vždy** i u celodenních |
| `all_day` | boolean | jen řídí zobrazení a formulář |
| `type` | klíč z `EVENT_TYPES` | whitelist |
| `title` | text, 1–120 znaků | povinné |
| `description` | text, max 2000 znaků | nepovinné |
| `*_at` | ISO 8601 text | `nowIso_()` |

**Past ze Sheets — dvojí ochrana:** sloupce `start` a `end` musí zůstat
doslovný text (`2026-09-01T08:30`), jinak Sheets hodnotu tiše převede na typ
Date a textové porovnání rozsahu v `apiGetEvents` přestane fungovat (řetězec
jako `"Wed Sep 02"` se s `RRRR-MM-DD` nikdy neshoduje). Tato chyba se v PMS
reálně vyskytla (`_pmsEnsurePlannerEventsSheet_`) a 2. 9. 2026 i tady —
ověřeno nástrojem `TOOLS_diagnostikaUdalosti`.

Samotné nastavení formátu buňky na `"@"` (`setNumberFormat`) se ukázalo
**nespolehlivé** — Sheets si řetězec vypadající jako datum přesto tiše
převede při zápisu přes `appendRow`/`setValues`. Funkční řešení je dvoufázové:
1. **při zápisu** (`dbRecordToRow_`) se hodnota u sloupců z `TEXT_COLUMNS`
   uvozuje apostrofem (`'2026-09-01T08:30`) — stejný trik jako ruční zápis
   v UI Sheets, který vynutí doslovný text; do výsledné hodnoty se apostrof
   nepropíše,
2. **při čtení** (`dbGetAll_`) se u `events.start`/`events.end` (jediných
   sloupců, kde na formátu závisí logika, ne jen zobrazení) hodnota typu
   `Date` převede zpět na `YYYY-MM-DDTHH:mm` — obrana do hloubky pro řádky,
   které vznikly ještě před opravou, nebo byly ručně upravené přímo v Sheets.

Viz [[apps-script-text-format-nespolehlive]] v paměti projektu.

**Celodenní událost** se ukládá jako `start = YYYY-MM-DDT00:00` a
`end = YYYY-MM-DDT23:59`, plus `all_day = true`. Díky tomu funguje jediné
porovnání rozsahu pro všechny typy událostí a řazení je prosté textové
porovnání.

**Druhá reálná manifestace téže třídy chyby (4. 9. 2026):** `_stores.id`
(= "Číslo" filiálky ze zdroje, např. `"994"`) není v `TEXT_COLUMNS`, takže
si ho Sheets tiše převedl na typ Number. `dbFindBy_`/`dbFindById_`
porovnávaly striktním `===` — `record.id` (number `994`) se s poslaným
`String(id)` (`"994"`) nikdy neshodovalo, takže (de)aktivace filiálky
vždycky spadla na „Filiálka nebyla nalezena — mohla ji mezitím smazat
synchronizace", i když filiálka v databázi normálně byla. Oprava (viz
20_db.js): `dbFindBy_` teď porovnává `String()` na obou stranách (bezpečné
pro všechny sloupce, podle kterých se appka takhle dohledává — id/email/
key jsou pojmově vždycky text), `id` navíc doplněno do `TEXT_COLUMNS._stores`/
`_store_closures`, ať se u obou napříště zapisuje chráněně (projeví se
až při dalším přepsání `dbReplaceAll_`, tedy dalším importu).

### 5.3 Font

Všechny listy databáze se po vytvoření naformátují firemním fontem přes
`applySheetFont_(sheet)` → `range.setFontFamily(CONFIG.sheetFont)`. Volá se
z `dbEnsureSchema_()` při zakládání každého nového listu.

Název fontu: **`Lidl Font Cond Pro`** (`CONFIG.sheetFont`).

`setFontFamily()` neexistující název tiše ignoruje — list by zůstal v Arialu
a nikde by se neobjevila chyba. Po prvním spuštění wizardu se proto název
ověří pohledem do vzniklé databáze. Pro případ, že by se netrefil, bude
v `90_tools.js` funkce `TOOLS_prefontujDb`, která přeformátuje všechny listy
existující databáze — oprava tedy nevyžaduje zakládat databázi znovu.

### 5.4 Nastavení (`_settings`)

| Klíč | Význam | Výchozí |
|---|---|---|
| `appName` | název aplikace v hlavičce | z wizardu |
| `appSubtitle` | podtitul | z wizardu |
| `notifyEnabled` | zapnuté e-mailové notifikace | `false` |
| `notifyEvents` | na co se posílá (`create,update,delete`) | prázdné |
| `notifyRecipients` | `all` / `owner` | `all` |
| `holidaysEnabled` | zvýrazňovat státní svátky | `true` |
| `holidaysSeededYears` | interní evidence, které roky už appka naplnila výchozí sadou svátků (čárkou oddělené, viz 9.7) — žádná záložka Nastavení ji přímo nenabízí | prázdné |
| `pastEditAdminOnly` | proběhlou událost smí měnit jen admin | `true` |

> Svátky jsou plně editovatelný seznam v Nastavení (tabulka `_holidays`,
> viz 5.1 a 9.7), ne pevný seznam v kódu — `holidaysEnabled` jen řídí,
> jestli appka svátky v kalendáři vůbec zvýrazňuje.

---

## 6. Role a oprávnění

### 6.1 Matice

| | vidí kalendář | zakládá / mění vlastní | mění cizí | mění proběhlé | uživatelé | nastavení |
|---|---|---|---|---|---|---|
| **SUPERADMIN** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **ADMIN** | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| **USER** + `EDITOR` | ✓ | ✓ | — | — | — | — |
| **USER** + `VIEWER` | ✓ | — | — | — | — | — |

Neaktivní uživatel (`active = false`) nebo uživatel, který v `_users` není,
nedostane nic — vidí obrazovku „bez přístupu".

### 6.2 Klíče oprávnění

`guard_` pracuje se čtyřmi klíči, nic víc:

| Klíč | Splní |
|---|---|
| `calendar_read` | každý aktivní uživatel |
| `calendar_write` | SUPERADMIN, ADMIN, USER s `permission = EDITOR` |
| `users_manage` | SUPERADMIN, ADMIN |
| `settings_manage` | SUPERADMIN |

Vlastnictví události (`owner_email`) a právo měnit proběhlou událost se
kontrolují **uvnitř** příslušného endpointu, ne v `guard_` — jsou to pravidla
vázaná na konkrétní záznam, ne na akci.

Ze šablony se **vypouští** list `_role_permissions` a s ním konfigurovatelná
matice rolí. Pro šest uživatelů je to zbytečná abstrakce; matice patří do kódu,
kde je čitelná, verzovaná a nedá se omylem rozbít editací tabulky.

---

## 7. Události — pravidla

### 7.1 Typy

Od v0.1.33 plně spravované v Nastavení (list `_event_types`, viz kapitola
9.5) — SUPERADMIN smí přidat/upravit/smazat libovolný typ, ikona jde
vybrat jen z whitelistu `EVENT_TYPE_ICONS` (00_config.js), `color`
(ikona/text) a `bgColor` (podklad) musí být platný hex zápis — dvě na
sobě nezávislé barvy. Typ `default` nejde smazat nikdy — je to záchranná
varianta pro události, jejichž typ mezitím zmizel (viz `apiGetEvents`).

Tabulka `_event_types` se při první potřebě (appka na ni ještě nikdy
nesáhla) sama naseje tímhle výchozím obsahem (`DEFAULT_EVENT_TYPES`,
00_config.js) — původní sada, dřív napevno v kódu:

| Klíč (id) | Popisek | Ikona |
|---|---|---|
| `default` | Běžné | `chat-circle` |
| `meeting` | Schůzka | `users-three` |
| `trip` | Služební cesta | `airplane-tilt` |
| `important` | Důležité | `warning` |
| `deadline` | Deadline | `alarm` |
| `homeoffice` | Home Office | `house` |
| `party` | Oslava / Teambuilding | `confetti` |

### 7.2 Validace (vše na serveru)

1. `title` po `trim()` neprázdný, max 120 znaků
2. `description` max 2000 znaků
3. `type` musí být existující id z `_event_types` (viz 7.1)
4. `start` i `end` odpovídají `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$` **a** jsou to
   platná data (ověří se zpětným složením, aby neprošlo `2026-02-31T10:00`)
5. `end > start`
6. délka události max **31 dní** — pojistka proti záznamu, který zaplaví
   každou zobrazenou mřížku
7. **zákaz minulosti:** u nové události musí `start` být ≥ dnešní datum
   `00:00` v `Europe/Prague`. Porovnává se serverový čas, ne čas z prohlížeče.
8. **úprava proběhlé události** (`end` < teď): povolena jen SUPERADMIN/ADMIN,
   pokud je `pastEditAdminOnly = true`
9. `owner_email` se při vytvoření bere **ze session**, nikdy z payloadu

### 7.3 Vícedenní události v mřížce

Vícedenní událost se vykreslí jako **samostatný chip v každém dni**, který
pokrývá. Všechny chipy nesou stejné `data-event-id`, takže klik kdekoli otevře
tutéž událost.

- čas se vypíše jen na **prvním** dni; ostatní dny nesou jen název
- že událost pokračuje do dalšího/z předchozího dne, naznačí malé trojúhelníky
  u levého/pravého okraje chipu — místo pro ně je vyhrazené u KAŽDÉHO chipu
  (i jednodenního), ať mají všechny stejnou šířku
- barevný podklad (`.cal-chip-body`) sahá až k okraji buňky (bez odstupu,
  hranatý roh) JEN na straně, kde je vidět trojúhelník — vyhrazený prostor
  pro trojúhelník (`.cal-chip-edge`) se tam obarví stejně (`.is-active`),
  takže pruh je viditelný i pod ikonou šipky; na straně bez pokračování
  zůstává ten prostor bez pozadí (průhledný, prosvítá skutečné pozadí
  buňky) a tělo chipu je užší, zaoblené, s odstupem od okraje buňky
- editace i smazání z kteréhokoli dne mění **celou** událost
- potvrzovací dialog u mazání proto vždy vypíše celý rozsah („Smazat celou
  událost 3. 9. – 5. 9.?"), aby si nikdo nespletl den s akcí

---

## 8. API

Všechny endpointy vrací jednotnou obálku `{ ok: true, data }` nebo
`{ ok: false, error }` a jsou obalené `guard_`. Klient je rozbaluje v `Ui.call()`.

| Endpoint | Guard | Vstup | Výstup |
|---|---|---|---|
| `apiGetBootstrap()` | `calendar_read` | — | uživatel, jeho práva, nastavení, typy událostí, oznámení (viz 9.4) — ČISTÉ ČTENÍ, `last_visit_at` neposouvá |
| `apiMarkNotificationsSeen()` | `calendar_read` | — | — (posune `last_visit_at` uživatele na teď, viz 9.4) |
| `apiGetEvents(payload)` | `calendar_read` | `{ startDate, endDate }`, obě `YYYY-MM-DD` | pole událostí protínajících rozsah |
| `apiSaveEvent(payload)` | `calendar_write` | s `id` = úprava, bez = nová | uložená událost |
| `apiDeleteEvent(id)` | `calendar_write` | id | — |
| `apiGetUsers()` | `users_manage` | — | seznam uživatelů, řazený podle data vytvoření (od nejstaršího) |
| `apiSaveUser(payload)` | `users_manage` | s `id` = úprava (e-mail neměnný), bez = nový uživatel | uložený uživatel |
| `apiSetUserActive(payload)` | `users_manage` | `{ id, active }` | uložený uživatel |
| `apiGetDepartments()` | `users_manage` | — | seznam oddělení, řazený podle názvu — čtení smí i ADMIN (výběr ve formuláři uživatele), správa (níže) jen SUPERADMIN |
| `apiSaveDepartment(payload)` | `settings_manage` | s `id` = úprava, bez = nové | uložené oddělení |
| `apiDeleteDepartment(id)` | `settings_manage` | id | — |
| `apiGetPositions()` | `users_manage` | — | seznam pracovních pozic, řazený podle názvu — čtení smí i ADMIN (výběr ve formuláři uživatele), správa (níže) jen SUPERADMIN |
| `apiSavePosition(payload)` | `settings_manage` | s `id` = úprava, bez = nová | uložená pozice |
| `apiDeletePosition(id)` | `settings_manage` | id | — |
| `apiGetEventTypes()` | `settings_manage` | — | `{ items, availableIcons }` — typy událostí (`color` = ikona/text, `bgColor` = podklad) + whitelist ikon pro formulář |
| `apiSaveEventType(payload)` | `settings_manage` | s `id` = úprava, bez = nový; `{ label, icon, color, bgColor }` | uložený typ |
| `apiDeleteEventType(id)` | `settings_manage` | id | — (typ „default" nejde smazat) |
| `apiGetSettings()` | `settings_manage` | — | mapa nastavení |
| `apiSaveSettings(payload)` | `settings_manage` | whitelist klíčů | uložená nastavení |
| `apiGetAuditLog(limit)` | `settings_manage` | limit | posledních N záznamů |
| `apiGetImportSettings()` | `settings_manage` | — | naposledy odsouhlasená složka/výraz (viz 9.6) |
| `apiSearchImportFiles(payload)` | `settings_manage` | `{ folderInput, searchTerm }` | nalezené Sheets soubory, od nejnovější úpravy |
| `apiSyncImportFile(payload)` | `settings_manage` | `{ fileId, folderInput, searchTerm }` | souhrn synchronizace (počty přidáno/změněno/smazáno); zapíše i řádek do `_import_log` a pošle oznámení zvonečkem |
| `apiGetImportLog()` | `settings_manage` | — | posledních 60 záznamů historie synchronizací, od nejnovějšího (Log importu) |
| `apiValidateImportFile(payload)` | `settings_manage` | `{ fileId }` | `{ ok, sheets }` — existence a sloupce listů Organizace_Detail/Zavrene_Openings, BEZ importu dat |
| `apiGetImportTriggerStatus()` | `settings_manage` | — | `{ enabled, hour }` — `enabled` čtené živě ze `ScriptApp`, `hour` z `_settings` |
| `apiSetImportTrigger(payload)` | `settings_manage` | `{ enabled, hour }` | zapne/vypne noční trigger a nastaví hodinu, `{ enabled, hour }` |
| `apiGetStores()` | `calendar_read` | — | seznam filiálek, řazený podle Čísla (numericky) — čtení smí každý přihlášený |
| `apiGetLogisticCenters()` | `calendar_read` | — | seznam LC, řazený podle Čísla (bez čísla vždy na konec) — čtení smí každý přihlášený |
| `apiSaveLogisticCenter(payload)` | `settings_manage` | `{ id, cislo, zkratka }` | uložené LC — edituje jen tato dvě pole, název je needitovatelný |
| `apiSetLogisticCenterActive(payload)` | `settings_manage` | `{ id, active }` | uložené LC — deaktivace přežije i další synchronizaci, viz 9.6 |
| `apiSetStoreActive(payload)` | `settings_manage` | `{ id, active }` | uložená filiálka — jediné ručně řízené pole u filiálky, přežije i další synchronizaci |
| `apiGetHolidays(payload)` | `calendar_read` | `{ year }` (nepovinné, výchozí aktuální rok) | `{ year, holidays }` — pole `{ id, date, name }` z `_holidays`; pro dosud nenavštívený rok appka nejdřív sama naseje výchozí sadu (viz 9.7); čtení smí každý přihlášený, ne jen SUPERADMIN |
| `apiSaveHoliday(payload)` | `settings_manage` | `{ id?, date, name }` | uložený svátek — s `id` úprava, bez založení nového |
| `apiDeleteHoliday(payload)` | `settings_manage` | `{ id }` | — |

**Rozsah v `apiGetEvents`** se vyhodnocuje jako **průnik**, ne jako „start
uvnitř rozsahu" — jinak by vícedenní událost začínající minulý měsíc v aktuální
mřížce chyběla. Podmínka: `start <= to && end >= from`.

### 8.1 Pravidla platná pro každý endpoint

- Uživatel se čte **ze session** (`Session.getActiveUser().getEmail()`), nikdy
  z parametrů volání.
- Klient nikdy neposílá roli, oprávnění ani vlastníka — server si je určuje sám.
- `apiSaveUser`/`apiSetUserActive` nesmí dovolit povýšení sebe sama, odebrání
  role ani deaktivaci poslední aktivní role SUPERADMIN (jinak se aplikace
  nenávratně uzamkne); účet superadmina smí upravit nebo deaktivovat jen jiný
  superadmin; sám sebe nejde deaktivovat nikdo.
- Každý zápis a smazání zapíše řádek do `_audit_log`.

---

## 9. Uživatelské rozhraní

### 9.1 Obrazovky

| Obrazovka | Obsah |
|---|---|
| **Wizard** | úvodní průvodce (viz kapitola 10) |
| **Bez přístupu** | pro přihlášeného, který není v `_users` nebo je neaktivní |
| **Kalendář** | měsíční mřížka + panel detailu dne |
| **Uživatelé** | tabulka, přidání, změna role/oprávnění, deaktivace |
| **Filiálky** | čtecí přehled filiálek (import dat, viz 9.6), detail na klik na řádek |
| **LC** | čtecí přehled logistických center (import dat, viz 9.6), editace čísla/zkratky |
| **Nastavení** | záložky: Oddělení, Pracovní pozice, Typy událostí (viz 9.5), Import dat (viz 9.6), Státní svátky ČR (viz 9.7) |

### 9.2 Kalendář

Port z `PMS_Script.html` → `pmsRenderPlannerGrid()` a bloku `.pms-planner-*`
v `PMS_Style.html`, s prefixem `cal-`:

- mřížka 6 × 7, pondělí první
- sloupec s čísly kalendářních týdnů (ISO), zvýrazněný aktuální týden
- stavy buňky: dnešek, minulost, víkend, jiný měsíc, státní svátek
- státní svátky včetně pohyblivých — výpočet Velikonoc se přebírá hotový
  (skutečná implementace a editovatelnost viz kapitola 9.7)
- navigace: dnes, předchozí, další, výběr měsíce
- delegovaný listener na mřížce, aby přežil překreslení `innerHTML`
- klik na volné místo v buňce = nová událost, klik na chip = detail

**Panel detailu dne** je nová část: po kliku na den se otevře seznam všech
událostí toho dne seřazený podle času, s tlačítky pro editaci a smazání
u těch, na které má uživatel právo.

### 9.3 Stavy, na které se nesmí zapomenout

Prázdný kalendář, chyba načtení dat, uživatel bez práva zápisu (žádná mrtvá
tlačítka — akce, kterou nelze provést, se nezobrazuje), probíhající ukládání
(zablokované tlačítko proti dvojímu odeslání).

### 9.4 Oznámení

Zvoneček v hlavičce kalendáře (`.cal-nav`, úplně vpravo) — jen tam, appka
nemá jednu společnou horní lištu přes všechny sekce. Odznak s počtem se
ukáže, jen když je od poslední návštěvy něco nového; klik otevře modal
(`#notifyModal`, stejný jazyk jako ostatní modaly appky — ne malý dropdown),
který vypíše, co přesně. Každá položka má ikonu/barvu/kicker podle typu
akce (`App.NOTIFY_TYPE_META`) a je oddělená od dalších spodní linkou.

**Zdroj dat** — žádná nová tabulka. Využívá se, co appka už měla:

- `_audit_log` — každý zápis/smazání do něj už zapisuje `audit_()`
  (kdo, kdy, jaká akce, popis).
- `_users.last_visit_at` — kdy byl uživatel v appce naposled.

**Kdy se co počítá** (`apiGetBootstrap` → `_computeNotifications_`, ČISTÉ
ČTENÍ, žádný zápis):

1. Přečte se `last_visit_at` (prázdné u úplně první návštěvy se bere jako
   „teď" — nikdo nedostane nálož oznámení o celé historii appky).
2. Spočítají se řádky `_audit_log` novější než `last_visit_at`, s akcí
   z whitelistu `NOTIFY_ACTIONS` (`event.create/update/delete`,
   `comment.create/delete`, `import.sync` — správa uživatelů se do
   oznámení nepočítá) a od NĚKOHO JINÉHO, než je přihlášený (vlastní změny
   si nikdo nemusí připomínat). Omezeno na `LIMITS.NOTIFY_MAX_ITEMS`
   posledních.

**Kdy se `last_visit_at` posouvá** — teprve `apiMarkNotificationsSeen`,
kterou klient zavolá přesně v okamžiku, kdy uživatel OTEVŘE `#notifyModal`
(viz `App.openNotifyModal`). Dřív se posouval už v bootstrapu, při každém
otevření appky bez ohledu na to, jestli si oznámení vůbec všiml — kdo appku
jen otevřel a zase zavřel, o ně nenávratně přišel. Teď čekají, dokud je
uživatel doopravdy neuvidí. Odznak se po úspěšném zavolání hned schová na
klientovi (`unseenCount = 0`), bez čekání na další bootstrap.

**Text a proklik** — `detail` (uložený v `_audit_log`) je hotová česká věta
BEZ technického ID — server ho tam nikdy nedává, i kdyby se hodilo (např.
u komentáře radši jméno události než její ID). Odkaz na konkrétní záznam,
na který klik v panelu vede, nese samostatný sloupec `_audit_log.entity_id`
(u komentářů id UDÁLOSTI, ne komentáře — proklik vždy vede na událost).
Klik funguje, jen když je událost mezi už načtenými pro zobrazený měsíc
(`this.currentEvents`) — jinak (jiný měsíc, nebo už smazaná) appka jasně
řekne, že ji nenašla, místo tichého kliku do prázdna.

`import.sync` je výjimka z pravidla „proklik na událost" — nevztahuje se
k žádné, `entity_id` u něj nese id řádku `_import_log` (viz 9.6), ale klik
vede rovnou na Log importu v Nastavení, ne na detail podle entity_id.
Appka to pozná podle `action`, ne podle entity_id (`App.renderNotifyItem`/
`bindNotifications`) — a jen tomu, kdo do Nastavení vůbec má přístup
(SUPERADMIN), ostatním se položka netváří jako klikací.

**Formát data a času** — `D.M.RRRR HH:MM` (bez úvodních nul, české
zvyklosti) je jediný formát v celé appce, kdekoli se datum zobrazuje spolu
s časem (oznámení, rozsah vícedenní události…) — na klientovi
`App.formatDateTime`/`formatFullDate`, na serveru `formatDateTimeCz_`
(do textu `detail`). Časová razítka v `_audit_log`/`last_visit_at` jsou
MÍSTNÍ čas (`nowLocalIso_`), ne UTC (`nowIso_`) — jinak by se vůči tomuto
formátu zobrazovala posunutá o rozdíl Europe/Prague od UTC.

### 9.5 Nastavení

Správa (přidání/úprava/smazání) přístupná jen SUPERADMINovi
(`settings_manage`). Záložky nad sebou sdílenou kartou (`.settings-tabs` +
`.settings-panel`), v pořadí Oddělení / Pracovní pozice / Typy událostí /
Import dat (viz 9.6) — další přibudou stejným vzorem.

**Oddělení** (`_departments`) a **Pracovní pozice** (`_positions`) — dva
prosté seznamy názvů, stejný vzor (i stejný kód, jen jiná tabulka), oba
nabízené jako `<select>` ve formuláři uživatele (pole Oddělení/Pozice, viz
`apiSaveUser` a `App.fillDepartmentSelect`/`App.fillPositionSelect`). ČTENÍ
seznamu (ne správu) smí i ADMIN — jinak by neměl, čím ten `<select>`
naplnit při vytváření/úpravě uživatele (viz `apiGetDepartments`/
`apiGetPositions`, guard `users_manage`). Needituje se: hodnota uživatele,
která mezitím ze seznamu zmizela, zůstane ve formuláři vidět jako volba
navíc („mimo seznam"), needituje se tiše na prázdno. Žádná vazba na
uživatele: přejmenování/smazání položky seznamu se nepromítne zpětně do
těch, kdo ji už mají vyplněnou.

**Umístění** — stejný vzor „mimo seznam" jako výše, ale zdroj seznamu je
jiný: zkratky AKTIVNÍCH LC (`App.loadLcForSelect`, `apiGetLogisticCenters`
— LC bez zkratky se do výběru nenabízí, s ní nemá smysl) plus pevná
hodnota „DL" (centrála, není řádek v `_logistic_centers`). Stejně jako
u Oddělení/Pozice jde o obyčejný text bez cizí klíč vazby — přejmenování
zkratky LC nebo jeho smazání/deaktivace se do už vyplněných uživatelů
zpětně nepromítne.

**Typy událostí** (`_event_types`, viz 7.1) — plná správa (přidat/upravit/
smazat): popisek, ikona (výběr z mřížky dlaždic, jen z whitelistu
`EVENT_TYPE_ICONS`) a DVĚ nezávislé barvy — `color` (ikona/text) a
`bgColor` (podklad), obě `<input type="color">`, na serveru ověřené jako
platný hex. Uložení/smazání se hned promítne i do formuláře nové události
a kalendáře v téže session (`App.refreshEventTypes`), bez nutnosti appku
znovu načítat — mapa typů se jen přepočítá z právě načteného seznamu pro
správu, žádné další volání serveru.

### 9.6 Import dat filiálek

Zdrojem je Sheets soubor, který spravuje CIZÍ systém mimo appku a sám ho
každý den mezi 4-5h ráno přepisuje (appka do něj nikdy nezapisuje). Appka
si z něj bere kopii do vlastních tabulek (`_stores`, `_logistic_centers`,
`_store_closures`, viz kapitola 5.1) — nikdy nečte zdroj přímo za běhu.

**Etapa 1 (implementováno)** — záložka „Import dat" v Nastavení:

1. Pole *Složka (URL nebo ID)* + *Hledaný výraz* → `apiSearchImportFiles`
   prohledá zadanou složku na Disku (`DriveApp`), vrátí Sheets soubory,
   jejichž název obsahuje výraz, seřazené od nejnovější úpravy. Appka
   hledání spustí SAMA hned při vstupu do záložky, pokud jsou obě pole
   už vyplněná (`App.loadImportSettings`) — nečeká na ruční klik na Hledat.
2. Appka nabídne nalezené soubory jako přepínatelný seznam, nejnovější
   předvybraný — uživatel může zvolit jiný. Pro AKTUÁLNĚ vybraný soubor
   rovnou (bez čekání na Synchronizovat) zavolá `apiValidateImportFile`,
   která jen podle hlaviček (bez importu dat) ověří, že soubor obsahuje
   oba očekávané listy a všechny jejich sloupce — výsledek (✓/✗ po
   jednom řádku na list, u ✗ i jmenovitě které sloupce chybí) appka
   zobrazí přímo pod seznamem a tlačítko Synchronizovat POVOLÍ, jen když
   ověření vyšlo v pořádku (žádná synchronizace souboru, o kterém appka
   předem ví, že v něm něco chybí).
3. Po potvrzení `apiSyncImportFile` otevře vybraný soubor a přečte listy
   `Organizace_Detail` (→ `_stores`) a `Zavrene_Openings` (→ `_store_closures`).
   Sloupce se hledají podle PŘESNÉHO textu hlavičky v řádku 1
   (`IMPORT_STORE_COLUMNS`/`IMPORT_CLOSURE_COLUMNS` v `60_import.js`), ne
   podle pozice — cizí systém je časem může přeuspořádat. Chybějící
   očekávaná hlavička = jasná chyba hned při importu.
4. `_stores` a `_store_closures` se KOMPLETNĚ nahradí novým obsahem
   (`dbReplaceAll_`, viz 5.1) — filiálka, která v novém importu chybí, se
   z appky smaže. `_logistic_centers` se odvodí z distinct hodnot sloupce
   LC u filiálek: existující řádek (párovaný podle `nazev`) si ponechá
   ručně zadané `cislo`/`zkratka`, nové LC se založí prázdné, LC které
   v novém importu už u žádné filiálky nefiguruje se stejně jako filiálka
   smaže (vědomé rozhodnutí — viz konverzace, ne přehlédnutí).
5. Použitá složka/výraz se uloží do `_settings` (`importFolderId`/
   `importSearchTerm`) až PO úspěšném syncu, ne při pouhém hledání — noční
   trigger (etapa 4) tak vždy naváže na ověřenou konfiguraci.
6. Výsledek (počty přidáno/změněno/smazáno u filiálek a LC, počet platných
   uzavírek) appka zobrazí přímo ve formuláři — zatím se NIKAM neukládá,
   žádná trvalá historie ani oznámení.

**Etapa 2 (implementováno)** — sekce **Filiálky** a **LC** v menu, obě
přístupné každému přihlášenému (`calendar_read` — appka slouží i jako
firemní adresář):

- **Filiálky** — čtecí přehled (Číslo, Název, LC, Telefon prodejny, VT,
  RM, Stav, Akce — bez sloupce Město, to je prakticky obsažené v Název),
  výchozí řazení podle Čísla (numericky). Filtr nad tabulkou hledá
  v čísle/názvu/městě/LC (jen na klientovi, nad už načteným seznamem —
  appka počítá s řádově stovkami filiálek, ne tisíci). Klik na řádek
  otevře detail (adresa, kontakty VT/RM/zástupce s telefony, otevírací
  doba po dnech, odznak podle uzavírky) — data appka needituje, jediné
  ručně řízené pole je **aktivní/neaktivní** (`apiSetStoreActive`, sloupec
  Akce, stejný vzor jako u LC — přežije další synchronizaci, viz
  `_importSyncStores_`, nechrání ale před smazáním).
  **Stav** — `_store_closures` obsahuje i uzavírky s budoucím Od nebo už
  proběhlým Do, appka proto na serveru vyhodnocuje každou vůči DNEŠKU
  (`_evaluateClosure_` v 60_import.js): `current` (dnešek v rozsahu Od–Do)
  = červeně „Zavřeno" s rozsahem dat, `upcoming` (Od v budoucnu) = černě
  „Zavře se za N dní" s rozsahem, jinak (Do už proběhlo) se bere, jako by
  uzavírka neexistovala. Bez tohohle rozlišení appka dřív ukazovala
  „Zavřeno" plošně u všech filiálek se záznamem v listu bez ohledu na
  to, jestli uzavírka vůbec nastává teď — to byla nahlášená chyba. Sloupec
  je ve dvou řádkách VŽDY (stav / rozsah dat, druhý řádek prázdný
  u „Otevřeno"), ať mají všechny řádky tabulky stejnou výšku.
- **LC** — řazení podle Čísla (LC bez čísla až na konec), sloupec Filiálek
  = kolik filiálek má aktuálně tohle LC v `lc` (jen doplňková informace).
  Editovat smí SUPERADMIN (`settings_manage`) **číslo** a **zkratku**
  (tužka → `#lcFormModal`) — **název** je needitovatelný, přichází ze
  zdroje a synchronizace by ruční změnu stejně přepsala zpět. LC lze i
  **deaktivovat** (`apiSetLogisticCenterActive`, stejný vzor jako
  aktivace/deaktivace uživatele — potvrzovací modal na deaktivaci,
  aktivace zpět rovnou) — na rozdíl od čísla/zkratky jde o sloupec, který
  appka přidala k datům ze zdroje, takže existující řádky ho mají prázdný
  (`_lcIsActive_` bere prázdnou hodnotu jako aktivní, jen výslovné
  `false` jako deaktivované). Deaktivace přežije další synchronizaci
  (`_importSyncLogisticCenters_` bere existující řádek při refreshi
  CELÝ, ne jen název) — nechrání ale LC před smazáním, když v novém
  importu už u žádné filiálky nefiguruje.

**Vzhled a interakce tabulkových přehledů (Uživatelé, Filiálky, LC — implementováno):**

- **Pevná horní lišta a pevná hlavička tabulky.** `.app` má `height: 100vh`
  (ne `min-height`) a `overflow: hidden` jako pojistka, `.main` (grid
  položka uvnitř) má `min-height: 0` — bez tohohle třetího kroku appka
  pořád rostla podle obsahu nad výšku okna a scrollovala se celá stránka
  najednou i po nastavení `height` na `.app` samotné (klasická past
  „grid/flex položka se nezmenší pod velikost obsahu bez min-height: 0",
  stejná jako už ošetřená u `.view-panel`/`.users-panel-wrap` níž v řetězu
  — jen o úroveň výš, u `.main`, na to se předtím zapomnělo). Bez toho
  by `.section-header` i `.data-table-head`/`.users-table-head` (obě
  `position: sticky`) odjížděly pryč spolu s daty místo aby zůstávaly na
  místě. Týká se všech sekcí, ne jen Filiálky/LC.
- **Hlavička sloupce = VÍCENÁSOBNÉ řazení + filtr (Excel-like).** Klik na
  hlavičku (kromě Akce, u Uživatelů i mimo prázdný sloupec s avatarem)
  otevře popover (`App.openColumnFilterPopover`) se dvěma tlačítky řazení
  (popisek podle typu sloupce — text „A → Z"/„Z → A", číslo „Nejmenší →
  největší"/…, u kategorií jako Stav/Role/Oprávnění vlastní popisky) a
  zaškrtávacím seznamem DISTINCT hodnot pro filtr. Klikací plocha
  hlavičky je natažená (`align-self: stretch`) přes CELOU výšku řádku
  hlavičky, ne jen na výšku textu — jinak by klik kousek nad/pod
  písmem nezabral. Druhý klik na stejnou hlavičku popover jen zavře.
  Filtr u Stavu (Filiálky) funguje na KATEGORII (zavřeno/zavře se
  brzy/otevřeno), ne na konkrétním textu buňky — jinak by šlo zaškrtnout
  jen jedno konkrétní datum, appka chce filtrovat všechny zavřené
  najednou bez ohledu na datum. Konfigurace sloupců
  (`App.DATA_TABLE_COLUMNS`, sekce `users`/`stores`/`lc`) je jediný zdroj
  pravdy, ze kterého se vykresluje i samotná hlavička — žádné ruční HTML.
  Funkce v konfiguraci (`filterValue`/`sortValue`/`filterLabel`) se volají
  bez `this` (šipková funkce v objektovém literálu by si `this` stejně
  nevzala z `App`) — kde je potřeba mapa popisků, je zapsaná znovu na
  místě, ne přes `this.ROLE_LABELS` apod.

  Řazení je VÍCENÁSOBNÉ — `dataTableState[table].sortOrder` je POLE
  `{ key, dir }`, ne jeden sloupec (appka umí „podle LC, a v rámci LC
  podle jména RM", viz konverzace). Klik na „Vzestupně"/„Sestupně" v
  popoveru sloupec buď PŘIDÁ na konec řetězu (v něm ještě není), nebo mu
  jen změní směr (v něm už je) — pořadí ostatních úrovní se nemění.
  Tlačítko „Nořadit podle tohoto sloupce" (jen když v řetězu je, žádné
  mrtvé tlačítko) ho odebere; `applyDataTableView` pak řadí postupně
  podle každé úrovně, další úroveň rozhodne, jen když jsou si dva řádky
  v předchozí rovny. V hlavičce každý sloupec z řetězu nese malou modrou
  pilulku s číslem ÚROVNĚ (`index + 1` v poli — žádné samostatné
  počítadlo, takže se při přidání/odebrání úrovně čísla sama přepočítají,
  nikdy jen nerostou) A SMĚREM řazení (malá šipka nahoru/dolů vedle
  čísla) — jen číslo samo by neřeklo, jestli je sloupec seřazený
  vzestupně, nebo sestupně.

  Ikony jsou VŽDY hned za názvem, zleva (`.col-header-label`, pak
  `.col-rank-slot`, pak `.col-filter-slot`) — ne u pravého okraje buňky,
  kde nebylo jasné, ke kterému názvu patří. Pro obě je vyhrazený prostor
  pořád stejně široký, i prázdný (stejný princip jako trojúhelníky
  pokračování u vícedenní události v kalendáři): číslo úrovně řazení se
  ukáže, jen když je sloupec v řetězu; ikona filtru je vidět vždycky jako
  JEDNA ikona (`ph-funnel-simple`), jen zmodrá při aktivním filtru — nikdy
  dvě ikony vedle sebe. Název se NIKDY nezkracuje (`.col-header-label` bez
  `flex`/ellipsis) — šířku sloupců (`grid-template-columns`) appka
  nastavuje tak, aby se i s oběma sloty vešly celé.
- **Detail filiálky ve čtyřech sloupcích** (Adresa / Kontakty / Otevírací
  doba / malý kalendář měsíce) — modal proto používá vlastní nejširší
  třídu `.modal-2xwide` (1100 px, viz níže — na běžné `.modal-xwide`
  960 px se čtvrtým sloupcem navíc zbylé tři zalamovaly a nebyly
  přehledné, nahlášená zpětná vazba). Každý sloupec je od v0.7.3 vlastní
  karta s modrým orámováním (`.field-group`/`.field-group-accent`, viz
  9.8) — dřív jen holý sloupec bez boxu, jen s kickerem nahoře, teď
  stejný vizuální jazyk jako formuláře. `.store-detail-columns{align-
  items: start}` — bez toho grid natahoval každou kartu na výšku
  nejdelší (Otevírací doba), a řídká Adresa (jen jeden řádek textu) tak
  vypadala zbytečně velká (nahlášená zpětná vazba). Řádek kontaktu
  (`.store-detail-row`) má od v0.7.5 popisek NAD hodnotou, ne vedle sebe
  v řádku jako dřív (`.store-detail-label` už nemá pevnou šířku) — jméno
  kontaktu + telefon dohromady bývá dost dlouhý text, vedle pevně
  širokého popisku se lámal do víc řádků a nepůsobil přehledně.
  - **Odznaky (badges)** nad sloupci — Číslo a LC dostaly vlastní
    zvýrazněnou variantu `.store-detail-badge.is-primary` (modrý podklad),
    ať jsou jasně vidět jako "identita" filiálky, ne stejně nenápadné
    jako odznaky stavu (zavřeno/deaktivovaná). Kód filiálky se od v0.7.4
    v detailu vůbec nezobrazuje (appka hodnotu `store.kod` tiše ignoruje,
    i kdyby ji import dál posílal) — nebyl k ničemu.
  - **Telefonní čísla** ve sloupci Kontakty appka formátuje do podoby
    „+420 xxx xxx xxx" (`App.formatPhoneCz`) — vstup ze zdroje importu
    nemá jednotný formát, appka z něj vytáhne jen číslice; cokoli, co
    nevychází na přesně 9 (nebo 12 s předvolbou 420) číslic, nechá beze
    změny, ať nezobrazí zjevně poškozený výsledek.
  - **Malý kalendář aktuálního měsíce** (`renderStoreMiniCalendar`,
    4. sloupec, pevná užší šířka 220px na rozdíl od ostatních tří `1fr`)
    — dny spadající do `store.closure` (pokud existuje) zvýrazní červeně,
    stejná informace jako badge nad sloupci, jen ještě jednou vizuálně.
    Dnešek dostane žlutý VNITŘNÍ rámeček (`box-shadow: inset`, ne
    `background`) — jde kombinovat i se zavřeným dnem, stejný princip
    jako `.cal-cell.is-today`/`is-holiday` v hlavní mřížce kalendáře.
    Měsíc je vždy ten dnešní (aktuální systémové datum), ne měsíc
    případně prohlížený jinde v hlavní mřížce kalendáře.

**Etapa 3 (implementováno)** — podrobný rozdíl a trvalá historie:

- Každá synchronizace teď počítá PODROBNÝ rozdíl oproti stavu před ní, ne
  jen počty: u filiálek konkrétně KTERÁ pole se změnila (`from`/`to`, popisek
  sloupce odvozený z `IMPORT_STORE_COLUMNS`), u nových/smazaných filiálek,
  LC i uzavírek jejich jména/rozsahy.
- Zapíše se řádek do `_import_log` (append-only, žádná úprava/mazání) —
  `summary` je krátká věta pro audit log/zvoneček, `detail` delší
  itemizovaný výpis (max 30 položek na kategorii, zbytek jako „… a dalších
  N", ať řádek v listu neroste bez mezí) pro rozkliknutí v Logu importu
  (`<details>` v záložce Import dat, načteno přes `apiGetImportLog`).
- `audit_('import.sync', summary, entityId)` pošle oznámení zvonečkem
  všem KROMĚ toho, kdo sync spustil (stejné pravidlo jako u ostatních
  oznámení) — `entityId` nese id řádku `_import_log`, ale proklik z
  oznámení nevede na entity_id jako u událostí, vede rovnou na záložku
  Import dat (viz 9.4, `import.sync` je zdokumentovaná výjimka).

**Etapa 4 (implementováno)** — noční automatická synchronizace:

- Časovaný trigger (výchozí 6:00–7:00 — zdroj se sám aktualizuje 4-5h,
  hodina je rezerva, ale hodinu jde v appce změnit) se zapíná/vypíná
  a jeho hodina se mění PŘÍMO v appce (Import dat → „Automatická noční
  synchronizace", `apiSetImportTrigger`) — appka běží jako "Execute as
  me" (viz appsscript.json), takže webový požadavek od SUPERADMINa má
  stejná oprávnění `ScriptApp` jako ruční spuštění z editoru, obojí
  totiž ve skutečnosti běží pod účtem vlastníka skriptu. Ruční záloha
  z editoru (`TOOLS_nastavDenniSynchronizaci`/`TOOLS_zrusDenniSynchronizaci`,
  90_tools.js) zůstává a volá STEJNOU funkci (`_importSetTrigger_`), ať
  trigger logika existuje jen jednou. `atHour(N)` neurčuje přesnou
  minutu, jen hodinové okno — o to se stará Apps Script sám. "Zapnuto"
  appka čte VŽDY živě ze `ScriptApp.getProjectTriggers()` (skutečná
  pravda, ne jen uložené nastavení, které by mohlo zůstat neaktuální,
  kdyby trigger zrušil někdo jinudy), hodinu (tu Trigger objekt zpětně
  nevrací) drží `_settings.importTriggerHour`.
- Trigger volá `_importRunScheduledSync_` (60_import.js), která běží
  MIMO web request (žádná session uživatele, tedy žádný `guard_`) a
  navazuje na naposledy odsouhlasenou konfiguraci (`_settings.
  importFolderId`/`importSearchTerm`, ukládá je `apiSyncImportFile` při
  úspěšném ručním syncu) — dokud SUPERADMIN v appce aspoň jednou ručně
  nesynchronizuje, trigger nemá co spustit a jen se o tom zaloguje.
  Soubor k synchronizaci vybírá vždycky automaticky ten nejnovější
  (žádný člověk, kdo by mohl zvolit jiný, jako u ručního tlačítka).
- Sdílená logika s ručním tlačítkem — `_importFindFiles_` (hledání
  souborů) a `_importPerformSync_` (samotný import + zápis do
  `_import_log` + oznámení zvonečkem) používá beze změny i
  `apiSearchImportFiles`/`apiSyncImportFile`, ať existuje jen jednou.
  Noční běh tak zapíše do Logu importu a pošle oznámení stejně, jako
  by to udělal SUPERADMIN ručně.
- Chyby nočního běhu (špatná složka, žádný soubor, chyba při čtení) se
  zatím jen logují (Stackdriver/Spuštění v editoru) — appka o nich
  uvnitř sebe sama nijak neinformuje, na rozdíl od úspěšné synchronizace.

### 9.7 Státní svátky ČR

Svátky jsou **plně editovatelná tabulka** `_holidays` (id/date/name +
created/updated), spravovaná stejným vzorem jako Oddělení/Pozice/Typy
událostí — appka je ale pro každý rok nejdřív sama jednou naseje výchozí
zákonnou sadou, ať uživatel nezačíná od prázdného seznamu.

- `CZECH_FIXED_HOLIDAYS` (00_config.js) — 11 svátků s pevným datem
  (1.1., 1.5., 8.5., 5.7., 6.7., 28.9., 28.10., 17.11., 24.-26.12.), použité
  jen jako VÝCHOZÍ sada pro sazení, ne jako zdroj pravdy za běhu.
- Dva pohyblivé svátky (Velký pátek, Velikonoční pondělí) se dopočítávají
  z data velikonoční neděle — `_easterSunday_` (50_api.js) je anonymní
  gregoriánský algoritmus (Meeus/Jones/Butcher), čistě celočíselná
  aritmetika. Posun o ±dny (`_addDaysToDate_`) jde přes `Date.UTC`/
  `getUTC*`, NIKDY přes lokální časovou zónu ani `Utilities.formatDate` —
  jde jen o kalendářní aritmetiku (kolikátého je "o den dřív/později"),
  ne o okamžik v čase, takže by lokální TIMEZONE appky mohla výsledek
  posunout o den (stejná třída chyby jako opakovaně zdokumentovaný
  UTC/lokální čas jinde v této specifikaci). `_czechHolidaysForYear_(year)`
  spojí pevné i pohyblivé svátky, seřadí podle data a vrátí `{date, name}`
  — použije se JEN při prvním nasetí daného roku.
- **Nasetí (`_ensureHolidaysSeededForYear_`, 50_api.js)** — `apiGetHolidays`
  ho zavolá při každém dotazu; pokud rok ještě není v
  `_settings.holidaysSeededYears` (čárkou oddělený seznam let), appka do
  `_holidays` vloží výchozí sadu a rok si poznamená. Tenhle příznak brání
  tomu, aby se výchozí sada vrátila zpátky, kdyby SUPERADMIN pro daný rok
  smazal úplně všechny záznamy — prázdný rok BEZ příznaku vypadá jako
  „ještě nikdy nenaseto" a naseje se znovu, S příznakem zůstane prázdný.
- `apiGetHolidays({year})` je guardovaný `CALENDAR_READ` — vidí je každý
  přihlášený uživatel, ne jen SUPERADMIN, i když editace (`apiSaveHoliday`/
  `apiDeleteHoliday`, `SETTINGS_MANAGE`) i samotná záložka Nastavení jsou
  přístupné jen jemu — svátky se totiž zobrazují i v mřížce kalendáře,
  kterou vidí všichni.
- **Nastavení → záložka „Státní svátky ČR"** — přepínač roku (`◀ RRRR ▶`,
  `holidaysYear` v klientovi) a tabulka se sloupci **Datum / Den (v týdnu,
  dopočítaný na klientovi z data) / Název svátku / Akce** (tužka/koš,
  stejné ikony jako u Oddělení/Pozic), plus tlačítko „Přidat svátek".
  Hlavička (`.holidays-table-head`) stojí mimo scrollující tělo, stejný
  princip jako u Uživatelé/Filiálky/LC. `loadHolidaysForYear` cachuje
  podle roku (`App.holidaysCache`), ať appka nevolá server opakovaně pro
  stejný rok; každá úprava/založení/smazání svátku celou cache zahodí
  (`invalidateHolidaysCache`) a znovu načte aktuální rok i mřížku
  kalendáře — u pár desítek řádků ročně jednodušší a bezpečnější než ruční
  přepočet cache, řeší to i případ, kdy úprava data přesune svátek do
  jiného roku (appka na něj zobrazení sama přepne).
- **Modal nového/upravovaného svátku** — stejný vizuální jazyk jako
  formulář události (9.8): Název svátku jako "hero" pole nahoře
  (`.form-hero-field`/`.form-hero-input` — sdílené se jménem události, ne
  vázané jen na "event"), pod ním karta s modrým orámováním
  (`.field-group`/`.field-group-accent`) pro Datum. Appka vedle data živě
  dopočítá a zobrazí den v týdnu (`.holiday-form-weekday`,
  `updateHolidayFormWeekday`, reaguje na `change`), ať uživatel hned vidí,
  na jaký den svátek padne, bez nutnosti formulář nejdřív uložit. Modal
  `.modal-wide` (720 px) — i tak jednoduchý formulář (dvě pole) díky tomu
  nepůsobí prázdně/amatérsky jako předchozí těsný `.modal-grow` (480 px).
  Mezera mezi hero polem a kartou (`.holiday-form-body{gap}`) je tu
  záměrně mnohem větší (44px) než v hustším formuláři události (18px) —
  u tak řídkého obsahu menší hodnoty (i vyzkoušené 32px) vizuálně splývaly
  s okolní bílou plochou a opakovaně se hlásily jako „žádná mezera".
  `.holiday-form-body .field-group-accent` má navíc `margin-top: 12px`
  jako nezávislý doplňkový odstup (jiný mechanismus než grid `gap`), ať
  mezera zůstane jistě viditelná bez ohledu na jediné číslo.
- **V mřížce kalendáře** — u dnů, které jsou svátkem, nahradí `.cal-daynum`
  (jen číslo dne) `.cal-holiday-bar`, červený pruh přes celou šířku buňky
  s číslem dne a názvem svátku (bílým textem, ořízne se třemi tečkami,
  pokud se nevejde — `title` atribut nese celý název). Celá buňka navíc
  dostane červené orámování (`.cal-cell.is-holiday`), s výjimkou dnešního
  dne, kde vyhraje žluté orámování dnešku (`.cal-cell.is-today`, pravidlo
  v CSS je záměrně AŽ ZA `.is-holiday` kvůli pořadí v kaskádě) — červený
  pruh se svátkem se ale zobrazí v obou případech, je to samostatný prvek,
  nekonkuruje o stejnou vlastnost jako orámování.
- Zobrazení řídí nastavení `holidaysEnabled` (`_settings`, výchozí
  zapnuto) — appka ho už dřív posílala klientovi přes `apiGetBootstrap`,
  teď je poprvé skutečně použité (`App.holidaysEnabled`).
- Mřížka kalendáře běžně přesahuje do sousedního měsíce a na přelomu
  roku i do sousedního roku — `renderCalendar` proto na konci zavolá
  `ensureHolidaysLoaded` se všemi roky, které aktuálně zobrazená mřížka
  potřebuje; chybějící dotáhne ze serveru a mřížku pak sama znovu
  vykreslí (druhé volání už nic nedotahuje, cache je plná — bez rizika
  nekonečné smyčky).

### 9.8 Formulář nové/upravené události

Původně holé podepsané řádky (čistě výchozí vzhled prohlížeče), pak
mezikrok s `.field-group` boxy v úzkém jednosloupcém `.modal-wide`
(zpětná vazba: „modal je moc malý, vypadá to amatérsky", „vše příliš
stejné, vzhled moc klasický") — dnešní podoba je široký dvousloupcový
modal (`.modal-xwide`, 960 px):

- **Název** stojí sám nahoře jako "hero" pole (`.form-hero-field`/
  `.form-hero-input` — sdílená komponenta, používá i modal svátku, viz
  9.7) — větší a tučnější písmo, BEZ boxu, ať vede formulář vizuálně jako
  to nejdůležitější pole, ne jen další řádek stejné váhy jako všechny
  ostatní.
- Pod ním dva sloupce (`.event-form-columns`) — **Typ události** (typ +
  přepínač Celý den) a **Termín** — a **Popis** přes celou šířku dole.
  Každá `.field-group` sekce má navíc třídu `.field-group-accent` — 3px
  modré orámování nahoře (sdílený modifikátor, i tenhle používá i modal
  svátku; sdílené `.field-group` samo o sobě, např. formulář uživatele/
  wizard, se nemění), ať každá sekce působí jako samostatná karta, ne
  jeden splývající šedý blok.
- **Termín** — datumy Od/Do vedle sebe v jednom `.event-form-row`, časy
  Čas od/Čas do vedle sebe v dalším (ne datum+čas k sobě jako v prvním
  pokusu — appka zvlášť ukazuje „kdy" a zvlášť „od kolika do kolika",
  přesně podle zpětné vazby). Celý časový řádek (`#eventFormTimeRow`) se
  schová najednou při zaškrtnutí „Celý den" (`updateEventFormTimeVisibility`,
  `visibility:hidden`, ne `display:none` — prostor zůstává rezervovaný).
- **„Celý den"** je přepínač (`.toggle-switch` — obecná komponenta, skrytý
  checkbox + `:checked ~` na sourozenní track/knob), ne obyčejné
  zaškrtávátko — text vlevo, přepínač vpravo na jednom řádku
  (`.event-form-toggle-field`), jediné pole formuláře s vodorovným
  layoutem (popisek vedle pole, ne nad ním) — binární přepínač je
  přirozenější jako řádek nastavení než jako "pole k vyplnění".
- **Typ události** — vlastní rozbalovací seznam (`.type-picker`), ne
  nativní `<select>` — ten neumí vedle popisku zobrazit i barevnou ikonu
  typu. `fillEventTypeSelect` vykreslí položky menu (ikona + název,
  stejný vizuální jazyk jako `.settings-row-icon` u Typů událostí
  v Nastavení) do DVOU sloupců (`.type-picker-menu{grid-template-columns:
  1fr 1fr}`) — i běžný počet typů (7 výchozích + pár vlastních) se tak
  vejde na výšku bez scrollování, `max-height` je jen pojistka pro krajní
  případ hodně vlastních typů. `setEventFormType(key)` přepíše ikonu/
  popisek na tlačítku a zapíše skutečnou hodnotu do skrytého
  `#eventFormType` — na to, co čte `submitEventForm`, se tím nic nemění.
  Otevírání/zavírání stejný vzor jako `.cal-month-picker` (`bindTypePicker`,
  klik mimo panel zavře).
- Na displeji do 620 px (`@media (max-width: 620px)`) se `.event-form-columns`/
  `.event-form-row`/`.type-picker-menu` rozpadnou na jeden sloupec.

**Sjednocení napříč appkou** — na žádost „aby všechna podobná modal okna
v appce měla stejný design" dostaly `.form-hero-field`/`.form-hero-input`
(hlavní pole zvýrazněné jako "hero") a `.field-group-accent` (modré
orámování karty) i ostatní jednoduché formuláře v Nastavení, ne jen
formulář události a svátku:

- **Pracovní pozice/Oddělení** — jediné pole (Název) je teď hero pole,
  bez dalšího boxu (žádný jiný obsah k seskupení).
- **LC** (Číslo/Zkratka) — obě pole v jedné kartě s modrým orámováním
  (žádné pole tu není přirozený "hero" kandidát, LC nemá needitovatelný
  název ze zdroje).
- **Typ události** — Popisek je hero pole, Barvy a Ikona zvlášť v kartách
  s modrým orámováním (dřív `.field-group` bez zvýraznění).
- **Uživatel** — existující trojice `.field-group` sekcí (Osobní údaje /
  Role a oprávnění / Organizace) dostala `.field-group-accent`, samotné
  rozvržení (dva sloupce, užší mezery — viz komentář u `.user-form-body`)
  se nemění.
- **Detail filiálky** (jen ke čtení, ne formulář) — tři sloupce (Adresa/
  Kontakty/Otevírací doba) dostaly stejné karty s modrým orámováním, viz
  9.6.

---

## 10. Wizard — detailní specifikace

### 10.1 Kdy se spustí

`doGet()` zavolá `isSetupDone_()`. Ta je `true` jen tehdy, když Script Property
`DB_SPREADSHEET_ID` existuje **a** spreadsheet toho ID jde otevřít. Pokud byl
spreadsheet smazán, property se vynuluje a wizard se spustí znovu.

### 10.2 Kroky

| Krok | Obsah | Validace |
|---|---|---|
| 1. Uvítání | e-mail vlastníka, název složky Drive, kam databáze vznikne | — |
| 2. Aplikace | název (předvyplněno „Plánovací kalendář"), podtitul | název povinný, max 60 znaků |
| 3. Správce | jméno a příjmení; e-mail ze session, jen ke čtení | obojí povinné |
| 4. Souhrn | přehled zadaného + tlačítko Dokončit | — |
| ✓ Hotovo | odkaz na databázi, tlačítko Spustit aplikaci | — |

### 10.3 Co `setupInitialize(payload)` udělá

1. ověří, že inicializace ještě neproběhla
2. ověří, že volající je **vlastník skriptu**
   (`currentEmail_() === Session.getEffectiveUser().getEmail()`)
3. zvedne `LockService` zámek a **kontrolu z bodu 1 zopakuje uvnitř zámku**
4. vytvoří spreadsheet `<název aplikace> – databáze`
5. přesune ho do složky, kde leží Apps Script projekt
6. založí listy podle `DB_SCHEMA` a každý naformátuje firemním fontem
7. smaže výchozí prázdný list, který Sheets vytvoří spolu se souborem
8. uloží `DB_SPREADSHEET_ID` a `SETUP_COMPLETED_AT` do Script Properties
9. zapíše vlastníka do `_users` s rolí **SUPERADMIN** a `active = true`
10. uloží `appName` a `appSubtitle` do `_settings`
11. zapíše řádek do `_audit_log`
12. vrátí URL databáze a URL aplikace

### 10.4 Bezpečnostní pravidla wizardu

- Wizard smí dokončit **výhradně vlastník skriptu**. Kdokoli jiný, kdo URL
  otevře před inicializací, vidí jen informaci, že aplikace není připravena.
- Role `SUPERADMIN` je v kódu **natvrdo**, nepřichází z payloadu.
- Celá inicializace běží pod zámkem a je idempotentní — dvě souběžná dokončení
  nevytvoří dvě databáze.
- Wizard nepřijímá ID existujícího spreadsheetu. Jediná cesta k databázi je ta,
  kterou vytvoří sám.
- Reset je možný pouze ručně z editoru Apps Script (`TOOLS_resetInicializace`),
  nikdy z webového rozhraní. Reset jen odpojí property; spreadsheet v Drive
  zůstane.

---

## 11. Bezpečnostní checklist

| # | Pravidlo | Kde se vynucuje |
|---|---|---|
| 1 | Přístup rozhoduje `_users`, ne sdílení v Drive | `getCurrentUser_`, Execute as me |
| 2 | Každý endpoint přes `guard_` | `50_api.js` |
| 3 | Autorizace na serveru; UI ji jen doplňuje | `30_auth.js` + endpointy |
| 4 | Identita ze session, nikdy z payloadu | `currentEmail_` |
| 5 | Vlastnictví se ověřuje proti DB, ne proti klientovi | `apiSaveEvent`, `apiDeleteEvent` |
| 6 | Validace a normalizace všech vstupů | validační vrstva v `50_api.js` |
| 7 | Whitelist hodnot (role, oprávnění, klíče nastavení, ikony typů událostí) | `00_config.js`; typ události samotný je od v0.1.33 spravovaný v `_event_types` (viz 9.5), ne pevný whitelist |
| 8 | Escapování všeho uživatelského textu před vložením do DOM | `escapeHtml` v `core.html` |
| 9 | Zápisy pod `LockService`, dávkově | `20_db.js` |
| 10 | Audit každé změny — kdo, kdy, co | `audit_` |
| 11 | Minimální OAuth scopes, Gmail až s notifikacemi | `appsscript.json` |
| 12 | Připnutá verze jediné externí závislosti | `index.html` |
| 13 | Aplikace funkční i při výpadku CDN — ikona nikdy není jediný nositel významu | `ui/` |
| 14 | Nelze odebrat posledního aktivního superadmina | `apiSaveUser` |
| 15 | Chybové hlášky uživateli nesmí prozrazovat interní ID, e-maily ani stack | `fail_` |

---

## 12. Postup vydání — po každé dokončené úpravě

Závazné pořadí kroků. Provádí se až po dokončení a schválení úpravy, vždy celé,
nikdy jen část:

1. **zvýšit číslo verze** aplikace
2. **upravit první soubor** `AAA_VERZE.html` — nová verze a datum nasazení
3. **zapsat verzi do footeru** aplikace
4. **doplnit changelog**
5. **`git pull` a `git push`** na https://github.com/Radek-78/planovaci-kalendar
6. **`clasp push`**
7. **krátké shrnutí** úpravy s číslem verze do chatu

Verzování je **semver**: `0.1.0` je startovní vývojová verze, `1.0.0` až po
předání uživatelům. Oprava zvyšuje třetí číslo, nová funkce druhé.

Verze žije na třech místech — `AAA_VERZE.html`, `CONFIG.version` (footer)
a `CHANGELOG.md` — a musí na všech souhlasit. Proto se **nikdy nepíše ručně**,
ale skriptem `tools/release.ps1`, který kroky 1–6 provede v jednom běhu.
Vzorem je ověřený skript ze `Výchozí aplikace 2.0`, upravený na
`AAA_VERZE.html` a doplněný o `git pull` před pushem.

Skript odmítne pokračovat, pokud zadaná verze už v konfiguraci je, a přeruší
release, když `clasp push` nebo `git` selže — nikdy nenechá polovinu kroků
provedenou bez upozornění.

**Repozitář:** `https://github.com/Radek-78/planovaci-kalendar`, větev `main`,
tagy ve tvaru `v0.1.0`. Repozitář je zatím prázdný (bez commitů), takže
**první vydání** použije `git push -u origin main` bez `git pull` — ten by na
prázdném repozitáři selhal. Od druhého vydání dál platí postup včetně `pull`.

---

## 13. Fáze implementace

| Fáze | Obsah | Ověření |
|---|---|---|
| **1** | Kostra, `appsscript.json`, config, util, db, auth, wizard | Wizard doběhne, vznikne DB se 4 listy ve správné složce, ve správném fontu; druhé spuštění je odmítnuto |
| **2** | Shell aplikace, routing, obrazovka bez přístupu | Superadmin vidí aplikaci; cizí účet vidí „bez přístupu" |
| **3** | Kalendář read-only — mřížka, KT, svátky, načtení událostí | Ručně vložený řádek v `events` se zobrazí ve správných buňkách včetně vícedenního rozsahu |
| **4** | CRUD událostí, validace, vlastnictví, zákaz minulosti | VIEWER dostane chybu **ze serveru**, ne jen skryté tlačítko |
| **5** | Uživatelé, Nastavení, audit log | Nově přidaný uživatel se přihlásí a vidí kalendář |
| **6** | E-mailové notifikace (volitelné, dle nastavení) | Vypnuté notifikace neposílají nic; zapnuté doručí jeden e-mail na akci |

Každá fáze se dokončuje včetně ověření. Další se nezačíná, dokud předchozí
ověřením neprojde.

---

## 14. Otevřené otázky

| # | Otázka | Stav |
|---|---|---|
| ~~F1~~ | Přesný název firemního fontu | **vyřešeno:** `Lidl Font Cond Pro` |
| ~~F2~~ | Startovní číslo verze | **vyřešeno:** `0.1.0` |
| **F3** | Má být audit log viditelný v UI, nebo stačí list v databázi? | blokuje fázi 5 |
| **F4** | Omezit přidávání uživatelů jen na doménu firmy? | blokuje fázi 5 |
| ~~F5~~ | Založení git repozitáře | **vyřešeno:** `git init -b main` + remote `origin`, spojení ověřeno |
