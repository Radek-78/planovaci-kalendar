# Changelog — Plánovací kalendář

Historie vydání. Nejnovější verze je nahoře.

Záznamy zapisuje výhradně skript `tools/release.ps1` — needituj ručně,
jinak se rozejde s verzí v `AAA_VERZE.html` a v `server/00_config.js`.

## v0.17.1 - 24.09.2026 09:14
- v0.17.1: Oprava zařazení Outletu - patří jen do jedné záložky, ne zároveň do dvou. Minulá verze udělala z Outletu nezávislou vlastnost, takže se otevřená outletová filiálka objevovala ve své záložce i v Otevřeno zároveň. Podle zpětné vazby to bylo špatně, Outlet se řídí jinými provozními pravidly a do běžného seznamu otevřených filiálek nepatří, jakmile už běží. Nově patří každá filiálka právě do jedné ze tří záložek. Dokud filiálka, ať outlet nebo ne, čeká na otevření, je v Budoucí jako kterákoli jiná. Teprve jakmile se otevře, rozhodne se: outlet přejde do záložky Outlet a ze seznamu Otevřeno zmizí, běžná filiálka zůstává v Otevřeno jako dosud. Stejnou opravu jsem musel promítnout i do počtů u logistických center, protože jinak by slovo Otevřeno na dvou různých obrazovkách znamenalo něco jiného - otevřený outlet se teď nepočítá ani tam. Součet sloupců Otevřeno a Budoucí u logistického centra s otevřeným outletem proto vyjde o něco nižší než celkový počet jeho filiálek, to je záměr, přehled zatím nemá vlastní sloupec pro Outlet.

## v0.17.0 - 24.09.2026 09:07
- v0.17.0: Nová záložka Outlet u filiálek, s automatickou detekcí podle názvu i ruční opravou. Přibyla třetí záložka Outlet vedle Otevřeno a Budoucí, s počtem v závorce stejně jako ty dvě předchozí. Filiálka se považuje za Outlet automaticky, pokud její název obsahuje slovo outlet, ale appka umí i ruční opravu v obou směrech - v detailu filiálky jde přepnout na Automaticky, Ano nebo Ne, takže jde vynutit i to, že filiálka Outlet je, i to, že navzdory názvu není. Outlet je nezávislá vlastnost, ne třetí hodnota stejné osy jako Otevřeno a Budoucí - outletová filiálka může být otevřená i budoucí zároveň, takže se dál normálně zobrazuje i v obou původních záložkách, jen s malým fialovým štítkem vedle názvu. Záložka Outlet je tak rychlý způsob, jak najít všechny pohromadě, ne jejich vyřazení odjinud. Sloupec Stav se teď řídí podle jednotlivého řádku, ne podle aktivní záložky, protože v Outletu se míchají otevřené i budoucí filiálky a každá potřebuje jiný typ informace. Ruční oprava přežije i noční synchronizaci stejně jako aktivace filiálky.

## v0.16.2 - 24.09.2026 08:25
- v0.16.2: Oprava přesahu ikony filtru u sloupců Otevřeno a Budoucí v záložce LC. Minulá verze dala oběma sloupcům osmdesát čtyři pixelů, ale hlavička v sobě nese popisek, slot řazení a slot filtru pohromadě, takže se osmiznakové Otevřeno nevešlo a ikona filtru vizuálně přetékala do sousedního sloupce. Platí tu stejné pravidlo jako všude jinde u těchto tabulek, název sloupce se nikdy nezkracuje, takže sloupec musí být sám o sobě dost široký. Oba sloupce mají nově sto šestnáct pixelů, což dává bezpečnou rezervu.

## v0.16.1 - 24.09.2026 08:14
- v0.16.1: LC badge přesunuty do hlavičky, dostaly počet filiálek, a sloupec Filiálek u LC se rozdělil na dva pojmenované sloupce. Rychlé filtry podle LC jsou nově přímo v hlavičce záložky Filiálky vedle přepínače Otevřeno a Budoucí, ne v samostatném řádku pod ní. Tvar badge je jen lehce zaoblený, ne pilulka jako přepínač vedle nich, ať jsou od sebe i vizuálně odlišené. Každý badge navíc ukazuje počet filiálek daného LC, a to vždycky za aktuálně zobrazenou kategorii - přepnutím na Budoucí se čísla ve všech badgích přepočítají. Pro číslo je vyhrazené místo na dvě číslice, ať badge neposkakuje šířkou podle toho, jestli má jednu cifru, nebo dvě. V záložce LC se sloupec Filiálek se dvěma čísly a vysvětlivkou v hlavičce, kvůli které byla hlavička dvouřádková, rozdělil na dva samostatné, pojmenované sloupce Otevřeno a Budoucí. Každý má teď i vlastní řazení a filtr, takže jde seřadit podle počtu budoucích otevření zvlášť, což jeden sloupec se součtem neuměl. Sloupec Budoucí navíc hodnotu nula vůbec nevypisuje, zobrazí se jen tehdy, když je opravdu co hlásit.

## v0.16.0 - 24.09.2026 08:04
- v0.16.0: Počty u přepínače Otevřeno a Budoucí, rychlé filtry podle LC a rozdělené počty filiálek u LC. Přepínač Otevřeno a Budoucí v hlavičce záložky Filiálky teď ukazuje v závorce počet, a to vždycky za celou kategorii bez ohledu na hledání nebo filtry, ne jen za to, co zrovna zbylo po zúžení. Pod hlavičkou přibyla řada badge se zkratkami logistických center jako rychlý filtr. Badge jsou víceklikové, jde jich zapnout klidně pět najednou, a aktivní badge má plné modré pozadí, ne jen jemné zvýraznění, ať je na první pohled jasné, které jsou zapnuté. Filtr podle LC je nezávislý na přepínači Otevřeno a Budoucí i na hledání, uplatní se navrch obou. V záložce LC ukazuje sloupec Filiálek nově dvě čísla vedle sebe místo jednoho součtu, zeleně otevřené a modře budoucí, a hlavička sloupce dostala malý druhý řádek s popiskem, které číslo je které.

## v0.15.1 - 24.09.2026 07:47
- v0.15.1: List Organizace se čte podle hlavičky, ne podle pozice sloupce, a oprava zbytečně zablokované synchronizace. Sloupce Číslo a Datum Otevření na listu Organizace appka nově hledá podle textu hlavičky, stejně jako u ostatních dvou listů - v minulé verzi to bylo čtení podle pozice sloupce B a E, protože ještě nebyl znám spolehlivý text hlavičky. U toho jsem si všiml a opravil skutečnou chybu: appka od minulé verze zamykala tlačítko Synchronizovat, i když list Organizace ve zdrojovém souboru chyběl úplně, přestože takový list je nepovinný a zbytek synchronizace bez něj proběhne normálně. Nově tlačítko zamkne jen tehdy, když list existuje, ale chybí mu očekávaný sloupec - to je jediný případ, kdy by pokus o synchronizaci opravdu spadl, a to i v části s filiálkami a logistickými centry, ne jen v datu otevření.

## v0.15.0 - 24.09.2026 07:41
- v0.15.0: List Organizace pro datum otevření filiálek, záložka Budoucí a přehlednější import. Synchronizace teď navíc čte list Organizace ze zdrojového souboru - číslo filiálky ve sloupci B, datum oficiálního otevření ve sloupci E. Na rozdíl od ostatních listů se tyto dva sloupce hledají podle pozice, ne podle textu hlavičky, protože appka nemá žádnou spolehlivou hlavičku, o kterou by se mohla opřít
- je to vědomá výjimka a je křehčí, přeuspořádání sloupců ve zdroji by appka nepoznala. List je nepovinný, chybí-li, zbytek synchronizace proběhne beze změny. Datum se ukládá k filiálce a řídí nový přepínač Otevřeno a Budoucí v hlavičce záložky Filiálky. Budoucí jsou filiálky s datem otevření novějším než dnešek, filiálka otevíraná přesně dnes už patří mezi otevřené. Struktura sloupců je stejná v obou záložkách, mění se jen sloupec Stav, který v Budoucí ukazuje datum otevření místo otevírací doby nebo uzavírky. V kroku Soubor k synchronizaci appka nově ověřuje tři listy místo dvou, u třetího jen existenci, protože sloupce jdou ověřit jen tam, kde se čtou podle hlavičky. Místo pro tři řádky stavu je pevně vyhrazené, ať karta při načítání ani po něm neposkakuje. Historie synchronizací ukazuje rovnou jen poslední tři záznamy, zbytek je schovaný pod rozbalovacím Starší synchronizace.

## v0.14.5 - 22.09.2026 08:32
- v0.14.5: Výška hlavičky zůstává stejná i při zapnutém řazení. Minule jsem opravil růst hlavičky jen u filtru, ale stejnou vadu měl i odznak řazení - jeho slot neměl určenou výšku, takže se prázdný smrskl na nulu a ve chvíli, kdy se na sloupci zapnulo řazení, hlavička povyrostla. Oba sloty i odznak řazení mají nově pevných čtrnáct pixelů, takže si slot drží výšku i když je prázdný, stejně jako si vždycky držel šířku. Výška hlavičky je tím stejná ve všech kombinacích: bez ničeho, jen s filtrem, jen s řazením i s obojím.

## v0.14.4 - 22.09.2026 08:25
- v0.14.4: Značka aktivního filtru už nezvětšuje hlavičku. Zvýraznění celé buňky z minulé verze - žlutý popisek sloupce a žlutá linka pod ním - se ruší. Zůstal jen žlutý odznak s ikonou filtru, ten stačí. Aby zapnutí filtru výšku hlavičky neměnilo vůbec, má odznak nově shodný rozměr s klidovým stavem, tedy čtrnáct krát čtrnáct pixelů v obou případech. Aktivní stav tak jen přebarví, nic nezvětšuje.

## v0.14.3 - 22.09.2026 08:20
- v0.14.3: Filtrování po týdnech, výraznější značka filtru, rezervované místo pro posuvník a čitelné štítky. Ve sloupci Zadáno je nově přepínač, jestli se má filtrovat podle data, nebo podle kalendářního týdne. Ve sloupci Zadal stejný přepínač mezi jménem a umístěním existoval už dřív, jen se hůř hledal - je to tentýž prvek v horní části okna filtru. Sloupec s aktivním filtrem nebo řazením je nově poznat ze tří míst naráz: plný žlutý odznak s tmavou ikonou, žlutý popisek sloupce a žlutá linka pod buňkou. Samotná obarvená ikona se v řadě hlaviček ztrácela. Místo pro svislý posuvník je nově rezervované vždycky, i když se zrovna nescrolluje. Dosud se po zapnutí filtru, který zkrátil seznam pod výšku okna, lišta ztratila a všechny sloupce poskočily doprava. Platí to pro tabulky filiálek, uživatelů, LC a požadavků i pro seznamy v nastavení a svátky. Štítek umístění má nově bílý podklad s obrysem místo šedé výplně. Zvýraznění řádku při najetí myší je taky šedé, takže se šedý štítek s pozadím slil a přestal být čitelný. Ze stejného důvodu je osmý odstín štítku kalendářního týdne nově indigový, ne šedý. Výpočet čísla týdne se přesunul mimo hlavní objekt aplikace, aby ho mohly použít i definice sloupců tabulky, a nemusel tak existovat ve dvou kopiích.

## v0.14.2 - 22.09.2026 08:11
- v0.14.2: Oprava souběhu, kvůli kterému historie hlásila skoky z nuly, modrá hlavička tabulky a čitelnější kroky průběhu. Historie ukazovala několik řádků průběh z Nový nula procent se stejným časem, přestože se klikalo po jednotlivých krocích. Příčinou byl souběh čtení a zápisu: server si přečetl aktuální stav mimo zámek a zámek si bral až samotný zápis. Protože každé volání do Apps Scriptu trvá přes vteřinu, dvě kliknutí po sobě se překrývala a obě si přečetla týž starý stav, než kterékoli stihlo zapsat. Čtení i zápis nově běží pod jedním zámkem a klient navíc neposílá dvě volání naráz, rozdělaná změna počká na doběhnutí předchozí. Hlavička tabulky je nově celá v modré s bílým textem a jemnými bílými předěly sloupců, ikona filtru žlutá, pokud je na sloupci filtr nebo řazení aktivní. V minulé verzi se ta žlutá ikona nedostala do vydání kvůli chybě v mé úpravě stylů, teď je tam ověřeně. V okně filtru se hodnoty vypisovaly velkými písmeny, přestože v datech velká nejsou. Na vině bylo obecné pravidlo pro popisky formulářových polí, které se vztahovalo i na seznam hodnot
- v okně filtru je nyní přebité. Ve sloupci s číslem filiálky jde nově filtrovat i podle zavření, tedy otevřeno, zavře se, zavřeno. Kroky průběhu jsou zřetelnější: proužek má bílé předěly po dvaceti procentech, takže ukazuje šest dílků místo plynulé čáry, a každý krok má vlastní trojici barev, aby byl štítek čitelný i u žlutých kroků.

## v0.14.1 - 22.09.2026 07:56
- v0.14.1: Zakládání požadavku na pozadí, klidnější barvy, modré hlavičky a zvýraznění zavřených filiálek. Okno nového požadavku se nově zavře okamžitě a ukládání pokračuje na pozadí. Požadavek se hned objeví v seznamu jako ztlumený řádek a po potvrzení serverem se přepíše skutečným záznamem. Seznam se přitom už celý nepřenačítá - dosud po uložení všechno zmizelo a načítalo se znovu, přestože server právě uložený záznam rovnou vrací. Zápisy jdou frontou, jeden po druhém, protože na serveru stejně čekají na společném zámku
- poslat jich několik naráz by nic nezrychlilo, jen by hrozilo, že se odpovědi vrátí v jiném pořadí, než se zakládalo. Když se uložení nepovede, řádek zmizí a formulář se otevře znovu i s vyplněným textem. Štítky umístění mají nově jednu společnou barvu. Vedle barevných štítků kalendářního týdne v témže řádku z toho byla přebarvená tabulka, ve které barva nic neříkala. Barevný zůstal jen týden, kde odlišení sousedních hodnot dává smysl. Hlavičky tabulek jsou ve firemní modré. Sloupec, na kterém je zapnutý filtr nebo řazení, značí žlutá ikona na modrém podkladu - samotná žlutá by na světlé hlavičce nebyla vidět. V seznamu filiálek je právě zavřená filiálka poznat už z čísla a názvu: obojí je červeně a u čísla je ikona zámku. Sloupec Stav to říkal i dosud, ale až na druhém konci řádku, kde se to při procházení seznamu přehlédlo.

## v0.14.0 - 22.09.2026 07:36
- v0.14.0: Sloučený průběh požadavku do šesti pojmenovaných kroků, odsazení tabulátory, zúžená oprávnění. Stav a procento pokroku byly dosud dvě nezávislé hodnoty a musela se kolem nich udržovat čtveřice pravidel, aby si neodporovaly. Nově je to jedna hodnota - šest kroků po dvaceti procentech: Nový, Přijato, V analýze, Řeší se, K ověření, Dokončeno. Posun posuvníkem nebo tlačítky plus a minus tedy rovnou mění i název kroku, stejně jako to dřív dělal skok na sto procent. Všechna dopočítávací pravidla tím zmizela, protože jedna hodnota si odporovat nemůže. Vizuálně se nic nemění, jen pás průběhu má šest dlaždic ve dvou řádcích místo tří vedle sebe a štítek kroku má stejnou barvu jako proužek pokroku. Zdrojem pravdy je procento
- kdyby se uložený stav a procento někdy rozešly ručním zásahem v listu, rozhoduje procento. Celý projekt je nově odsazený tabulátory podle firemních pravidel pro Apps Script. Převedeno bylo šestnáct a půl tisíce řádků a ověřeno, že se kromě odsazení nezměnil jediný znak obsahu. Přibyl soubor editorconfig, aby se mezery z editoru zase nevloudily. Rozsah oprávnění k Disku byl zúžen z plného přístupu na pouze pro čtení. Aplikace z Disku jen čte, jediný zápis byl přesun databáze vedle skriptu při instalaci, což je pohodlí, ne podmínka běhu - nově smí selhat, aniž by shodil celou inicializaci.

## v0.13.2 - 22.09.2026 07:24
- v0.13.2: Štítek kalendářního týdne u data, konec verzálek v okně filtru. U data a času je nově štítek s číslem kalendářního týdne ve tvaru KW38, a to jak v přehledu požadavků, tak v historii úprav. Číslo je podle normy ISO 8601, tedy stejné číslování, jaké značí německé KW a jaké appka už ukazuje ve sloupci týdnů v mřížce kalendáře. Barva plyne z čísla týdne, takže sousední týdny se vždycky liší a stejný týden má vždycky tutéž barvu, i napříč roky. Sloupec Zadáno se kvůli štítku musel rozšířit ze sto třiceti na sto sedmdesát dva pixelů
- místo se bere z pružných sloupců, ostatní pevné šířky zůstaly. V okně řazení a filtru se nadpisy už nepíšou velkými písmeny, ale tak, jak jsou zadané. Písmo se kvůli tomu muselo o kousek zvětšit, protože deset pixelů verzálkami je ještě čitelných, ale deset pixelů normálním textem už ne.

## v0.13.1 - 17.09.2026 15:27
- v0.13.1: Historie jen jako tlačítko, čas na sekundy a barevné štítky umístění. Rychlý náhled posledních úprav v detailu požadavku zmizel - se sloupcem typu úpravy působil v úzkém sloupci nepřehledně. Zůstalo jen tlačítko s počtem úprav, které otevře celý přehled, kde je na výpis místo. Čas se v historii zobrazuje na sekundy a řadí se od nejnovějšího po nejstarší. Auditní log kvůli tomu dostal vlastní razítko se sekundami
- sdílená funkce plní i časy událostí, kde se nad tvarem dělá porovnání rozsahu, a přidání sekund by ho tiše rozbilo. Starší záznamy sekundy nemají a doplní se u nich nuly. Okno detailu požadavku je o třetinu nižší, protože v něm po odebrání náhledu historie zbylo prázdné místo. Štítky umístění před jmény mají nově všechny stejnou šířku, takže jména za nimi začínají na stejném místě, a jsou barevně odlišené podle umístění. Barvy se přidělují podle pořadí v abecedním seznamu umístění, která se v datech vyskytují - odvození barvy z názvu jsem zkoušel, ale při pár logistických centrech se barvy běžně srážely a čtyři různá vycházela stejně.

## v0.13.0 - 17.09.2026 15:18
- v0.13.0: Okamžité komentáře, typ úpravy v historii, toast nad modalem a lepší okno filtru. Komentář u požadavku se vykreslí okamžitě, ještě než na něj server odpoví, takže psaní plyne jako v chatu místo čekání přes vteřinu. Dokud ho server nepotvrdí, je ztlumený a nejde smazat
- při chybě zmizí a text se vrátí do pole. Každý řádek historie nese typ úpravy - Stav, Procenta, Název, Popis, Komentář, Založení, Smazání. Typ se nebere z textu, ale z nového sloupce v auditním logu, protože text je věta psaná pro lidi a při změně formulace by se rozpadl. U starších záznamů se typ odvodí aspoň z druhu akce. Hlášky se zobrazovaly pod otevřeným modálním oknem a byly rozmazané jeho pozadím. Příčinou je, že se modální okno vykresluje ve zvláštní vrstvě nad vším ostatním, které se z-indexem přebít nedá. Oblast hlášek se proto do téže vrstvy nově promotuje taky, a to pokaždé znovu, takže leží nad oknem. V okně filtru jsou obě možnosti řazení vedle sebe místo pod sebou. Ve sloupci Zadal, kde je jméno i umístění, přibyl přepínač, čím se má filtrovat
- režim s nastaveným filtrem nese symbol nálevky. Symbol filtru je nově všude nálevka místo tří čárek pod sebou.

## v0.12.9 - 17.09.2026 15:08
- v0.12.9: Historie úprav rovnou vidět, s počtem a úplným přehledem. Historie už není schovaná v rozbalovátku, které nikdo nenašel - v detailu požadavku je rovnou vidět. U nadpisu je počet úprav a pod ním posledních pět záznamů. Když je jich víc, přibude tlačítko na úplný přehled. Ten se otevře jako druhý pohled téhož okna, ne jako další okno nad oknem: tělo detailu se schová, přehled zabere celou šířku a vrací se tlačítkem Zpět na požadavek. Dvě okna na sobě by se špatně zavírala Escapem a přetahovala by si fokus. Otevření jiného požadavku okno z přehledu vždycky vrátí zpět. Položky se drží v paměti prohlížeče a panel se kreslí z nich, ne novým dotazem na server - detail se překresluje při každé změně a při klikání na tlačítka pokroku by se server ptal úplně zbytečně. Čerstvá data se dotahují jen při otevření požadavku a po každém potvrzeném zápisu. Než dorazí, ukáže panel Načítám historii, aby tam chvíli nesvítila nula a hláška o prázdné historii.

## v0.12.8 - 17.09.2026 15:04
- v0.12.8: Opravený zákaz mazání u druhé potvrzené akce, okamžitá reakce tlačítek pokroku a šipka u historie úprav. Zákaz mazání nebyl u požadavku, ale v samotném potvrzovacím okně, a týkal se CELÉ aplikace. Po úspěšně potvrzené akci se okno jen zavře a stav načítám se na tlačítku nikde neruší, takže tlačítko zůstane zakázané. Protože se při dalším otevření nahrazuje svojí kopií, kopie si zakázaný stav odnesla s sebou a další potvrzení se otevřelo s natrvalo zašedlým tlačítkem a kurzorem zákazu. Projevilo se to při mazání dvou požadavků po sobě, ale stejně by dopadlo smazání dvou událostí, dvou svátků nebo deaktivace dvou uživatelů. Opraveno na jednom místě pro všechna potvrzovací okna. Tlačítka minus a plus u pokroku reagovala se zpožděním, protože každé kliknutí hned posílalo zápis na server. Ty se na serveru řadí za sebou a jejich odpovědi mohly dorazit v jiném pořadí, než se klikalo, takže pozdní odpověď na starší hodnotu přepsala tu novější a pokrok naskočil zpátky. Nově se překreslí okamžitě a na server jde až výsledek celé série kliknutí jedním voláním. Zavření okna rozdělaný zápis dopíše. Řádek Historie úprav má konečně šipku, takže je na první pohled poznat, že jde rozkliknout.

## v0.12.7 - 17.09.2026 14:57
- v0.12.7: Pokrok teď řídí stav v obou směrech a historie úprav se po změně sama obnoví. Naklikání pokroku tlačítky minus a plus na nulu nebo sto procent nechávalo stav viset tam, kde byl. Příčinou bylo, že pravidlo existovalo jen v jednom směru - stažení pod sto procent vracelo Dokončeno na V procesu, ale nic neřešilo opačnou stranu. Nově se při změně samotného pokroku stav odvodí z něj: nula procent je Nový, sto procent Dokončeno a cokoli mezi tím V procesu. Je to jedno pravidlo místo výčtu výjimek. Výslovně zadaný stav se respektuje dál, takže jde označit za dokončený i požadavek, který zůstal rozpracovaný. Úpravy požadavku se do historie zapisovaly správně, ale nebyly vidět: okno detailu se po každé změně překresluje celé, takže se panel historie pokaždé sbalil a vyprázdnil a působilo to, jako by se změna nikam nezapsala. Rozbalení teď překreslení přežije a obsah se dotáhne znovu, takže je nově zapsaná změna vidět okamžitě.

## v0.12.6 - 17.09.2026 14:52
- v0.12.6: Kliknutí na Nový srazí pokrok na nulu. Doplnění protějšku k úpravě z minulé verze - krajní kroky průběhu teď rovnou srovnají i pokrok. Dokončeno ho dotáhne na sto procent, Nový ho srazí na nulu. Čerstvě založený požadavek na osmdesáti procentech by nikomu nic neřekl, stejně jako hotový na čtyřiceti. Prostřední stav V procesu pokrok dál nechává být, tam dává smysl jakákoli hodnota. Obojí je zkratka při kliknutí, ne pravidlo dat - pokrok jde hned zase přenastavit posuvníkem nebo tlačítky minus a plus.

## v0.12.5 - 17.09.2026 14:50
- v0.12.5: Dvousloupcový detail požadavku, štítek umístění před jménem a automatický návrat z Dokončeno. Okno detailu požadavku je nově rozdělené na dva sloupce stejně jako detail události - vlevo všechno okolo požadavku, vpravo komentáře. Každý sloupec se posouvá zvlášť, takže dlouhý popis už nemá koho odsunout, a okno je kvůli tomu širší. Štítek s umístěním zadavatele je nově před jménem, v seznamu i v detailu. Když se u dokončeného požadavku stáhne pokrok pod sto procent, vrátí se stav automaticky na V procesu - Dokončeno na šedesáti procentech by byl vnitřně rozporný záznam. Pravidlo sedí na serveru, takže platí při každém zápisu a rovnou se objeví v historii jako skutečná změna stavu. Uplatní se ale jen tehdy, když se mění samotný pokrok
- když někdo stav zadá výslovně, appka ho respektuje, aby šlo označit za dokončený i požadavek, který zůstal rozpracovaný. Mimo tuhle vazbu a zkratku, kdy kliknutí na Dokončeno dotáhne pokrok na sto procent, jsou stav a pokrok dál nezávislé.

## v0.12.4 - 17.09.2026 14:44
- v0.12.4: Opravené okno filtru u požadavků, nastavené šířky sloupců a štítek umístění u zadavatele. Kliknutí na hlavičku sloupce sice okno filtrování a řazení otevřelo, ale nenabídlo žádné hodnoty. Příčinou bylo, že se zdroj dat pro toto okno vybíral řetězem podmínek podle názvu tabulky, který u neznámé tabulky propadl na poslední větev - Požadavkům tak podstrčil data logistických center, kde odpovídající sloupce vůbec nejsou. Nově se zdroj vybírá mapou, takže chybějící tabulka vrátí prázdno místo cizích dat. Stejně je přepsané i překreslování tabulky. Je to mimochodem stejná třída chyby jako chybějící hlavička v minulé verzi. Šířky sloupců přehledu jsou nastavené podle zadání. Vedle jména zadavatele se nově ukazuje malý štítek s jeho umístěním, tedy DL nebo zkratka jeho logistického centra, a to jak v seznamu, tak v detailu požadavku. V úzkém sloupci se zkracuje jméno, štítek zůstává vždy celý - ze kterého LC požadavek přišel je důležitější a jméno je stejně vidět po rozkliknutí.

## v0.12.3 - 17.09.2026 14:39
- v0.12.3: Krokovací tlačítka u pokroku, pevná velikost okna požadavku a Dokončeno dotáhne pokrok na sto procent. Posuvník pokroku má nově po stranách tlačítka minus a plus, obě po dvaceti procentech, a na krajích rozsahu se zakážou, ať nejde odeslat hodnota, kterou by server stejně odmítl. Kliknutí na krok Dokončeno rovnou dotáhne pokrok na sto procent - hotový požadavek na čtyřiceti procentech by nikomu nic neřekl. Je to jediná vazba mezi stavem a pokrokem, ostatní stavy pokrok dál nechávají být. Okno detailu požadavku mělo velikost podle toho, co v něm zrovna bylo, takže se u každého požadavku otevřelo jinak velké podle délky popisu. Nově má pevnou velikost od prvního zobrazení a dlouhý popis se scrolluje uvnitř své karty, aby neodsunul komentáře mimo dohled.

## v0.12.2 - 17.09.2026 14:33
- v0.12.2: Opravená chybějící hlavička tabulky požadavků, okamžitá odezva na změnu stavu a barevný pokrok. Nad seznamem požadavků chyběla hlavička s názvy sloupců, a tím i filtrování a řazení - appka ji vůbec nevykreslovala. Sloupce jsou nově v pořadí Zadáno, Zadal, Název, Popis, Stav, Pokrok, Akce
- přibyl tedy popis a zmizel počet komentářů. Popis je jediný sloupec bez filtru a řazení, je to volný text a nabídka filtru by byla seznam celých popisů. Kliknutí na krok průběhu se dřív projevilo až po odpovědi serveru, což při volání do Apps Scriptu trvá i přes vteřinu a působilo to, jako by tlačítko nezabralo. Appka teď zobrazí výsledek okamžitě a na server čeká na pozadí
- když se zápis nepovede, vrátí původní hodnoty a řekne proč. V detailu požadavku byly dva ukazatele pokroku vedle sebe a vypadaly jako dvě různá čísla - zůstal jeden. Kdo smí pokrok měnit, dostane posuvník, ostatní proužek. Pokrok je nově barevně odstupňovaný po dvaceti procentech od červené přes žlutou po zelenou, a to jak v seznamu, tak na posuvníku, který se přebarvuje už při tažení. Seznam komentářů má konečně rezervovanou výšku, takže okno po dotažení komentářů už nepovyroste a neposkočí.

## v0.12.1 - 17.09.2026 13:57
- v0.12.1: Nezávislý průběh a procenta u požadavků, opravený čas v Logu importu a ikony u tlačítek. Stav požadavku a procento pokroku jsou nově na sobě nezávislé - stav se přepíná tlačítky, procento posuvníkem a jedno druhé už nepřepisuje. Původní podoba procento ze stavu dopočítávala, což se při používání ukázalo jako omezující. Pokrok se posouvá po dvaceti procentech. Formulář nového požadavku měl tlačítka Zrušit a Uložit ve stylu, který v appce vůbec neexistoval, takže se vykreslila neosazená - teď mají stejný vzhled i ikony jako všechny ostatní formuláře. Tlačítka úpravy a smazání v náhledu požadavku měla stejnou chybu, byla úplně průhledná a splývala s modrou hlavičkou
- nově mají jemný podklad i obrys a červená u smazání naskočí až při najetí myší. Ikony přibyly i dalším tlačítkům v appce - Dnes v kalendáři, Zrušit filtr a Použít ve filtru sloupců, nabídka opakování a Zpět s Pokračovat ve wizardu. Čas v historii synchronizací ukazoval UTC, tedy o hodinu až dvě míň, než synchronizace opravdu proběhla. Appka teď u razítka pozná, jestli je v místním čase, nebo v UTC, a podle toho ho zobrazí správně.

## v0.12.0 - 17.09.2026 13:35
- v0.12.0: Nová sekce Požadavky a přeskládané menu. Menu je nově rozdělené do skupin oddělených linkou - Kalendář s Požadavky, Uživatelé, Filiálky s LC - a Nastavení stojí samostatně dole, je to správa appky, ne každodenní práce. Skupina, ve které uživateli nezbylo podle role ani jedno tlačítko, se celá skryje, aby po ní nezůstal osiřelý oddělovač. Požadavky jsou jednoduchý přehled toho, co zadali vedoucí pracovníci LC: kdo zadal, kdy, název a popis, k tomu komentáře stejně jako u událostí v kalendáři. Každý požadavek má stav ve třech krocích Nový, V procesu, Dokončeno a procento pokroku. Stav a procento jsou schválně provázané - u Nového je vždycky nula procent, u Dokončeného sto, ručně se procento zadává jen ve stavu V procesu, takže nejde uložit Dokončeno na čtyřiceti procentech. Zadat požadavek a komentovat smí každý přihlášený, upravit a smazat jen jeho zakladatel nebo administrátor. Stav a pokrok mění jen ten, kdo má nastavené umístění a pozici - tahle dvojice se ale nastavuje přímo v appce v Nastavení pod novou záložkou Požadavky, ne napevno v kódu. Kdyby totiž byl název pozice v kódu, přejmenování pozice v Nastavení by právo tiše rozbilo, a to postupně, vždycky až u toho uživatele, kterého by někdo příště uložil. Správce aplikace smí měnit stav vždy, jako pojistka proti zamčení. Každá úprava se zapisuje do historie, kterou si jde v detailu požadavku rozkliknout. Přehled má filtr a řazení přímo v hlavičce sloupců, stejné ovládání jako u Uživatelů a Filiálek.

## v0.11.0 - 16.09.2026 18:15
- v0.11.0: Konec každodenního falešného hlášení změny u dvou filiálek a přehlednější záložka Import dat filiálek. Dvě filiálky, které mají v názvu ulice datum (28. Října, 17. listopadu), se hlásily jako změněné každý jediný den. Skutečná příčina nebyla ve zdrojovém souboru, ale v našem vlastním listu: sloupec ulice nebyl chráněný jako text, takže si Sheets zapsaný název tiše převedla na datum, další noc ho appka přečetla jako datum, porovnala s textem ze zdroje a vyhodnotila to jako změnu - a zapsala tentýž text znovu. Ta smyčka se nikdy nemohla ustálit. Nově je proto v tabulce filiálek chráněný jako text každý sloupec kromě příznaku aktivní, stejně tak název u uzavírek - stejnou dírou trpěla i telefonní čísla a PSČ, kterým Sheets tiše brala mezery a vedoucí nuly. První synchronizace po nasazení obě filiálky ještě jednou nahlásí jako změněné, protože tím přepisuje rozbitou uloženou hodnotu, a tím je vyléčí. Od té chvíle už bude ticho. Záložka se navíc jmenuje Import dat filiálek a je poskládaná ze čtyř karet ve stejném vzhledu jako zbytek appky, první dvě nesou číslo kroku, protože na jejich pořadí záleží. V historii synchronizací jsou místo dlouhé věty barevné štítky s počty a šipka, že řádek jde rozkliknout.

## v0.10.0 - 07.09.2026 11:43
- v0.10.0: Tichý refresh na pozadí - jednou za minutu appka sama zjistí, co udělali kolegové, bez ručního obnovení stránky. Nový endpoint apiPoll vrací v jednom volání čerstvé události pro zobrazený rozsah i stav oznámení, appka jím tiše přepíše chipy v mřížce a odznak u zvonečku. Nebourá přitom celou mřížku, jen překreslí chipy přes už vykreslenou kostru dní, takže je to bezpečné i s otevřeným modalem. Na neaktivní záložce se dotazování zastaví a při návratu do popředí appka rovnou dotáhne čerstvý stav, místo aby čekala na další celou minutu.

## v0.9.9 - 07.09.2026 08:30
- v0.9.9: Hranatější odznak a rychlé odškrtnutí oznámení bez otevírání události. Odznak počtu nových akcí je nově čtvereček s malým zaoblením rohů místo kolečka, jak na chipu v mřížce, tak v seznamu dne. U každého oznámení ve zvonečku, které se vztahuje k události, navíc přibyla ikona zaškrtnutí - kliknutím na ni appka zaznamená, že jsi oznámení viděl, přesně jako by ses do dané události podíval, ale bez otevírání jejího detailu. Okno oznámení se přitom nezavírá, jde tak postupně odklikat víc položek za sebou. Ikona se zobrazí jen u skutečně nových oznámení, ne u těch už viděných v zobrazení Zobrazit všechna oznámení.

## v0.9.8 - 07.09.2026 08:22
- v0.9.8: Odznak nových akcí i přímo na chipu v mřížce kalendáře, ne jen v seznamu dne. Předchozí verze zobrazovala číslo jen po rozkliknutí dne - teď je vidět rovnou v měsíční mřížce, vedle tužky a koše na samotném chipu. Odznak navíc nově nezávisí na tom, jestli uživatel danou událost smí upravovat - je tu něco nového je užitečné vědět i pro toho, kdo má kalendář jen ke čtení, tužka a koš samotné zůstávají viditelné jen pro správce události jako dosud.

## v0.9.7 - 07.09.2026 08:16
- v0.9.7: Testovací nástroj rozšířený pro ověření odznaku počtu akcí u události. TOOLS_vytvorTestovaciOznameni teď zakládá čtyři testovací události místo dvou: krátký název se třemi komentáři pro odznak 3, záměrně dlouhý název se dvěma úpravami pro odznak 2 a zároveň test zkracování dlouhého názvu v seznamu dne, krátký název s jednou úpravou pro odznak 1, a jedna založená a hned smazaná pro test oznámení o smazání ve zvonečku.

## v0.9.6 - 07.09.2026 08:09
- v0.9.6: Odznak nových akcí přímo u události a verze appky v sidebaru. Vedle Upravit/Smazat v seznamu dne appka teď ukazuje počet nových akcí (úprava, nový nebo smazaný komentář) u té konkrétní události - založení jde jen do zvonečku, na čerstvě vzniklém řádku by odznak neměl smysl. Odškrtne se otevřením detailu, stejně jako odpovídající oznámení ve zvonečku, a taky přímým otevřením formuláře úpravy přes tužku. Název události se teď u dlouhých názvů zkracuje výpustkou, ať s novým odznakem zůstane řádek přehledný. Verze appky je nově vidět jako tichý řádek pod kartou přihlášeného uživatele v levém panelu - datum vydání ukáže najetí myší.

## v0.9.5 - 07.09.2026 08:03
- v0.9.5: Oprava kliknutí na oznámení o smazané události a nová volba Zobrazit všechna oznámení. Kliknutí na smazanou událost dřív vždy skončilo chybovou hláškou, protože appka se snažila otevřít detail události, která už neexistuje - teď appka jen zaznamená, že jsi oznámení viděl, a položka zmizí ze seznamu, okno oznámení přitom zůstane otevřené, ať jde postupně odkliknout víc smazaných událostí za sebou. Nová volba nad seznamem oznámení zobrazí i ta už viděná - už viděné položky appka vizuálně ztlumí, ať je jasné, co je nové. Přepínač se při každém dalším otevření zvonečku vrátí na výchozí zobrazení jen nových.

## v0.9.4 - 07.09.2026 07:50
- v0.9.4: Úklid ručních nástrojů a nová funkce pro testování oznámení. Smazány všechny dosavadní TOOLS_ funkce ve správcovském souboru nástrojů - byly to většinou jednorázové diagnostické a opravné nástroje, které už splnily svůj účel. Místo nich jediná nová funkce TOOLS_vytvorTestovaciOznameni: vloží sadu testovacích akcí (nová událost, komentář, úprava, smazání) jako druhý uživatel z databáze, takže po přihlášení appka ukáže tyhle akce ve zvonečku přesně tak, jako by je udělal někdo jiný. Jde tak přímo ověřit novou logiku oznámení podle jednotlivých událostí, včetně toho, že se položka odškrtne skutečným otevřením dané události, ne jen otevřením seznamu.

## v0.9.3 - 07.09.2026 07:44
- v0.9.3: Skutečná oprava listu _event_views - byla to moje chyba, ne shoda okolností. Diagnostika ukázala, že běžící kód vidí schéma jako jediný sloupec last_seen_at, ačkoliv v souboru na disku bylo schéma se čtyřmi sloupci správně. Příčina: při jedné z minulých úprav jsem omylem zapsal last_seen_at ještě jednou uvnitř objektu DB_SCHEMA místo do TEXT_COLUMNS, kam patřilo - u duplicitního klíče v objektu JavaScript vždy vyhraje ten pozdější zápis, takže se čtyřsloupcové schéma tiše přepsalo jednosloupcovým. Teď je last_seen_at na správném místě a v souboru jsem strojově ověřil, že se žádný podobný duplicitní klíč nikde jinde neopakuje.

## v0.9.2 - 07.09.2026 07:37
- v0.9.2: Diagnostický nástroj pro list _event_views. Nahlásil jsi, že po čistém testu (nový deploy, smazaná stará data, nová událost) má list _event_views jen jeden sloupec last_seen_at, místo očekávaných čtyř. Statickou kontrolou kódu (schéma, zápisová cesta v dbInsert_) jsem chybu nenašel - schéma má v repozitáři správně čtyři pole a nikdy nemělo méně. Přidal jsem nástroj TOOLS_diagnostikaEventViews, který se spouští z editoru a vypíše, co si nasazený kód doopravdy myslí o tvaru listu, a co v listu doopravdy je - teprve podle toho půjde přesně určit, jestli je problém v zápisu, nebo že se do projektu nepropsal celý kód.

## v0.9.1 - 07.09.2026 07:22
- v0.9.1: Nástroj na opravu posunutých dat u starších událostí. Minule jsem objevil, že vložení sloupce recurrence_id doprostřed schématu tabulky events, ne na konec, posunulo data u událostí založených před verzí 0.8.0 - appka u nich četla created_at místo recurrence_id, created_by místo created_at a tak dál, takže se u ve skutečnosti jednorázových událostí zobrazovalo Opakující se. Přidán jednorázový ruční nástroj TOOLS_opravPosunutaDataUdalosti ve správcovském souboru nástrojů - najde postižené řádky podle tvaru hodnoty v recurrence_id, který by tam nikdy neměl být, a přesune sloupce zpátky na správné místo. Bezpečné spustit i opakovaně. Nutné spustit ručně z editoru Apps Scriptu po nasazení.

## v0.9.0 - 07.09.2026 07:10
- v0.9.0: Přesnější oznámení - podle toho, co jsi doopravdy viděl, ne podle toho, kdy jsi appku otevřel. last_visit_at je rozdělený na dvě oddělená pole: last_login_at je skutečné poslední přihlášení, zapisuje se při každém otevření appky. notifications_seen_at zůstává jen pro oznámení bez vazby na konkrétní událost, třeba import dat filiálek. U oznámení k události - úprava, nový komentář - appka nově pamatuje, kdy jsi TU KONKRÉTNÍ událost naposledy otevřel, a hlásí jen to, co se stalo POTÉ. Otevřením detailu události se tak její oznámení odškrtne samo, bez nutnosti kliknout na zvoneček. Kliknutí na zvoneček už neumlčí oznámení k události, kterou jsi ve skutečnosti ještě neviděl.

## v0.8.10 - 05.09.2026 23:38
- v0.8.10: Oprava falešně hlášených změn u filiálek s ulicí pojmenovanou po datu. Appka hlásila u Mikulova a Orlové změnu skoro každou noc, přestože se zdroj vůbec nezměnil - ulice 28. října a 17. listopadu totiž Sheets sama automaticky rozpozná jako datum, a appka takovou buňku dosud převáděla na text způsobem, jehož výsledek závisí na jazykové lokalizaci prostředí v danou chvíli. Ta se liší mezi ruční synchronizací z appky a nočním triggerem, takže appka i beze změny zdroje hlásila rozdíl. Teď se datum formátuje vždy stejným, na lokalizaci nezávislým způsobem. Obě filiálky se při první synchronizaci po nasazení ještě jednou nahlásí jako změněné - přechod na nový formát, od další noci už zůstanou beze změny.

## v0.8.9 - 05.09.2026 23:29
- v0.8.9: Šablona události má stejný výběr typu a časovou osu jako událost. Formulář šablony v Nastavení měl dosud obyčejný výběr typu bez ikon a dva samostatné časy Od/Do - teď používá stejné komponenty jako formulář události. Obě komponenty byly napevno svázané jen s jedním formulářem, takže musely nejdřív projít zobecněním na dvě nezávislé instance, ne pouhým zkopírováním kódu - u časové osy, která si prošla čtyřmi koly oprav, by druhá kopie stejné logiky znamenala každou budoucí opravu dělat dvakrát.

## v0.8.8 - 05.09.2026 19:18
- v0.8.8: Hlavní pole formulářů podtržené - a oprava, proč nikdy nevypadalo, jak mělo. Systematická kontrola všech tříd použitých na polích našla poslední místo se stejnou chybou jako minule: zvýrazněné hlavní pole ve formulářích Pracovní pozice, Oddělení, Svátek, Typ události a Šablona události prohrávalo s globálním pravidlem pro pole, takže z něj zbylo jen tučné písmo a větší velikost ani odsazení se nikdy neprojevily. Sjednocení vzhledu z v0.7.2 tedy u polí vizuálně nikdy nedoběhlo. Místo pouhé opravy dostalo pole rovnou podtržený vzhled bez rámečku, stejný jazyk jako název události. Datum ve formuláři svátku je nově taky bez rámečku, protože karta kolem něj už jedno orámování má.

## v0.8.7 - 05.09.2026 19:09
- v0.8.7: Moduly Typ a Opakování na celou šířku a čas vedle data. Oba moduly mají teď stejnou šířku a dohromady vyplní celou šířku formuláře, šipka pro rozbalení sedí u pravého okraje modulu jako u běžného výběru. Když se modul Opakování schová (u běžné úpravy události), zabere Typ celou šířku sám a nezůstane po něm poloprázdné místo. V kartě Termín se nově u každého data vypisuje i jeho čas, takže se obě strany čtou jako úplný okamžik a text se přepisuje živě při tažení posuvníku. Při zapnutí Celý den se čas u data schová, protože se stejně neuplatní.

## v0.8.6 - 05.09.2026 18:59
- v0.8.6: Pole Název a Datum konečně bez boxu a Opakování ukazuje zadanou hodnotu. Název je nově jen podtržená čára bez rámečku a bílého pozadí, při psaní se podtržení zvýrazní modrou. Při té příležitosti se ukázalo, proč tenhle vzhled nefungoval už od v0.8.1: globální pravidlo pro formulářová pole má vyšší specificitu než samotná třída, takže pole dál přebíralo rámeček a bílé pozadí. Stejná chyba se týkala i polí s datem v kartě Termín, ta jsou teď taky bez rámečku, takže uvnitř karty nevzniká druhé orámování. Modul Opakování nově vypisuje i zadaný konec série, tedy třeba Každý týden 10x nebo Každý týden do 30.11.2026.

## v0.8.5 - 05.09.2026 13:09
- v0.8.5: Bublinky s časem u časové osy se už nepřekrývají - Od zůstala nad dráhou, Do je nově pod ní. Překrývaly se u každé události kratší než zhruba 2,5 hodiny, tedy u většiny schůzek: bublinka je široká asi 58 pixelů, ale hodina zabírá na dráze jen 26. Rozdělením nad a pod dráhu se nemůžou potkat vůbec, ať jsou úchyty jakkoli blízko, a každá zůstává přesně nad nebo pod svým úchytem. Bublinky se navíc u krajních časů 00:00 a 23:45 už nevysunou ven z karty.

## v0.8.4 - 05.09.2026 09:34
- v0.8.4: Časová osa události přepsaná bez nativních posuvníků - úchyty Od i Do jsou konečně vidět oba. Předchozí dva pokusy opravovaly následek, ne příčinu: dva překryté nativní posuvníky si každý kreslí vlastní vnitřní strukturu přes celou šířku, takže ten navrchu vždy překryl úchyt toho druhého - proto po opravě přes z-index zmizel místo úchytu Od zase úchyt Do. Oba úchyty jsou teď obyčejná tlačítka na vlastní pozici, která se překrýt nemůžou. Tažení myší i prstem, ovládání šipkami, PageUp/PageDown a Home/End appka obsluhuje sama.

## v0.8.3 - 05.09.2026 09:01
- v0.8.3: Formulář události - další doladění. Panel Typu se místo zalamování dlouhých názvů dopočítá na potřebnou šířku, ať se nic nezalomuje ani neuřízne. Typ a Opakování už nejdou otevřít najednou - otevření jednoho panelu vždy zavře ten druhý. Oprava úchytu Od u časové osy: skutečná příčina byla jinde, než jsem předpokládal - novější Chrome/Edge kreslí kolem dráhy vlastní neprůhledný obal, který úchyt Od přes celou šířku překrýval. Teď je řešeno třemi nezávislými mechanismy najednou, ať je úchyt spolehlivě vidět.

## v0.8.2 - 05.09.2026 08:49
- v0.8.2: Formulář události - doladění vzhledu po zpětné vazbě. Typ a Opakování dostaly nadpis a přestaly být osamocené pilulky - každý modul je teď vlastní malá karta se stejným modrým orámováním jako zbytek formuláře, tlačítko uvnitř je bez vlastního rámečku. Obě tlačítka mají místo rezervované na nejdelší možný název, takže při přepnutí neposkakují do stran, a dlouhé názvy typů se v panelu vypisují celé, ne uříznuté. Karta Datum a čas dostala nadpis Termín. Oprava: úchyt Od u časové osy nebyl v Chrome/Edge vidět - chybělo mu svislé vystředění na dráhu posuvníku.

## v0.8.1 - 05.09.2026 08:25
- v0.8.1: Formulář události — druhé kolo přepracování podle zadaného návrhu. Název je teď zcela bez rámečku (velký placeholder Bez názvu), Typ a Opakování jsou dvě úzké pilulky vedle sebe — obě otevírají vlastní rozbalovací panel s možnostmi. Datum Od→Do je jeden kompaktní řádek se šipkou mezi daty, Celý den vedle nich. Dva časové inputy nahrazeny dvojitým posuvníkem s bublinkami aktuálního času nad úchyty. Při zapnutí Celý den se časová osa neschová, jen zešedne a znepřístupní se, ať uživatel pořád vidí, na jaký čas byla nastavená.

## v0.8.0 - 04.09.2026 19:24
- v0.8.0: Opakující se událost, duplikování, šablony událostí — tři nové možnosti při zakládání a správě událostí. Opakování: formulář nové události nabízí Neopakovat/Denně/Týdně/Co 2 týdny/Měsíčně s koncem podle počtu opakování nebo data, appka rovnou založí celou sérii
- úprava/smazání výskytu ze série nabídne volbu Jen tuto / Tuto a všechny následující. Duplikovat: v detailu události nová ikona vedle Upravit/Smazat otevře formulář nové události předvyplněný obsahem té existující, bez trvalé vazby na ni. Šablony událostí: nová záložka v Nastavení pro uložení opakovaně používaného obsahu (název/typ/čas/délka/popis), který jde při zakládání nové události načíst jedním výběrem.

## v0.7.5 - 04.09.2026 13:35
- v0.7.5: Oprava (de)aktivace filiálky + přehlednější detail s malým kalendářem — (de)aktivace filiálky (např. 994) hlásila 'Filiálka nebyla nalezena', i když v databázi normálně byla: Sheets tiše převedl číslo filiálky na typ Number, appka ho ale hledala jako text a striktní porovnání se nikdy neshodlo (dbFindBy_ teď porovnává bezpečně jako text). V detailu filiálky se po přidání malého kalendáře zúžily zbylé tři sloupce natolik, že se text v nich lámal a nebyl přehledný — modal je teď ještě širší (nová třída .modal-2xwide) a popisek u kontaktu (jméno, telefon) stojí nad hodnotou, ne vedle ní v řádku, takže se dlouhý text neláme.

## v0.7.4 - 04.09.2026 13:24
- v0.7.4: Detail filiálky — telefony, LC, malý kalendář — telefonní čísla ve sloupci Kontakty appka teď formátuje jako +420 xxx xxx xxx. Sloupec Adresa už se nenatahuje na výšku nejdelšího sloupce (Otevírací doba) a nepůsobí zbytečně velký. Číslo filiálky a LC mají vlastní výraznější (modrý) odznak, ať je hned jasné, o kterou filiálku a pod které LC jde
- kód filiálky se v detailu vůbec nezobrazuje. Přibyl čtvrtý, malý sloupec s kalendářem aktuálního měsíce — dny spadající do nahlášeného zavření jsou v něm zvýrazněné červeně, dnešek žlutým rámečkem.

## v0.7.3 - 04.09.2026 13:13
- v0.7.3: Detail filiálky ve stejném profesionálním designu — tři sloupce (Adresa/Kontakty/Otevírací doba) v modalu detailu filiálky jsou teď karty s modrým orámováním, stejný vizuální jazyk jako formuláře, dřív jen holé sloupce bez boxu. Skutečná oprava mezery v modalu svátku — i po předchozím zvětšení na 32px pořád nedostatečné, teď 44px a navíc nezávislý doplňkový odstup (margin) na kartě samotné, ať mezera zůstane jistě vidět bez ohledu na jediný mechanismus.

## v0.7.2 - 04.09.2026 12:50
- v0.7.2: Sjednocený profesionální vzhled napříč všemi modal okny — hero pole (výrazné hlavní pole) a karty s modrým orámováním z formuláře události/svátku teď mají i Pracovní pozice, Oddělení, LC, Typ události a Uživatel, ne jen ty dva. Oprava: v modalu svátku chyběla viditelná mezera mezi polem Název svátku a kartou s Datem — u tak řídkého formuláře splývala se stejnou hodnotou jako v hustším formuláři události, teď má vlastní větší mezeru.

## v0.7.1 - 04.09.2026 12:35
- v0.7.1: Modal svátku profesionálněji — formulář nového/upravovaného svátku měl pořád jen těsný výchozí vzhled (480 px, dvě pole vedle sebe), teď stejný vizuální jazyk jako formulář události: Název svátku jako výrazné hero pole nahoře, pod ním karta s modrým orámováním pro Datum, modal rozšířený na 720 px. Appka navíc vedle data živě dopočítá a zobrazí den v týdnu, ať je hned vidět, na jaký den svátek padne, bez nutnosti formulář nejdřív uložit. Hero pole a modré orámování karet jsou teď sdílené komponenty (form-hero-field/form-hero-input, field-group-accent) — používá je formulář události i svátku, dřív byly natvrdo pojmenované jen pro událost.

## v0.7.0 - 04.09.2026 09:16
- v0.7.0: Formulář události — druhé kolo podle zpětné vazby — modal je teď doopravdy velký (960 px, dva sloupce, stejná šířka jako detail filiálky), ne jen o trochu širší úzký proužek. Název stojí sám nahoře jako výrazné hero pole, pod ním vedle sebe Typ události (s přepínačem Celý den) a Termín, Popis přes celou šířku dole — každá sekce s modrým orámováním nahoře, ať vypadá jako samostatná karta, ne splývající šedý blok. Datumy Od a Do jsou konečně vedle sebe v jednom řádku, čas od-do zvlášť v dalším (dřív bylo párováno datum+čas k sobě, což nebylo ono). Rozbalovací seznam typu události teď zobrazí všechny položky ve dvou sloupcích najednou, bez nutnosti scrollovat. Zaškrtávátko Celý den nahrazeno přepínačem (toggle switch).

## v0.6.1 - 04.09.2026 08:57
- v0.6.1: Oprava komentáře — u CZECH_FIXED_HOLIDAYS v 00_config.js komentář ještě popisoval starou čistě dopočítanou podobu svátků (žádná editace)
- od v0.6.0 je to jen výchozí sada pro jednorázové nasetí do editovatelné tabulky _holidays, komentář teď odpovídá skutečnosti. Bez dopadu na chování appky.

## v0.6.0 - 04.09.2026 08:57
- v0.6.0: Editovatelné svátky, ikony typu události, profesionálnější formulář — Státní svátky ČR jsou teď plně editovatelná tabulka (přidat/upravit/smazat), ne jen dopočítaný přehled: appka pro nový rok jednou naseje výchozí zákonnou sadu, dál se s ní zachází jako s běžným seznamem v Nastavení
- přibyl sloupec Den (v týdnu) a hlavička tabulky (Datum, Den, Název svátku, Akce), sloupce v tomto pořadí. Formulář nové/upravené události má nově vlastní rozbalovací seznam typu s barevnou ikonou u každé položky (dřív jen text v obyčejném výběru), pole s časem od/do jsou užší (dřív zbytečně nafouklá na celou šířku poloviny řádku) a celý formulář je přehledně rozdělený do podepsaných sekcí (Základní údaje, Termín, Popis) — dřív úplně výchozí vzhled prohlížeče, teď stejný styl jako formulář uživatele.

## v0.5.1 - 04.09.2026 08:32
- v0.5.1: Oprava komentáře — v 00_config.js u CZECH_FIXED_HOLIDAYS chybně odkazovaný soubor s _czechHolidaysForYear_ (napsáno 60_import.js, funkce je ve skutečnosti v 50_api.js), bez dopadu na chování appky.

## v0.5.0 - 04.09.2026 08:31
- v0.5.0: Systém státních svátků ČR — v Nastavení přibyla záložka Státní svátky ČR s přepínačem roku a dynamicky dopočítaným seznamem všech svátků daného roku (11 s pevným datem + dva pohyblivé, Velký pátek a Velikonoční pondělí, odvozené od data Velikonoc)
- appka je nikde needituje, jde o zákonem daný seznam, jen ho zobrazuje. V mřížce kalendáře se u dnů se svátkem místo pouhého čísla zobrazí červený pruh s číslem dne a názvem svátku a celá buňka dostane červené orámování — u dnešního dne s výjimkou, orámování zůstává žluté (svátek), pruh se svátkem se ale zobrazí vždy. Zobrazení řídí už dřív existující, ale doposud nepoužité nastavení pro zobrazování svátků. Mřížka občas přesahuje do sousedního roku (přelom prosinec/leden) — appka si podle potřeby dotáhne svátky i pro něj, bez nutnosti dalšího kliku.

## v0.4.2 - 04.09.2026 08:17
- Import dat a dynamické ikony hlaviček — záložka Import dat teď sama vyhledá soubory hned při otevření, pokud jsou pole už vyplněná, a u vybraného souboru rovnou ověří (bez importu dat), že obsahuje oba očekávané listy se všemi sloupci, tlačítko Synchronizovat se povolí až podle výsledku
- přibylo ovládání noční automatické synchronizace přímo v appce (zapnout/vypnout, hodina spuštění), beze změny zůstává i ruční založení triggeru z editoru
- ikona řazení v hlavičce sloupce teď ukazuje i směr (šipka nahoru/dolů vedle čísla úrovně, ne jen samotné číslo) a ikona filtru mění barvu podle toho, jestli je na sloupci opravdu aktivní filtr

## v0.4.1 - 04.09.2026 07:56
- Hlavičky sloupců — přepracované ikony a vícenásobné řazení: ikony jsou nově vždy hned za názvem zleva, ne u pravého okraje buňky, s napevno vyhrazeným místem (nejdřív kolečko s číslem úrovně řazení, pak ikona filtru), název sloupce se už nikdy nezkracuje na tři tečky, šířky sloupců rozšířeny
- appka teď umí řadit podle víc sloupců najednou (např. podle LC a v rámci LC podle jména RM), kolečko s číslem ukazuje pořadí úrovně řazení a při přidání či odebrání úrovně se čísla sama přepočítají, nikdy jen nerostou
- v okně u sloupce, který je součástí řazení, přibylo tlačítko „Nořadit podle tohoto sloupce"

## v0.4.0 - 04.09.2026 07:47
- Import dat filiálek — etapa 4 (poslední): noční automatická synchronizace přes časovaný trigger, spouští se ručně z editoru přes TOOLS_nastavDenniSynchronizaci (mezi 6:00 a 7:00, zdroj se sám aktualizuje 4-5h), zrušit jde přes TOOLS_zrusDenniSynchronizaci
- trigger navazuje na naposledy odsouhlasenou složku a hledaný výraz z ručního syncu, sám vybere nejnovější soubor a spustí stejnou sdílenou logiku jako ruční tlačítko (zápis do Logu importu i oznámení zvonečkem)
- dokud SUPERADMIN aspoň jednou ručně nesynchronizuje, trigger nemá co spustit a jen se o tom zaloguje

## v0.3.3 - 04.09.2026 07:43
- Oprava a vzhled — výběr Umístění ve formuláři uživatele teď řadí zkratky LC podle jejich nastaveného Čísla (dřív abecedně podle zkratky)
- vzhled tabulky Uživatelé: avatar je nově barevný podle role (žlutá jen u správce aplikace, modrá u administrátora), sloupec Stav má malou barevnou tečku před textem, Oprávnění je teď obrysový odznak stejného jazyka jako odznak Role, řádky mají trochu víc vzduchu

## v0.3.2 - 04.09.2026 07:35
- Doladění tabulek a formuláře uživatele — oprava chyby, kvůli které se v okně filtru u záložky Uživatelé nenabízely žádné hodnoty (popover četl vždy data LC místo správné tabulky)
- klikací plocha hlavičky sloupce teď sahá přes celou šířku buňky, ne jen přes text popisku
- pole Umístění ve formuláři uživatele je nově výběr ze seznamu aktivních LC (podle zkratky) plus pevná hodnota DL pro centrálu, místo volného textu

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

