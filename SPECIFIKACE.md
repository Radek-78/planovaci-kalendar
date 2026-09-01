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
  90_tools.js       ruční nástroje vlastníka (reset, diagnostika)
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
                 'created_at','created_by','updated_at','last_visit_at'],
  '_settings':  ['key','value','updated_at','updated_by'],
  '_audit_log': ['timestamp','user','action','detail'],
  'events':     ['id','start','end','all_day','type','title','description',
                 'owner_email','created_at','created_by','updated_at','updated_by'],
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

**Pozor na past ze Sheets:** sloupce `start` a `end` musí být natvrdo
naformátované jako text (`setNumberFormat('@')`). Bez toho Sheets tiše převede
`2026-09-01T08:30` na typ Date a `google.script.run` takovou hodnotu vrací
nespolehlivě. Tato chyba se v PMS reálně vyskytla a řeší ji tam
`_pmsEnsurePlannerEventsSheet_`.

**Celodenní událost** se ukládá jako `start = YYYY-MM-DDT00:00` a
`end = YYYY-MM-DDT23:59`, plus `all_day = true`. Díky tomu funguje jediné
porovnání rozsahu pro všechny typy událostí a řazení je prosté textové
porovnání.

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
| `pastEditAdminOnly` | proběhlou událost smí měnit jen admin | `true` |

> **Rozhodnutí (1. 9. 2026):** svátky NEBUDOU pevný seznam v kódu. Uživatel
> chce vlastní editovatelný seznam v sekci Nastavení — přibude samostatná
> tabulka (např. `holidays`: `id, date, name, movable, offset, active`) a
> dvojice endpointů `apiGetHolidays` / `apiSaveHolidays`. Řeší se až ve
> fázi 5 (Nastavení) spolu s `holidaysEnabled` — do té doby kalendář
> zvýraznění svátků vůbec nezobrazuje (žádný hardcoded seznam jako dočasná
> náhrada, aby nevznikla data, která se pak musí rušit).

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

Přebírají se z PMS plannerru beze změny:

| Klíč | Popisek | Ikona |
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
3. `type` musí být klíč z `EVENT_TYPES`
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

- čas se vypíše jen na **prvním** dni; prostřední a poslední den nesou značku
  pokračování
- editace i smazání z kteréhokoli dne mění **celou** událost
- potvrzovací dialog u mazání proto vždy vypíše celý rozsah („Smazat celou
  událost 3. 9. – 5. 9.?"), aby si nikdo nespletl den s akcí

---

## 8. API

Všechny endpointy vrací jednotnou obálku `{ ok: true, data }` nebo
`{ ok: false, error }` a jsou obalené `guard_`. Klient je rozbaluje v `Ui.call()`.

| Endpoint | Guard | Vstup | Výstup |
|---|---|---|---|
| `apiGetBootstrap()` | `calendar_read` | — | uživatel, jeho práva, nastavení, typy událostí |
| `apiGetEvents(from, to)` | `calendar_read` | rozsah `YYYY-MM-DD` | pole událostí protínajících rozsah |
| `apiSaveEvent(payload)` | `calendar_write` | s `id` = úprava, bez = nová | uložená událost |
| `apiDeleteEvent(id)` | `calendar_write` | id | — |
| `apiGetUsers()` | `users_manage` | — | seznam uživatelů |
| `apiSaveUser(payload)` | `users_manage` | uživatel | uložený uživatel |
| `apiDeactivateUser(id)` | `users_manage` | id | — |
| `apiGetSettings()` | `settings_manage` | — | mapa nastavení |
| `apiSaveSettings(payload)` | `settings_manage` | whitelist klíčů | uložená nastavení |
| `apiGetAuditLog(limit)` | `settings_manage` | limit | posledních N záznamů |

**Rozsah v `apiGetEvents`** se vyhodnocuje jako **průnik**, ne jako „start
uvnitř rozsahu" — jinak by vícedenní událost začínající minulý měsíc v aktuální
mřížce chyběla. Podmínka: `start <= to && end >= from`.

### 8.1 Pravidla platná pro každý endpoint

- Uživatel se čte **ze session** (`Session.getActiveUser().getEmail()`), nikdy
  z parametrů volání.
- Klient nikdy neposílá roli, oprávnění ani vlastníka — server si je určuje sám.
- `apiSaveUser` nesmí dovolit povýšení sebe sama ani odebrání poslední aktivní
  role SUPERADMIN (jinak se aplikace nenávratně uzamkne).
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
| **Nastavení** | název aplikace, svátky, notifikace, audit log |

### 9.2 Kalendář

Port z `PMS_Script.html` → `pmsRenderPlannerGrid()` a bloku `.pms-planner-*`
v `PMS_Style.html`, s prefixem `cal-`:

- mřížka 6 × 7, pondělí první
- sloupec s čísly kalendářních týdnů (ISO), zvýrazněný aktuální týden
- stavy buňky: dnešek, minulost, víkend, jiný měsíc, státní svátek
- státní svátky včetně pohyblivých — výpočet Velikonoc se přebírá hotový
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
| 7 | Whitelist hodnot (role, oprávnění, typ události, klíče nastavení) | `00_config.js` |
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
