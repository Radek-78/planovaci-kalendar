# Changelog — Plánovací kalendář

Historie vydání. Nejnovější verze je nahoře.

Záznamy zapisuje výhradně skript `tools/release.ps1` — needituj ručně,
jinak se rozejde s verzí v `AAA_VERZE.html` a v `server/00_config.js`.

## v0.1.15 - 02.09.2026 09:17
- Select (rozbalovací seznam typu události) neměl vůbec žádný vlastní styl a zobrazoval se čistě prohlížečově — teď má stejný rámeček, výšku a zaoblení jako ostatní pole, plus vlastní šipka místo systémové
- Zaškrtávátka (Celý den) už nedědí styl textových polí, který je dělal rozbité
- Formulář nové události má pevnou výšku 420px, takže přepnutí Celý den (skrytí času) už nijak nemění velikost okna
- Nový vizuální spinner (točící se kroužek) ve sdíleném Ui.setButtonLoading — automaticky ho teď dostávají všechna tlačítka v appce, která spouští volání serveru (formulář události, odeslání i smazání komentáře, kroky průvodce)

## v0.1.14 - 02.09.2026 09:03
- Oprava: chybějící tabulka event_comments (a jakákoli budoucí nová tabulka) se teď sama doplní při prvním přístupu (dbSheet_), takže už není potřeba ručně spouštět TOOLS_zkontrolujSchema po každém rozšíření schématu
- Nový endpoint apiSaveEvent — vytváření událostí s plnou validací na serveru (povinná pole, konec až start, max 31 dní, zákaz založení do minulosti)
- Klik na prázdný den s právem zápisu otevře rovnou formulář nové události, den s existujícími událostmi ukáže seznam s tlačítkem Nová událost navrch
- Redesign panelu s informacemi o události — barevný pruh podle typu, popisky ve stylu zbytku aplikace, iniciálový avatar zadavatele
- Prázdný/chybový stav komentářů teď s ikonou místo holého textu

## v0.1.13 - 02.09.2026 08:42
- Modal detailu konkrétní události — klik na chip v mřížce nebo na položku v denním seznamu teď otevře detail té konkrétní události, ne jen seznam celého dne
- Dvousloupcový layout: info o události vlevo (čas, zadavatel, popis), komentáře vpravo
- Nový chatovací systém komentářů k události — nová tabulka event_comments, endpointy apiGetEventComments/apiAddEventComment/apiDeleteEventComment
- Přidat smí kdokoli s právem číst kalendář (i VIEWER), smazat jen vlastní komentář nebo (ADMIN/SUPERADMIN) kterýkoli
- Sdílená animace vyjetí z kliklého prvku (třída modal-grow) teď funguje pro oba modaly

## v0.1.12 - 02.09.2026 08:24
- Modal detailu dne teď vyjede přímo z kliknuté buňky dne (výpočet posunu ke středu obrazovky přes CSS proměnné --modal-dx/--modal-dy) a stejnou cestou se při zavření zase zmenší zpět
- Pevná výška modalu 350px připravená na cca 5 událostí, prázdný stav se do ní sám vycentruje
- Nový sdílený tooltip v designu aplikace při najetí na chip události v mřížce — ikona a barva typu, celý název, přesný čas/rozsah, popis a zadavatel
- Nahrazuje původní holý prohlížečový tooltip (atribut title)

## v0.1.11 - 02.09.2026 08:16
- Souhrn počtu událostí přesunut na řádek s navigací měsíců, designově zpracovaný jako odznak s ikonou
- Vlastní přepínač měsíce/roku ve stylu aplikace (ikona kalendáře otevírá panel s rokem a mřížkou 12 měsíců) místo prohlížečového inputu, který se nedal stylovat
- Nový testovací nástroj TOOLS_vlozDalsiUdalostiTentyzDen — přidá tři další události na 2. 9. 2026, dohromady čtyři v jednom dni, pro ověření chipu +N a delšího seznamu v modalu detailu dne

## v0.1.10 - 02.09.2026 08:09
- Skutečná oprava příčiny: diagnostika ukázala typeof start=object — Sheets datum tiše převedl na typ Date i přes textový formát sloupce (samotné setNumberFormat "@" zápisu nezabránilo)
- Oprava na obou koncích — při zápisu (dbRecordToRow_) se hodnoty sloupců z TEXT_COLUMNS uvozují apostrofem, což formát skutečně vynutí
- Při čtení (dbGetAll_) se u events.start/end typ Date při nálezu převede zpět na RRRR-MM-DDTHH:mm, takže funguje i pro 8 už vložených testovacích řádků bez nutnosti je mazat
- Aktualizovaná SPECIFIKACE.md a poznámky v paměti

## v0.1.9 - 02.09.2026 08:03
- Nový diagnostický nástroj TOOLS_diagnostikaUdalosti (server/90_tools.js) — vypíše syrová data z listu events přesně tak, jak je čte server, a u každého řádku ukáže typeof start/end a jestli by prošel filtrem apiGetEvents pro aktuální měsíc
- Pomáhá zjistit, proč kalendář nezobrazuje již vložené události

## v0.1.8 - 02.09.2026 07:59
- Oprava: kalendář nezobrazoval už vložené události ani po tvrdém refresh — Apps Script znovupoužil teplou instanci běhu se zastaralou modulovou cache (dbCache_), kterou vložení dat samostatným editorovým TOOLS_ během neinvaliduje
- navíc kontrola cache brala prázdné pole jako platný zásah (v JS je i prázdné pole pravdivé)
- oprava: reset dbCache_ na začátku guard_() a doGet(), kontrola cache přes hasOwnProperty místo pravdivostní hodnoty

## v0.1.7 - 02.09.2026 07:46
- Nový ruční nástroj TOOLS_vlozTestovaciUdalosti (server/90_tools.js) — vloží 8 testovacích událostí pokrývajících všechny stavy mřížky: událost v minulosti, událost přes hranici měsíce, dnešek, celodenní i časová událost, vícedenní událost (časová i celodenní), všech sedm typů
- Spouští se ručně z editoru Apps Scriptu, ne z webu

## v0.1.6 - 02.09.2026 07:42
- Dnešní den výrazněji zvýrazněný — celá karta žlutým rámečkem a jemným podbarvením, ne jen odznak u čísla
- Napojení kalendáře na skutečná data: nový endpoint apiGetEvents (průnik rozsahu, jméno zadavatele z _users)
- chipy událostí v mřížce s ikonou a barvou podle typu (Phosphor Icons, verze připnutá), vícedenní událost jako chip v každém dni se značkou pokračování
- souhrn počtu událostí tento měsíc v hlavičce
- klik na den otevírá modal se seznamem událostí toho dne (zatím jen čtení, bez úprav/mazání)
- modal systém portovaný z Výchozí aplikace 2.0 (nativní dialog)

## v0.1.5 - 02.09.2026 07:31
- Nový design mřížky kalendáře (varianta C z porovnání tří návrhů): sloupec týdnů jako tmavě modrý pruh přes celou výšku řádku, dny jako oddělené zaoblené karty s mezerou, dnešek žlutým kolečkovým odznakem, aktuální týden žlutým pruhem, podbarvení a zmodrání rámečku při najetí myší
- návrhy uloženy do navrhy/ (vyloučeno z nahrávání do Apps Scriptu)

## v0.1.4 - 01.09.2026 17:16
- Základní vzhled aplikace: postranní menu (Kalendář/Uživatelé/Nastavení) ve stylu Výchozí aplikace 2.0, karta přihlášeného uživatele v patě menu
- funkční měsíční mřížka kalendáře se správnými daty, čísly kalendářních týdnů a stavy dnů (dnešek/víkend/jiný měsíc/minulost), navigace mezi měsíci
- sekce Uživatelé a Nastavení zatím jako placeholder
- zatím bez napojení na skutečné události a bez zvýraznění svátků — svátky budou editovatelný seznam v Nastavení, ne pevný seznam v kódu

## v0.1.3 - 01.09.2026 15:11
- Automatické přesměrování po wizardu nefungovalo spolehlivě (prohlížeč odmítá i location.reload spuštěný časovačem bez kliknutí)
- Vráceno na ověřený vzor z Výchozí aplikace 2.0 — přechod do aplikace výhradně na klik uživatele

## v0.1.2 - 01.09.2026 15:07
- Oprava: přesměrování z wizardu do aplikace po dokončení selhávalo chybou „script.google.com odmítl připojení", protože běželo z časovače bez kliknutí uživatele
- Řešení: znovunačtení stejné stránky (location.reload) místo navigace na jinou adresu

## v0.1.1 - 01.09.2026 14:46
- Wizard se po dokončení automaticky přesměruje do aplikace, bez nutnosti klikat
- Úvodní obrazovka aplikace: profil s avatarem, barevným odznakem role a přehledným seznamem oprávnění místo plochých boxů
- Oprava diakritiky v záznamu changelogu pro v0.1.0

## v0.1.0 - 01.09.2026 14:34
- Fáze 1: základ aplikace v Apps Scriptu
- Úvodní průvodce zakládá databázi ve složce skriptu
- Role a oprávnění (SUPERADMIN/ADMIN/USER + EDITOR/VIEWER)
- Release skript, changelog a indikátor verze

