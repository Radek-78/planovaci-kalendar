# Changelog — Plánovací kalendář

Historie vydání. Nejnovější verze je nahoře.

Záznamy zapisuje výhradně skript `tools/release.ps1` — needituj ručně,
jinak se rozejde s verzí v `AAA_VERZE.html` a v `server/00_config.js`.

## v0.1.7 - 02.09.2026 07:46
- Novy rucni nastroj TOOLS_vlozTestovaciUdalosti (server/90_tools.js) - vlozi 8 testovacich udalosti pokryvajicich vsechny stavy mrizky: udalost v minulosti, udalost pres hranici mesice, dnesek, celodenni i casova udalost, vicedenni udalost (casova i celodenni), vsech sedm typu
- spousti se rucne z editoru Apps Scriptu, ne z webu

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

