# Changelog — Plánovací kalendář

Historie vydání. Nejnovější verze je nahoře.

Záznamy zapisuje výhradně skript `tools/release.ps1` — needituj ručně,
jinak se rozejde s verzí v `AAA_VERZE.html` a v `server/00_config.js`.

## v0.1.10 - 02.09.2026 08:09
- Skutecna oprava priciny: diagnostika ukazala typeof start=object - Sheets datum tise prevedl na typ Date i pres textovy format sloupce (samotne setNumberFormat @ zapisu nezabranilo)
- oprava na obou koncich - pri zapisu (dbRecordToRow_) se hodnoty sloupcu z TEXT_COLUMNS uvozuji apostrofem, coz format skutecne vynuti
- pri cteni (dbGetAll_) se u events.start/end typ Date pri nalezu prevede zpet na RRRR-MM-DDTHH:mm, takze funguje i pro 8 jiz vlozenych testovacich radku bez nutnosti je mazat
- aktualizovana SPECIFIKACE.md a poznamky v pameti

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

