# Changelog — Plánovací kalendář

Historie vydání. Nejnovější verze je nahoře.

Záznamy zapisuje výhradně skript `tools/release.ps1` — needituj ručně,
jinak se rozejde s verzí v `AAA_VERZE.html` a v `server/00_config.js`.

## v0.3.1 - 03.09.2026 18:59
- Oprava scrollování a doladění tabulek — skutečná příčina scrollování celé stránky místo jen pole dat: chybělo min-height 0 na .main (grid položka), appka i po předchozí opravě .app rostla nad výšku okna
- hlavička sloupce je teď klikací přes celou výšku řádku, ne jen na výšku textu
- položky v okně filtru mají větší rozestupy
- řazení a filtrování sloupců nově funguje i v záložce Uživatelé (Jméno, E-mail, Role, Umístění, Oddělení, Pozice, Oprávnění, Stav)

## v0.3.0 - 03.09.2026 18:37
- Vzhled a interakce datových tabulek — oprava zásadní chyby layoutu: .app mělo min-height místo height 100vh, takže appka rostla nad výšku okna a scrollovala se celá stránka najednou
- horní lišta sekce i hlavička tabulky teď zůstávají napevno na místě ve všech záložkách, data pod nimi scrollují samostatně
- kliknutím na hlavičku sloupce (kromě Akce) se otevře okno s řazením (text A-Z, čísla podle hodnoty, u Stavu zavřené/otevřené nahoře) a filtrem podle hodnot ve sloupci, druhý klik okno zavře
- v záložce Filiálky zmizel sloupec Město (obsažené v názvu), sloupec Stav je nově vždy dvouřádkový (stav / rozsah dat), aktuálně zavřené červeně, jen očekávané zavření černě, filtr rozlišuje zavřeno/zavře se brzy/otevřeno nezávisle na konkrétním datu
- přibyl sloupec Akce s deaktivací filiálky (stejně jako u LC, přežije další synchronizaci)
- modal detailu filiálky je širší a rozdělený do tří sloupců (adresa, kontakty, otevírací doba)

## v0.2.3 - 03.09.2026 15:20
- Filiálky/LC — oprava chyby ve sloupci Stav: appka dřív ukazovala „Zavřeno" plošně u všech filiálek se záznamem v Zavrene_Openings bez ohledu na to, jestli uzavírka vůbec nastává teď (list obsahuje i uzavírky s budoucím i už proběhlým termínem)
- teď se každá vyhodnocuje vůči dnešku — aktuálně zavřené červeně s rozsahem dat, plánované do budoucna jako „Zavře se za N dní" s rozsahem, proběhlé se ignorují
- v tabulce Filiálky nahrazen sloupec Město sloupcem VT (před RM)
- LC lze nově deaktivovat (tlačítko v Akce, potvrzovací okno), deaktivace zůstává zachovaná i po další synchronizaci dat

## v0.2.2 - 03.09.2026 15:10
- Import dat filiálek — etapa 3: každá synchronizace teď počítá podrobný rozdíl oproti minulému stavu (u filiálek konkrétně která pole se změnila, u nových/smazaných filiálek, LC i uzavírek jejich jména), zapíše ho do nové trvalé historie (Log importu — rozklikávací seznam v záložce Import dat) a pošle oznámení zvonečkem stejně jako u událostí
- klik na oznámení o synchronizaci vede rovnou na záložku Import dat, ne na konkrétní událost, a vidí ho jen ten, kdo do Nastavení vůbec má přístup

## v0.2.1 - 03.09.2026 14:59
- Import dat filiálek — etapa 2: nové sekce Filiálky a LC v menu, vidí je každý přihlášený uživatel (appka slouží i jako firemní adresář)
- Filiálky jsou čtecí přehled řazený podle Čísla s filtrem nad tabulkou, klik na řádek otevře detail s adresou, kontakty a otevírací dobou po dnech, u zavřené pobočky odznak s termínem
- LC jsou řazené podle Čísla (bez čísla na konec), u každého vidět počet filiálek, editovat číslo a zkratku smí jen správce aplikace (název zůstává needitovatelný, přichází ze zdroje)

## v0.2.0 - 03.09.2026 14:47
- Import dat filiálek — etapa 1: nová záložka Import dat v Nastavení, kam se zadá URL/ID složky na Disku a hledaný výraz
- appka najde odpovídající Sheets soubory (nejnovější předvybraný, jde přepnout), po potvrzení přečte listy Organizace_Detail a Zavrene_Openings a nahradí jimi vlastní tabulky (nové _stores, _logistic_centers, _store_closures)
- LC se odvozují ze sloupce LC u filiálek, číslo a zkratku k nim doplňuje ručně správce aplikace
- zatím bez hlídání rozdílů oproti minulému dni, bez trvalého logu a bez oznámení zvonečkem — jen okamžitý souhrn po dokončení, další etapy (sekce Filiálky/LC v menu, log a oznámení, noční automatická synchronizace) budou navazovat

## v0.1.40 - 03.09.2026 14:25
- Uživatelé — seznam se teď řadí podle data a času vytvoření vzestupně, od nejstaršího (dřív nejnovější nahoře)
- tichá aktualizace po uložení nového uživatele ho teď proto přidává na konec seznamu, ne na začátek

## v0.1.39 - 03.09.2026 14:02
- Drobná oprava komentáře u ORG_FIELD_MAX (00_config.js) — upřesnění, že Oddělení a Pozice se od minulé verze vybírají ze seznamu v Nastavení, i když uložená hodnota je pořád jen text, bez vazby na cizí klíč

## v0.1.38 - 03.09.2026 14:01
- Nastavení — nová záložka Oddělení (na prvním místě, před Pracovní pozice), stejný vzor jako pracovní pozice: jednoduchý seznam s vytvořením/úpravou/smazáním (nová tabulka _departments), bez vazby na uživatele
- pole Oddělení ve formuláři uživatele je teď výběr z tohoto seznamu místo volného textu, čtení seznamu smí i administrátor, správu jen správce aplikace

## v0.1.37 - 03.09.2026 13:36
- Kalendář — barevný pruh chipu (vícedenní událost) je teď skutečně vidět až k okraji buňky i pod ikonou trojúhelníku pokračování, ne jen vedle ní (vyhrazený prostor pro trojúhelník se na aktivní straně obarví stejně jako zbytek chipu)
- na straně bez pokračování zůstává ten prostor bez barvy, prosvítá skrz něj skutečné pozadí buňky

## v0.1.36 - 03.09.2026 13:22
- Nový jednorázový nástroj TOOLS_dosaditBarvyTypuUdalosti v 90_tools.js — dosadí barvu ikony i barvu podkladu přímo do živé databáze u výchozích typů událostí (podle DEFAULT_EVENT_TYPES), protože sloupec bg_color přibyl do schématu později než appka poprvé naseje tabulku a u starších instalací tak mohl zůstat prázdný nebo neladit
- nástroj se spouští ručně z editoru Apps Script, je bezpečné ho spustit i opakovaně, vlastní typy vytvořené v appce nechává beze změny

## v0.1.35 - 03.09.2026 13:14
- Typy událostí — výběr ikony v editačním formuláři teď zobrazuje živý náhled ve skutečně zvolených barvách (barva ikony i barva podkladu) místo obecné modré, přebarví se hned při změně barvy nebo výběru jiné ikony
- Opravena i chybějící barva podkladu v mapě typů pro kalendář po tiché úpravě typu (dříve zůstala nedefinovaná, dokud se appka znovu nenačetla)
- Uživatelé, Pracovní pozice a Typy událostí — uložení/smazání záznamu už nezpůsobí viditelné probliknutí „Načítám…" a znovunačtení celého seznamu ze serveru, místo toho se vrácený záznam potichu rovnou promítne do už zobrazeného seznamu

## v0.1.34 - 03.09.2026 12:57
- Oznámení — opraven způsob evidence přečtení: dříve se last_visit_at posouval automaticky při každém otevření appky (kdo si zvonečku nevšiml, o oznámení nenávratně přišel), teď až explicitním otevřením modalu se zvonečkem (nový endpoint apiMarkNotificationsSeen), odznak se hned schová
- Typy událostí — barva ikony a barva podkladu jsou teď dvě nezávisle nastavitelné barvy místo jedné počítané
- Kalendář — barevný podklad chipu sahá až k okraji buňky jen na straně, kde je vidět trojúhelník pokračování, jednodenní událost bez trojúhelníků je užší s odstupem od okrajů
- Pracovní pozice se teď skutečně nabízejí jako výběr v poli Pozice ve formuláři uživatele (dříve jen volný text, seznam z Nastavení se nikam nepropisoval) — čtení seznamu smí i administrátor, správu pořád jen správce aplikace

## v0.1.33 - 03.09.2026 09:32
- Základ sekce Nastavení — dvě záložky, Pracovní pozice a Typy událostí, obě jako přehledný seznam s vytvořením/úpravou/smazáním ve stejném stylu jako appka používá jinde (modal formulář, potvrzovací okno na mazání, tužka/koš)
- Typy událostí byly dříve napevno v kódu, teď jsou plně spravované v databázi (nová tabulka _event_types) — popisek, ikona (výběr z mřížky dlaždic, jen z bezpečného seznamu ikon) a barva
- Existující události se smazaným typem se zobrazí jako výchozí Běžné (ten se smazat nedá)
- Změna typu se hned projeví i v kalendáři a formuláři nové události bez nutnosti načíst appku znovu
- Pracovní pozice jsou jednoduchý seznam názvů pro výběr ve formuláři uživatele, bez vazby na už vyplněné uživatele

## v0.1.32 - 03.09.2026 09:01
- Oznámení přepracována na plnohodnotný modal (stejný jazyk jako ostatní okna appky — hlavička s ikonou, větší a přehlednější tělo s pevnou výškou) místo malého dropdown panelu
- Každá položka má barevnou ikonu a kicker popisek podle typu akce (nová/upravená/smazaná událost, nový/smazaný komentář — zelená/modrá/červená stejně jako jinde v appce) a je od dalších viditelně oddělena spodní linkou místo pouhého podbarvení na hover

## v0.1.31 - 03.09.2026 08:42
- Opravy vzhledu Oznámení — z textu oznámení už nikdy nejde žádné technické ID (místo něj jméno události, např. u komentáře), nový sloupec _audit_log.entity_id nese jen odkaz pro prokliknutí
- Jednotný formát data a času v celé aplikaci — D.M.RRRR HH:MM (dříve bez roku a nejednotně), sdílené App.formatDateTime/formatFullDate na klientovi a formatDateTimeCz_ na serveru
- Oprava — auditní záznamy i last_visit_at se teď ukládají v místním čase (dříve UTC), takže časy v oznámeních už nejsou posunuté o pár hodin
- Klik na oznámení s odkazem na událost teď otevře její detail, chybějící/mimo aktuální měsíc appka srozumitelně oznámí

## v0.1.30 - 03.09.2026 08:17
- Nový ruční nástroj TOOLS_simulujOznameniProMe (server/90_tools.js) — protože se do appky nedá fyzicky přihlásit pod cizím uživatelem (Apps Script pustí vždy jen přihlášený účet v prohlížeči), tento nástroj nasimuluje cizí aktivitu pro toho, kdo skript spustí — všechny testovací události/komentáře/úpravy/smazání zapíše jako OSTATNÍ uživatelé a hned nato posune jeho vlastní last_visit_at 3 dny do minulosti, takže po přihlášení pod vlastním účtem uvidí vše jako nové ve zvonečku
- Sdílená logika seedování vytažena do _toolsSeedNotifyBatch_, používá ji i původní TOOLS_vlozOznamovaciTestData

## v0.1.29 - 03.09.2026 08:03
- Nový ruční nástroj TOOLS_vlozOznamovaciTestData (server/90_tools.js) — vygeneruje testovací události, komentáře, úpravu události i smazání události připsané RŮZNÝM reálným uživatelům z _users (ne jen tomu, kdo skript pustí z editoru) — pro ruční ověření systému Oznámení, který musí ukázat cizí akce, ne vlastní
- Spustí se ručně z editoru Apps Scriptu, ne z webu

## v0.1.28 - 03.09.2026 07:47
- Nový systém Oznámení — zvoneček v pravém rohu hlavičky kalendáře s odznakem počtu, panel pod ním vypíše, co je nového od poslední návštěvy (nové/upravené/smazané události, nové/smazané komentáře, ne od sebe sama)
- Žádná nová tabulka — využívá se už existující auditní log a sloupec last_visit_at u uživatele, který se teď konečně skutečně aktualizuje
- Sledování se děje automaticky při každém otevření aplikace (bootstrap), ne až kliknutím na zvoneček — uživatel nemusí nic sám aktivovat

## v0.1.27 - 03.09.2026 07:35
- Kalendář — ikony tužky a koše v chipu události jsou teď vždy viditelné, ne jen po najetí myší
- Vícedenní události se už nezobrazují jako jeden souvislý pruh přes všechny dny — každý den má zase svůj samostatný chip, pokračování do dalšího/z předchozího dne naznačují malé trojúhelníky u levého a pravého okraje chipu
- Místo pro tyto trojúhelníky je vyhrazené u každého chipu vždy (i prázdné u jednodenních událostí), aby měly všechny chipy stejnou šířku a jednotný vzhled

## v0.1.26 - 02.09.2026 18:24
- Kalendář — ikony tužky a koše v chipu události se teď vždy přitisknou k pravému okraji (margin-left auto), ne jen hned za krátký název — u širších (vícedenních) chipů s krátkým názvem dřív viselo mezi textem a okrajem prázdné místo

## v0.1.25 - 02.09.2026 18:16
- Kalendář — v mřížce teď až 4 události v jednom dni (dříve 3), zbytek přes +N jako doposud
- Přímo v chipu události (po najetí myší u pravého okraje) malé ikony tužky a koše pro rychlou editaci/smazání bez otevírání seznamu dne — viditelné jen tomu, kdo danou událost smí spravovat
- Klik na tělo chipu pořád otevírá jen čtení (detail události)
- Oprava — chyba flexboxu bránila spolehlivému ořezávání dlouhých názvů na tři tečky, teď funguje správně i s ikonami navíc

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

