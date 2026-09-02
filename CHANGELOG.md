# Changelog — Plánovací kalendář

Historie vydání. Nejnovější verze je nahoře.

Záznamy zapisuje výhradně skript `tools/release.ps1` — needituj ručně,
jinak se rozejde s verzí v `AAA_VERZE.html` a v `server/00_config.js`.

## v0.1.24 - 02.09.2026 18:08
- Kalendář — chipy událostí mají zase kompaktní pevnou velikost (nerostou s volným místem v dráze), víc odsazení od horního i bočních okrajů buňky
- Prázdné místo v buňce zůstává dole pod posledními chipy díky samostatnému prázdnému řádku na konci každého týdne, buňky přitom pořád vyplní celou dostupnou výšku mřížky
- Klik na buňku dne teď vždy otevře modal se seznamem událostí (i prázdný den), založení nové události jde jen přes tlačítko Nová událost v tomto modalu — jedno předvídatelné chování pro celý kalendář

## v0.1.23 - 02.09.2026 17:43
- Kalendář — výška buněk dne se vrací k původnímu chování (dráhy se zase roztáhnou a zaplní celou dostupnou výšku mřížky, ne pevných 17px na dráhu)
- Modal detailu dne — u vlastních událostí (a u administrátora/správce i u cizích) se teď zobrazují ikony tužky a koše — editace otevře předvyplněný formulář, smazání jde přes potvrzovací okno a smaže i navázané komentáře
- Nové endpointy — apiSaveEvent zvládne i úpravu existující události (dříve jen založení), nový apiDeleteEvent
- Bezpečnostní pravidla — cizí událost smí upravit/smazat jen administrátor/správce, již proběhlou událost jen podle nastavení pastEditAdminOnly, novou událost do minulosti nejde založit nikdy

## v0.1.22 - 02.09.2026 14:26
- Kalendář — návrat na max 3 události v jedné dráze na den, zbytek nahrazuje skutečný odznak +N přímo v mřížce (ne jen roh buňky) — klik na něj otevře detail dne se vším
- Modal okno uživatele dále zvětšeno — užší mezery a odsazení jen v tomto formuláři (bez zásahu do wizardu), opravena chyba CSS přesahu (overflow-y bez explicitního overflow-x umožňoval i vodorovný scroll), zmenšený horní okraj modalu (víc dostupné výšky na všech oknech)
- Modal detailu dne zvětšen na 430px — přesně na 5 událostí po 3 řádcích, popis události se teď ořízne na jeden řádek (místo lámání na víc řádků)

## v0.1.21 - 02.09.2026 13:48
- Modal okno uživatele zvětšeno a bez zbytečného scrollování — široký formát rozšířen na 720px, pevná výška formuláře nahrazena přirozenou (jen skutečný obsah, žádné prázdné místo navíc)
- Kalendář — vícedenní události se teď vizuálně spojí v jeden souvislý pruh přes všechny dny v rámci týdne (místo samostatného chipu v každém dni), zaoblení jen na skutečném začátku a konci
- Každý den má nově místo až pro 5 souběžných událostí (dříve 3 + součet navíc), přetečení nad rámec je jen vzácný okrajový případ s malým odznakem v rohu buňky
- Zúžená hlavička se zkratkami dnů a zmenšené okraje kolem celé mřížky kalendáře pro víc místa na obsah

## v0.1.20 - 02.09.2026 13:32
- Sloupec Akce u každého uživatele — tužka (editace všech údajů včetně role a organizace, e-mail už needitovatelný, je na něj navázaná historie událostí a komentářů) a koš (deaktivace, obnovitelná zpětnou ikonou u neaktivních)
- Nové endpointy — apiSaveUser teď zvládne i úpravu existujícího uživatele (dříve jen založení), apiSetUserActive na deaktivaci/aktivaci
- Bezpečnostní pojistky — účet superadmina smí upravit/deaktivovat jen jiný superadmin, sám sebe nejde deaktivovat nikdo, poslednímu aktivnímu superadminovi nejde odebrat roli ani ho deaktivovat
- Nové obecné potvrzovací okno v designu appky (nahrazuje window.confirm) pro deaktivaci uživatele

## v0.1.19 - 02.09.2026 13:20
- Seznam uživatelů řazen podle data vytvoření (nejnovější nahoře)
- Sloupec Oprávnění se teď zobrazuje i u Admin/Superadmin (Zápis), ne jen u role Uživatel
- Celé pole dat teď viditelně odděluje i sloupce (ne jen řádky), řádek pod kurzorem myši jemně odstíněný

## v0.1.18 - 02.09.2026 12:51
- Sjednocení hlaviček sekcí — hlavička obsahu (Uživatelé, Kalendář) je teď přesně ve stejné úrovni jako logo a název aplikace v sidebaru (58px, spodní rámeček)
- Seznam uživatelů přepracován na sloupcovou tabulku — hlavička se sedmi popisky a každý řádek přesně pod ní (Jméno, E-mail, Role, Umístění, Oddělení, Pozice, Oprávnění, Stav), celý v ohraničeném panelu jako u kalendáře
- Nové sloupce a pole Umístění/Oddělení/Pozice (zatím volný text, později navázané na import filiálek a správu seznamu v Nastavení)
- Formulář uživatele přepracován na dvousloupcové široké okno se skupinami polí, ikonami a kickery
- Automatické doplnění uživatelského jména (e-mailu) ze jména a příjmení — bez diakritiky, odděleno tečkou, s doménou @lidl.cz, přestane se přepisovat po ruční úpravě
- Oprava: rozšíření schématu existující tabulky o nové sloupce (na rozdíl od celé chybějící tabulky) se původně samo nedoplnilo — teď dbSheet_ kontroluje i shodu hlavičky, ne jen existenci listu

## v0.1.17 - 02.09.2026 12:26
- Sekce Uživatelé — vytváření nových uživatelů a seznam. Nový endpoint apiGetUsers (seznam seřazený podle jména) a apiSaveUser (vytvoření s validací na serveru — formát a doména e-mailu @lidl.cz, duplicita, roli SUPERADMIN smí přidělit jen SUPERADMIN)
- Formulář: jméno, příjmení, e-mail, role, oprávnění (jen u role Uživatel, ostatní mají vždy plný zápis)
- Seznam: avatar, jméno a e-mail, barevný odznak role, oprávnění, neaktivní uživatel vybledlý
- Nabídka rolí ve formuláři se přizpůsobuje — ADMIN nevidí možnost vytvořit dalšího SUPERADMINA

## v0.1.16 - 02.09.2026 09:25
- Oprava: tlačítka Nová událost, Zrušit a Vytvořit postrádala základní třídu button (měla jen barevný modifikátor button-primary/button-secondary), takže jim chyběl rámeček, zaoblení, odsazení i výška — teď vypadají jako ostatní tlačítka v aplikaci
- Doplněny ikony (křížek u Zrušit, fajfka u Vytvořit)
- Oprava: po zaškrtnutí Celý den se pole s časem místo mizení z layoutu (display none) jen opticky skryje (visibility hidden) a prostor zůstává rezervovaný, takže se sousední pole a popisky už ani o pixel neposunou

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

