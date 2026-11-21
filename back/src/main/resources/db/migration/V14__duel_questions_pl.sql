-- V14: Polish translations for the 75 duel questions.
-- Translates prompt_pl, options_pl and explanation_pl for all 75 questions in duel_question.
-- Natural, plain Polish appropriate for banking app users across all generations.

UPDATE duel_question
SET prompt_pl = 'Co posiadasz, gdy kupujesz akcję spółki giełdowej?',
    options_pl = ARRAY[
        'Niewielką część udziału w kapitale i własności spółki',
        'Pożyczkę o stałym oprocentowaniu, którą spółka musi spłacić w określonym terminie',
        'Gwarancję państwową chroniącą przed utratą pieniędzy',
        'Depozyt bankowy ubezpieczony przez państwo'
    ],
    explanation_pl = 'Akcja stanowi ułamek własności (kapitału własnego) przedsiębiorstwa, więc wartość Twojej inwestycji rośnie lub spada wraz z kondycją spółki. W przeciwieństwie do pożyczki czy depozytu, akcje nie dają gwarancji zwrotu wpłaconego kapitału.'
WHERE id = 1;

UPDATE duel_question
SET prompt_pl = 'Na czym polega działanie obligacji z perspektywy osoby, która ją kupuje?',
    options_pl = ARRAY[
        'Kupujesz stały udział z prawem głosu w spółce',
        'Pożyczasz pieniądze emitentowi w zamian za odsetki i późniejszy zwrot kapitału',
        'Ubezpieczasz swoje oszczędności przed spadkami na giełdzie',
        'Przechowujesz walutę obcą na rachunku maklerskim'
    ],
    explanation_pl = 'Obligacja to papier dłużny, w którym państwo lub spółka pożycza Twoje pieniądze i wypłaca okresowe odsetki aż do terminu wykupu. W dacie wykupu emitent zwraca wartość nominalną obligacji, o ile nie stanie się niewypłacalny.'
WHERE id = 2;

UPDATE duel_question
SET prompt_pl = 'Czym jest dywidenda?',
    options_pl = ARRAY[
        'Opłatą pobieraną przez brokera za realizację transakcji',
        'Różnicą między ceną zakupu a ceną sprzedaży akcji',
        'Częścią zysku spółki wypłacaną akcjonariuszom',
        'Podatkiem należnym przy zamknięciu rachunku inwestycyjnego'
    ],
    explanation_pl = 'Spółki wypracowujące zyski mogą wypłacać część z nich akcjonariuszom w formie gotówki lub dodatkowych akcji. Wypłata dywidendy jest dobrowolną decyzją spółki i może zostać zmniejszona lub zawieszona, jeśli zyski spadną.'
WHERE id = 3;

UPDATE duel_question
SET prompt_pl = 'Czym jest ETF (fundusz notowany na giełdzie)?',
    options_pl = ARRAY[
        'Kontem oszczędnościowym z gwarantowanym oprocentowaniem',
        'Akcją pojedynczej spółki handlowaną wyłącznie po godzinach sesji',
        'Obligacją skarbową emitowaną bezpośrednio przez bank centralny',
        'Koszykiem aktywów notowanym na giełdzie tak samo jak pojedyncza akcja'
    ],
    explanation_pl = 'ETF łączy wiele papierów wartościowych – np. akcji lub obligacji – w jeden fundusz, którego jednostki można kupować i sprzedawać na giełdzie w trakcie sesji. Pozwala to rozproszyć ryzyko na wiele instrumentów w ramach jednej transakcji.'
WHERE id = 4;

UPDATE duel_question
SET prompt_pl = 'Jaka jest główna rola giełdy papierów wartościowych?',
    options_pl = ARRAY[
        'Przejrzyste kojarzenie kupujących i sprzedających papiery wartościowe według jasnych zasad',
        'Ustalanie sztywnych cen akcji, aby nie mogły one spaść',
        'Pożyczanie pieniędzy inwestorom, którzy chcą kupić akcje',
        'Gwarantowanie, że każda notowana spółka będzie przynosić zyski'
    ],
    explanation_pl = 'Giełda stanowi zorganizowany, regulowany rynek, na którym spotykają się zlecenia, a ceny kształtują się pod wpływem popytu i podaży. Nie wpływa ona na wyniki spółek ani nie chroni inwestorów przed stratami.'
WHERE id = 5;

UPDATE duel_question
SET prompt_pl = 'Jaka jest kluczowa różnica między funduszem indeksowym a funduszem zarządzanym aktywnie?',
    options_pl = ARRAY[
        'Fundusz indeksowy posiada wyłącznie obligacje skarbowe',
        'Fundusz indeksowy naśladuje indeks rynkowy, a fundusz aktywny stara się go pobić, dobierając wybrane aktywa',
        'Fundusz aktywny może być nabywany wyłącznie przez banki instytucjonalne',
        'Fundusz indeksowy gwarantuje dodatnią stopę zwrotu każdego roku'
    ],
    explanation_pl = 'Fundusze indeksowe dążą do odwzorowania wybranego indeksu (np. szerokiego rynku akcji), co obniża koszty analiz i transakcji. Zarządzający funduszem aktywnym selekcjonują instrumenty, próbując osiągnąć wynik lepszy niż rynek, zazwyczaj pobierając wyższe opłaty.'
WHERE id = 6;

UPDATE duel_question
SET prompt_pl = 'Gdy rynkowe stopy procentowe gwałtownie rosną, co zazwyczaj dzieje się z cenami dotychczas wyemitowanych obligacji o stałym oprocentowaniu?',
    options_pl = ARRAY[
        'Ich cena rośnie, ponieważ wszystkie obligacje zyskują na wartości',
        'Ich cena pozostaje zawsze na poziomie wartości nominalnej',
        'Ich cena spada, ponieważ nowo emitowane obligacje oferują wyższe odsetki',
        'Zostają automatycznie zamienione na akcje spółek'
    ],
    explanation_pl = 'Nowo emitowane obligacje oferują wyższe odsetki zgodne z nowym poziomem stóp, przez co starsze obligacje z niższym kuponem stają się mniej atrakcyjne. Ich rynkowa cena musi spaść, aby ich rentowność wyrównała się z nowymi emisjami.'
WHERE id = 7;

UPDATE duel_question
SET prompt_pl = 'Czym różni się zlecenie po cenie rynkowej (market order) od zlecenia z limitem ceny (limit order)?',
    options_pl = ARRAY[
        'Zlecenie po cenie rynkowej można złożyć tylko wtedy, gdy giełda jest zamknięta',
        'Zlecenie z limitem ceny jest zawsze realizowane szybciej niż zlecenie po cenie rynkowej',
        'Zlecenie po cenie rynkowej jest bezpłatne, a zlecenie z limitem zawsze wiąże się z dopłatą',
        'Zlecenie po cenie rynkowej realizuje się natychmiast po najlepszej dostępnej cenie, a zlecenie z limitem określa maksymalną cenę zakupu lub minimalną cenę sprzedaży'
    ],
    explanation_pl = 'Zlecenie po cenie rynkowej stawia na szybkość realizacji kosztem braku gwarancji dokładnej ceny. Zlecenie z limitem chroni cenę transakcji, ale może nie zostać zrealizowane, jeśli rynek nie osiągnie wskazanego limitu.'
WHERE id = 8;

UPDATE duel_question
SET prompt_pl = 'Czym różni się ETF akumulujący od ETF-u dystrybuującego?',
    options_pl = ARRAY[
        'ETF akumulujący automatycznie reinwestuje dywidendy lub odsetki wewnątrz funduszu, zamiast wypłacać je w gotówce',
        'ETF dystrybuujący może inwestować wyłącznie w obligacje',
        'Kurs jednostki ETF-u akumulującego nigdy się nie zmienia',
        'ETF dystrybuujący zawsze osiąga wyższy całkowity zwrot z inwestycji'
    ],
    explanation_pl = 'Fundusze akumulujące pozostawiają wypracowane dochody w funduszu i dokupują kolejne aktywa, co automatycznie napędza procent składany. Fundusze dystrybuujące regularnie przelewają te środki na rachunek gotówkowy inwestora.'
WHERE id = 9;

UPDATE duel_question
SET prompt_pl = 'Co mierzy kapitalizacja rynkowa spółki giełdowej?',
    options_pl = ARRAY[
        'Gotówkę zgromadzoną na rachunkach bankowych spółki',
        'Łączną wartość rynkową wszystkich wyemitowanych akcji spółki',
        'Roczny zysk spółki przed opodatkowaniem',
        'Łączne zadłużenie spółki wobec posiadaczy obligacji'
    ],
    explanation_pl = 'Kapitalizacja rynkowa to aktualny kurs akcji pomnożony przez liczbę wszystkich akcji spółki. Pokazuje łączną rynkową wycenę całej firmy, niezależnie od tego, czy pojedyncza akcja kosztuje nominalnie mało, czy dużo.'
WHERE id = 10;

UPDATE duel_question
SET prompt_pl = 'Dlaczego obligacja długoterminowa o stałym oprocentowaniu traci na wartości mocniej niż krótkoterminowa, gdy stopy procentowe rosną?',
    options_pl = ARRAY[
        'Obligacje długoterminowe są zawsze emitowane przez mniej wiarygodnych dłużników',
        'Obligacje krótkoterminowe nigdy nie są notowane na rynku wtórnym',
        'Jej niższy stały kupon jest zablokowany na znacznie więcej lat, co zwiększa jej duration (czas trwania)',
        'Obligacje krótkoterminowe wypłacają dywidendy zamiast odsetek'
    ],
    explanation_pl = 'Duration (czas trwania) mierzy wrażliwość ceny obligacji na zmiany stóp procentowych; im dłuższy termin wykupu, tym więcej przyszłych płatności jest dyskontowanych wyższą stopą. W efekcie rynek wymaga większego dyskonta cenowego dla starszych obligacji długoterminowych.'
WHERE id = 11;

UPDATE duel_question
SET prompt_pl = 'O czym informuje wskaźnik „tracking difference” (różnica odwzorowania) w funduszu ETF?',
    options_pl = ARRAY[
        'Ile razy dziennie aktualizowana jest wycena jednostki ETF',
        'Jakie jest opóźnienie między złożeniem zlecenia a jego rozliczeniem',
        'Ile państw wchodzi w skład danego indeksu',
        'Jak dokładnie rzeczywisty wynik ETF-u odpowiadał wynikowi naśladowanego indeksu w danym okresie'
    ],
    explanation_pl = 'Różnica odwzorowania (tracking difference) to różnica między rzeczywistą stopą zwrotu funduszu a stopą zwrotu indeksu, wynikająca m.in. z opłat, kosztów transakcyjnych i podatków od dywidend. Niska różnica świadczy o efektywnej replikacji indeksu przez ETF.'
WHERE id = 12;

UPDATE duel_question
SET prompt_pl = 'Jeśli spółka zbankrutuje, a jej majątek zostanie zlicytowany, kto ma pierwszeństwo zaspokojenia roszczeń: obligatariusze czy akcjonariusze?',
    options_pl = ARRAY[
        'Posiadacze obligacji (obligatariusze) przed akcjonariuszami',
        'Akcjonariusze przed posiadaczami obligacji',
        'Obie grupy dzielą pozostałe środki po równo',
        'Grupa, która zakupiła papiery wartościowe najpóźniej'
    ],
    explanation_pl = 'Obligatariusze są wierzycielami spółki i zgodnie z prawem mają pierwszeństwo do jej majątku przed właścicielami (akcjonariuszami). Akcjonariusze stoją na końcu kolejki i przy niewystarczającym majątku tracą cały zainwestowany kapitał.'
WHERE id = 13;

UPDATE duel_question
SET prompt_pl = 'Czym różni się ETF z replikacją fizyczną od ETF-u z replikacją syntetyczną?',
    options_pl = ARRAY[
        'ETF fizyczny można kupić tylko w formie papierowej w placówce banku',
        'ETF fizyczny kupuje i posiada instrumenty z indeksu, a syntetyczny korzysta z kontraktów swap z instytucją finansową, by odwzorować wynik',
        'ETF-y syntetyczne nie mogą naśladować indeksów akcji',
        'ETF-y fizyczne nie podlegają żadnemu ryzyku rynkowemu'
    ],
    explanation_pl = 'Replikacja fizyczna polega na bezpośrednim zakupie akcji lub obligacji z indeksu (lub ich reprezentatywnej próby). Replikacja syntetyczna opiera się na umowie swap z bankiem partnerskim, co wiąże się z ryzykiem kontrahenta, ograniczanym przez zabezpieczenia (kolateral).'
WHERE id = 14;

UPDATE duel_question
SET prompt_pl = 'Czym jest ryzyko płynności w przypadku handlu mało płynną akcją lub rzadko handlowanym ETF-em?',
    options_pl = ARRAY[
        'Ryzykiem wyczerpania zapasów surowców przez przedsiębiorstwo',
        'Ryzykiem usunięcia rachunku przez brokera w trakcie trwania sesji',
        'Ryzykiem, że nie uda się szybko kupić lub sprzedać instrumentu bez niekorzystnego wpływu na cenę transakcji',
        'Ryzykiem przekroczenia celu inflacyjnego przez bank centralny'
    ],
    explanation_pl = 'Gdy na rynku brakuje aktywnych kupujących i sprzedających, spread (różnica cenowa) rośnie, a większe zlecenia mocno przesuwają cenę. Utrudnia to i podraża wejście lub wyjście z pozycji, szczególnie w okresach zawirowań rynkowych.'
WHERE id = 15;

UPDATE duel_question
SET prompt_pl = 'Jaki jest główny cel dywersyfikacji w portfelu inwestycyjnym?',
    options_pl = ARRAY[
        'Zagwarantowanie, że portfel nigdy nie zanotuje ujemnego miesiąca',
        'Podwojenie oczekiwanego zysku bez zwiększania poziomu ryzyka',
        'Całkowite uniknięcie prowizji maklerskich i podatków',
        'Ograniczenie wpływu złego wyniku pojedynczej inwestycji na cały portfel'
    ],
    explanation_pl = 'Rozłożenie kapitału na różne aktywa, sektory i regiony sprawia, że problemy jednej spółki nie zniszczą całego portfela. Dywersyfikacja zmniejsza ryzyko specyficzne, choć nie eliminuje ogólnych spadków całego rynku.'
WHERE id = 16;

UPDATE duel_question
SET prompt_pl = 'Co oznacza pojęcie „zmienność” (volatility) w inwestowaniu?',
    options_pl = ARRAY[
        'Jak mocno cena aktywa waha się w górę i w dół w danym okresie',
        'Łączną opłatę pobieraną przez fundusz w skali roku',
        'Prawdopodobieństwo trwałego zamknięcia placówki bankowej',
        'Liczbę dywidend wypłaconych w ciągu roku kalendarzowego'
    ],
    explanation_pl = 'Wysoka zmienność oznacza gwałtowne i duże wahania cen w obu kierunkach, a niska zmienność – bardziej stabilny kurs. Zmienność opisuje wahania na drodze do celu, które nie muszą oznaczać trwałej straty kapitału.'
WHERE id = 17;

UPDATE duel_question
SET prompt_pl = 'Dlaczego dłuższy horyzont inwestycyjny ułatwia znoszenie wahań na rynku akcji?',
    options_pl = ARRAY[
        'Ponieważ przepisy prawa zabraniają spadków cen akcji w horyzoncie dziesięciu lat',
        'Ponieważ masz więcej czasu na przeczekanie spadków bez konieczności sprzedaży po niskiej cenie',
        'Ponieważ brokerzy zwracają straty na rachunkach prowadzonych dłużej niż pięć lat',
        'Ponieważ opłaty maklerskie spadają do zera po pierwszym roku inwestowania'
    ],
    explanation_pl = 'Krótkoterminowe spadki bywają głębokie, a nagła potrzeba gotówki zmusza do zrealizowania straty na dołku. Dłuższy czas daje rynkowi szansę na odrobienie strat i czerpanie zysków z długoterminowego wzrostu gospodarczego.'
WHERE id = 18;

UPDATE duel_question
SET prompt_pl = 'Za sześć miesięcy potrzebujesz pieniędzy na wkład własny na mieszkanie. Jakie jest główne ryzyko ulokowania całej kwoty w akcjach?',
    options_pl = ARRAY[
        'Akcji nie można sprzedać przez co najmniej pięć lat od zakupu',
        'Dywidendy są opodatkowane stawką 100% w pierwszym roku',
        'Krótkoterminowy spadek cen może sprawić, że zabraknie Ci pieniędzy w kluczowym momencie',
        'Giełdy papierów wartościowych zabraniają wypłat środków przed upływem roku'
    ],
    explanation_pl = 'Ceny akcji mogą gwałtownie spaść w ciągu kilku miesięcy bez szansy na odbicie przed terminem zapłaty. Środki potrzebne w bliskiej przyszłości nie powinny być narażane na wysoką zmienność.'
WHERE id = 19;

UPDATE duel_question
SET prompt_pl = 'Dlaczego posiadanie akcji pięciu różnych banków daje gorszą dywersyfikację niż posiadanie akcji pięciu spółek z różnych branż?',
    options_pl = ARRAY[
        'Banki nigdy nie wypłacają dywidend drobnym inwestorom',
        'Przepisy zabraniają posiadania więcej niż trzech spółek z tej samej branży',
        'Akcje banków są obciążone wyższymi prowizjami maklerskimi',
        'Firmy z tego samego sektora zazwyczaj podobnie reagują na te same zjawiska w gospodarce'
    ],
    explanation_pl = 'Zmiany stóp procentowych, nowe regulacje lub kryzys kredytowy uderzają w cały sektor bankowy jednocześnie, powodując spadek wszystkich pięciu spółek. Rozproszenie inwestycji na różne branże chroni przed kryzysem w jednym sektorze.'
WHERE id = 20;

UPDATE duel_question
SET prompt_pl = 'Na czym polega „rebalancing” (równoważenie) portfela inwestycyjnego?',
    options_pl = ARRAY[
        'Przywróceniu wyjściowych proporcji aktywów po tym, jak ruchy cenowe zmieniły ich udziały w portfelu',
        'Sprzedaży wszystkich aktywów za każdym razem, gdy rynek spadnie o 5%',
        'Przeniesieniu wszystkich środków do aktywa, które osiągnęło najlepszy wynik w ubiegłym roku',
        'Sprawdzaniu stanu konta maklerskiego o tej samej porze każdego dnia'
    ],
    explanation_pl = 'Gdy jedna klasa aktywów rośnie szybciej niż inne, jej udział w portfelu rośnie, zmieniając profil ryzyka. Rebalancing polega na redukcji przeważonych pozycji lub dokupieniu niedoważonych, aby powrócić do założonej strategii.'
WHERE id = 21;

UPDATE duel_question
SET prompt_pl = 'Co oznacza niska lub ujemna korelacja między dwoma aktywami w portfelu?',
    options_pl = ARRAY[
        'Oba aktywa z całą pewnością będą tracić na wartości jednocześnie',
        'Gdy jedno aktywo tanieje, drugie zachowuje się niezależnie lub rośnie, wygładzając wahania całego portfela',
        'Żadne z tych aktywów nie może być notowane na giełdzie publicznej',
        'Oba aktywa przynoszą dokładnie taką samą roczną stopę zwrotu'
    ],
    explanation_pl = 'Korelacja mierzy zależność ruchów cenowych dwóch aktywów (od +1 do -1). Połączenie instrumentów o niskiej lub ujemnej korelacji obniża zmienność całego portfela, nie obniżając proporcjonalnie oczekiwanego zwrotu.'
WHERE id = 22;

UPDATE duel_question
SET prompt_pl = 'Czym jest „drawdown” (maksymalne obsunięcie kapitału) w inwestowaniu?',
    options_pl = ARRAY[
        'Roczną opłatą potrącaną z aktywów funduszu',
        'Odsetkami naliczanymi od gotówki oczekującej na inwestycję',
        'Procentowym spadkiem wartości portfela od historycznego szczytu do kolejnego dołka przed odrobieniem strat',
        'Kwotą pieniędzy dopłacaną do portfela w każdym miesiącu'
    ],
    explanation_pl = 'Maksymalne obsunięcie (maximum drawdown) pokazuje najgłębszy spadek wyceny od szczytu do dołka w danym okresie. Pozwala to ocenić, jak trudne momenty przeżywał dany portfel i czy inwestor byłby w stanie je psychicznie wytrzymać.'
WHERE id = 23;

UPDATE duel_question
SET prompt_pl = 'Dlaczego po spadku wartości inwestycji o 50% potrzeba wzrostu aż o 100%, aby wyjść na zero?',
    options_pl = ARRAY[
        'Ponieważ giełdy pobierają 50% prowizji za odzyskanie kapitału',
        'Ponieważ inflacja automatycznie podwaja się w trakcie kryzysu',
        'Ponieważ straty są opodatkowane dwa razy wyższą stawką niż zyski',
        'Ponieważ procent odrabiania strat liczony jest od mniejszej, pozostałej po spadku kwoty'
    ],
    explanation_pl = 'Gdy z 1000 zł stracisz 50%, zostaje Ci 500 zł – a 500 zł musi urosnąć o 100% (+500 zł), aby z powrotem osiągnąć 1000 zł. Ta asymetria pokazuje, jak trudne i kosztowne jest odrabianie głębokich strat.'
WHERE id = 24;

UPDATE duel_question
SET prompt_pl = 'Czym jest ryzyko niesystematyczne (specyficzne dla spółki)?',
    options_pl = ARRAY[
        'Ryzykiem związanym z pojedynczym przedsiębiorstwem lub branżą, które można w znacznym stopniu ograniczyć dzięki dywersyfikacji',
        'Ryzykiem uderzającym jednocześnie w całą globalną gospodarkę',
        'Ryzykiem wynikającym wyłącznie z opłat za przewalutowanie',
        'Ryzykiem występującym wyłącznie w obligacjach skarbowych'
    ],
    explanation_pl = 'Kłopoty z produktem, zły zarząd czy przegrany proces mogą pogrążyć pojedynczą firmę, nawet gdy reszta rynku rośnie. Posiadanie akcji wielu niezależnych spółek neutralizuje to ryzyko, pozostawiając jedynie ogólne ryzyko rynkowe.'
WHERE id = 25;

UPDATE duel_question
SET prompt_pl = 'Czym jest „ryzyko sekwencji stóp zwrotu” (sequence-of-returns risk), szczególnie istotne tuż przed emeryturą i na jej początku?',
    options_pl = ARRAY[
        'Ryzykiem realizacji zleceń przez brokera w kolejności alfabetycznej',
        'Ryzykiem, że głębokie straty na początku okresu wypłacania kapitału przedwcześnie i trwale uszczuplą portfel',
        'Ryzykiem, że dywidendy wpłyną na konto tydzień później niż zapowiadano',
        'Ryzykiem kwartalnych zmian składu indeksów giełdowych'
    ],
    explanation_pl = 'Sprzedaż aktywów na bieżące wydatki podczas bessy na początku emerytury drastycznie zmniejsza liczbę jednostek, które mogłyby odrabiać straty podczas hossy. Dwa portfele o identycznej średniej stopie zwrotu dadzą zupełnie inny wynik w zależności od kolejności dobrych i złych lat.'
WHERE id = 26;

UPDATE duel_question
SET prompt_pl = 'Co oznacza „ryzyko walutowe”, gdy posiadasz aktywa denominowane w walutach obcych?',
    options_pl = ARRAY[
        'Ryzyko zniszczenia lub zużycia papierowych banknotów w skrytce',
        'Ryzyko zakazu notowania zagranicznych spółek na giełdach',
        'Ryzyko, że wahania kursów walut zmienią wartość Twojej inwestycji po przeliczeniu na walutę krajową',
        'Ryzyko rezygnacji przez dane państwo z płatności elektronicznych'
    ],
    explanation_pl = 'Nawet jeśli zagraniczna akcja zyska 10% w swojej walucie, to 10-procentowe osłabienie tej waluty wobec waluty krajowej może całkowicie zniwelować zysk. Ruchy kursów walutowych mogą zarówno powiększyć zysk, jak i pogłębić stratę.'
WHERE id = 27;

UPDATE duel_question
SET prompt_pl = 'Czym jest „ryzyko koncentracji” w szerokim indeksie ważonym kapitalizacją rynkową?',
    options_pl = ARRAY[
        'Ryzykiem, że indeks zawiera zbyt wiele małych spółek, by móc je śledzić',
        'Ryzykiem, że wszystkie spółki w indeksie mają dokładnie taką samą cenę akcji',
        'Ryzykiem wstrzymania notowań indeksu podczas dni świątecznych',
        'Ryzykiem, że zaledwie kilka największych spółek stanowi dominującą część wartości całego indeksu'
    ],
    explanation_pl = 'W indeksach ważonych kapitalizacją największe korporacje mają największy udział, więc kilka gigantów może decydować o losach całego indeksu. Nawet indeks złożony z setek spółek może być w praktyce zdominowany przez jeden sektor lub garść firm.'
WHERE id = 28;

UPDATE duel_question
SET prompt_pl = 'Dlaczego korelacja między różnymi ryzykownymi aktywami może gwałtownie wzrosnąć w czasie ostrego kryzysu finansowego?',
    options_pl = ARRAY[
        'Ponieważ zaniepokojeni inwestorzy wyprzedają jednocześnie najróżniejsze aktywa, aby zdobyć gotówkę',
        'Ponieważ banki centralne odgórnie zamrażają wzajemne relacje cen akcji',
        'Ponieważ systemy informatyczne giełd przestają aktualizować indywidualne wyceny',
        'Ponieważ stosowanie dywersyfikacji jest zabronione w trakcie krachów giełdowych'
    ],
    explanation_pl = 'W atmosferze paniki inwestorzy i fundusze sprzedają wszystko, co płynne, aby pokryć zobowiązania i uzupełnić depozyty, pociągając w dół z pozoru niezależne rynki. Dlatego obok akcji warto posiadać aktywa typowo defensywne oraz bezpieczną poduszkę finansową.'
WHERE id = 29;

UPDATE duel_question
SET prompt_pl = 'Co pozwala porównać wskaźnik Sharpea (Sharpe ratio) między dwoma portfelami?',
    options_pl = ARRAY[
        'Który portfel poniósł najniższe prowizje maklerskie',
        'Ile dodatkowego zwrotu ponad stopę wolną od ryzyka wypracował każdy portfel w przeliczeniu na jednostkę zmienności',
        'Ile spółek znajduje się w poszczególnych portfelach',
        'Jak szybko aktywa z danego portfela mogą zostać zamienione na gotówkę'
    ],
    explanation_pl = 'Wyższa stopa zwrotu okupiona ogromną zmiennością nie zawsze jest lepsza od stabilniejszego zysku. Wskaźnik Sharpea zestawia zysk z poziomem ryzyka (zmiennością), mierząc efektywność inwestycji skorygowaną o ryzyko.'
WHERE id = 30;

UPDATE duel_question
SET prompt_pl = 'Czym jest wskaźnik TER (Total Expense Ratio) funduszu inwestycyjnego?',
    options_pl = ARRAY[
        'Gwarantowaną roczną stopą zwrotu obiecywaną przez fundusz',
        'Stawką podatkową naliczaną przy sprzedaży jednostek funduszu',
        'Rocznym odsetkiem aktywów funduszu pobieranym na pokrycie bieżących kosztów jego funkcjonowania',
        'Minimalną kwotą wpłaty wymaganą do otwarcia rachunku maklerskiego'
    ],
    explanation_pl = 'TER określa roczny procent kosztów zarządzania i administracji potrącany bezpośrednio z wyceny funduszu każdego dnia. Choć inwestor nie dostaje osobnego rachunku, wyższy TER bezpośrednio pomniejsza osiągany wynik.'
WHERE id = 31;

UPDATE duel_question
SET prompt_pl = 'Czym jest spread (bid-ask spread) przy zakupie lub sprzedaży papieru wartościowego?',
    options_pl = ARRAY[
        'Zyskiem, który spółka zatrzymuje po wypłacie dywidendy',
        'Roczną opłatą pobieraną przez zarządzającego funduszem',
        'Opóźnieniem między kliknięciem „Kup” a pojawieniem się akcji na koncie',
        'Różnicą między najwyższą ceną oferowaną przez kupujących a najniższą ceną żądaną przez sprzedających'
    ],
    explanation_pl = 'Kupując, płacisz zazwyczaj nieco wyższą cenę ask (sprzedaży), a sprzedając – niższą cenę bid (kupna). Ta różnica jest natychmiastowym kosztem transakcyjnym, dlatego węższy spread oznacza tańszy handel.'
WHERE id = 32;

UPDATE duel_question
SET prompt_pl = 'Dlaczego z pozoru niewielkie roczne opłaty procentowe mają tak ogromne znaczenie w horyzoncie 20–30 lat?',
    options_pl = ARRAY[
        'Ponieważ opłaty podlegają procentowi składanemu – zmniejszają kapitał i zyski, jakie te pieniądze wypracowałyby w przyszłości',
        'Ponieważ opłaty z mocy prawa podwajają się automatycznie co pięć lat',
        'Ponieważ brokerzy naliczają opłaty wyłącznie wtedy, gdy inwestycja przynosi stratę',
        'Ponieważ fundusze o wyższych opłatach są obłożone wyższą stawką podatku'
    ],
    explanation_pl = 'Każda złotówka pobrana w opłatach to kapitał, który nie będzie już dla Ciebie pracować w kolejnych latach. W perspektywie kilkudziesięciu lat nawet 1 punkt procentowy opłaty rocznie potrafi pochłonąć znaczną część końcowej wartości portfela.'
WHERE id = 33;

UPDATE duel_question
SET prompt_pl = 'Kiedy zazwyczaj powstaje obowiązek zapłaty podatku od zysków kapitałowych?',
    options_pl = ARRAY[
        'Za każdym razem, gdy kurs akcji rośnie na ekranie Twojego telefonu',
        'W momencie sprzedaży inwestycji z zyskiem (zrealizowany zysk kapitałowy)',
        'Za każdym razem, gdy logujesz się do aplikacji maklerskiej',
        'Wyłącznie w przypadku inwestowania w obligacje skarbowe'
    ],
    explanation_pl = 'Dopóki posiadasz zyskowny instrument, masz do czynienia z zyskiem niezrealizowanym (papierowym), który nie podlega opodatkowaniu. Dopiero sprzedaż aktywa z zyskiem rodzi zrealizowany zysk podlegający rozliczeniu podatkowemu.'
WHERE id = 34;

UPDATE duel_question
SET prompt_pl = 'Czym jest prowizja maklerska?',
    options_pl = ARRAY[
        'Premią wypłacaną przez spółkę jej wieloletnim akcjonariuszom',
        'Oprocentowaniem naliczanym od wolnych środków na rachunku',
        'Opłatą uiszczaną brokerowi lub platformie za wykonanie zlecenia kupna lub sprzedaży',
        'Coroczną waloryzacją obligacji o wskaźnik inflacji'
    ],
    explanation_pl = 'Prowizja może być kwotowa lub procentowa od wartości transakcji. Znajomość tabeli opłat pozwala uniknąć sytuacji, w której zbyt częste transakcje na małe kwoty zostaną zjedzone przez koszty prowizji.'
WHERE id = 35;

UPDATE duel_question
SET prompt_pl = 'Broker reklamuje się jako „bezprowizyjny” (0 zł za transakcję). W jaki sposób handel u niego wciąż generuje koszty?',
    options_pl = ARRAY[
        'W żaden sposób – brak prowizji oznacza, że całkowity koszt handlu wynosi zawsze zero',
        'Tacy brokerzy mają zakaz kierowania zleceń na giełdy',
        'Transakcje bez prowizji są z urzędu objęte wyższą stawką podatku dochodowego',
        'Poprzez szersze spready cenowe, narzuty na kursach przewalutowania lub opłaty produktowe'
    ],
    explanation_pl = 'Prowizja za zlecenie to tylko jeden ze składników kosztów; koszty ukryte mogą kryć się w spreadach, marżach przy przewalutowaniu czy opłatach za zarządzanie instrumentami. Warto oceniać całkowity koszt inwestycji, a nie tylko chwytliwe hasła.'
WHERE id = 36;

UPDATE duel_question
SET prompt_pl = 'Dlaczego inwestowanie bardzo małych kwot przy stałej prowizji maklerskiej (np. 10 zł) drastycznie pogarsza wynik na starcie?',
    options_pl = ARRAY[
        'Opłata 10 zł przy zakupie za 100 zł oznacza natychmiastowy koszt 10% na starcie, zanim cena w ogóle drgnie',
        'Stałe prowizje są pobierane w każdym kolejnym miesiącu bez końca',
        'Giełdy odrzucają zlecenia o wartości poniżej 1000 zł',
        'Małe zlecenia nie mają prawa do otrzymywania dywidend'
    ],
    explanation_pl = 'Stała kwota prowizji stanowi ogromny odsetek małej wpłaty, więc inwestycja musi od razu solidnie urosnąć, by wyjść na zero. Lepszym podejściem bywa kumulowanie wpłat i dokonywanie rzadszych, ale większych transakcji.'
WHERE id = 37;

UPDATE duel_question
SET prompt_pl = 'Czym jest „opłata za sukces” (performance fee) w funduszach inwestycyjnych?',
    options_pl = ARRAY[
        'Zniżką przyznawaną inwestorom, gdy fundusz wypracuje wynik powyżej inflacji',
        'Dodatkową opłatą pobieraną przez zarządzającego, gdy wynik funduszu przewyższy ustalony benchmark lub próg',
        'Karą płaconą przez zarządzających inwestorom za każdy rok ze stratą',
        'Opłatą skarbową za wprowadzenie funduszu na giełdę'
    ],
    explanation_pl = 'Obok stałej opłaty za zarządzanie, opłata za sukces pozwala zarządzającym pobrać procent od nadwyżki zysku ponad przyjęty poziom odniesienia. Ponieważ w gorszych latach opłaty nie są zwracane, konstrukcja ta powinna być precyzyjnie weryfikowana przez inwestora.'
WHERE id = 38;

UPDATE duel_question
SET prompt_pl = 'Czym jest podatek u źródła od dywidend (dividend withholding tax)?',
    options_pl = ARRAY[
        'Opłatą nakładaną przez spółkę w przypadku odwołania wypłaty dywidendy',
        'Podatkiem płaconym wyłącznie przez inwestorów sprzedających akcje w ciągu 24 godzin',
        'Podatkiem potrącanym u źródła, zanim kwota dywidendy trafi na rachunek inwestora',
        'Zwrotem podatkowym wypłacanym posiadaczom funduszy ETF'
    ],
    explanation_pl = 'Przy wypłacie dywidendy – zwłaszcza z zagranicy – kraj siedziby spółki często potrąca podatek automatycznie przed przekazaniem środków. W zależności od umów o unikaniu podwójnego opodatkowania część tego podatku można odliczyć w kraju rezydencji.'
WHERE id = 39;

UPDATE duel_question
SET prompt_pl = 'W jaki sposób wysoka rotacja w portfelu (bardzo częste kupowanie i sprzedawanie) wpływa na zysk netto?',
    options_pl = ARRAY[
        'Całkowicie likwiduje zmienność rynkową portfela',
        'Obniża podatki, ponieważ zyski są resetowane każdego dnia',
        'Zmusza zarządzających do rezygnacji z opłaty TER',
        'Zwiększa łączne prowizje, koszty spreadów oraz może przyspieszać konieczność zapłaty podatku'
    ],
    explanation_pl = 'Każda transakcja wiąże się ze spreadem i prowizją, a wcześniejsze zamykanie zyskownych pozycji wymusza szybsze rozliczenie podatku od zysków. Wysoka aktywność tworzy dodatkową barierę kosztową, którą zyski muszą pokonać.'
WHERE id = 40;

UPDATE duel_question
SET prompt_pl = 'Czym jest „obciążenie podatkowe” (tax drag) w podlegającym opodatkowaniu rachunku inwestycyjnym?',
    options_pl = ARRAY[
        'Osłabieniem działania procentu składanego w długim terminie przez bieżące płacenie podatków od dywidend i zrealizowanych zysków',
        'Czasem potrzebnym urzędowi skarbowemu na rozpatrzenie zeznania podatkowego',
        'Karą finansową za posiadanie więcej niż jednego rachunku oszczędnościowego',
        'Różnicą między wynagrodzeniem brutto a pensją netto'
    ],
    explanation_pl = 'Pieniądze odprowadzane na bieżąco do urzędu skarbowego bezpowrotnie opuszczają portfel i nie pracują już na przyszłe zyski. Odroczenie podatku (np. w funduszach akumulujących lub na kontach emerytalnych) pozwala zachować większą bazę kapitału.'
WHERE id = 41;

UPDATE duel_question
SET prompt_pl = 'Dlaczego dwa fundusze ETF o identycznym wskaźniku TER mogą osiągnąć nieco inne wyniki na tym samym indeksie?',
    options_pl = ARRAY[
        'Ponieważ jeden z funduszy pomija notowania giełdowe w każdy piątek',
        'Ponieważ wewnętrzne koszty transakcyjne, podatki u źródła od dywidend i przychody z pożyczania papierów nie wchodzą w skład TER',
        'Ponieważ TER jest tylko szacunkiem i nigdy nie jest faktycznie potrącany',
        'Ponieważ giełdy przydzielają losowe premie większym funduszom'
    ],
    explanation_pl = 'Wskaźnik TER obejmuje opłaty za zarządzanie, ale nie uwzględnia kosztów obrotu portfelem, optymalizacji podatkowej dywidend ani przychodów z pożyczania papierów. Ostatecznym wyznacznikiem rzeczywistych kosztów jest wskaźnik tracking difference.'
WHERE id = 42;

UPDATE duel_question
SET prompt_pl = 'Czym jest opłata manipulacyjna za nabycie (tzw. opłata wstępna lub front-end load) w tradycyjnym funduszu inwestycyjnym?',
    options_pl = ARRAY[
        'Opłatą pobieraną wyłącznie wtedy, gdy inwestujesz dłużej niż dziesięć lat',
        'Kosztem wydrukowania i wysłania rocznego sprawozdania finansowego',
        'Procentową opłatą potrącaną z góry z wpłacanej kwoty w momencie zakupu jednostek',
        'Ulgą podatkową naliczaną automatycznie przy pierwszej wpłacie'
    ],
    explanation_pl = 'Jeśli fundusz pobiera 5% opłaty wstępnej od 1000 zł, to w jednostki inwestowane jest tylko 950 zł. Zainwestowany kapitał musi natychmiast zarobić ponad 5%, by odrobić samą opłatę wejściową.'
WHERE id = 43;

UPDATE duel_question
SET prompt_pl = 'W jaki sposób klauzula „high-water mark” chroni inwestorów w funduszu pobierającym opłatę za sukces?',
    options_pl = ARRAY[
        'Ogranicza maksymalną cenę jednostki, by nie stała się ona zbyt droga',
        'Gwarantuje, że fundusz nie straci w ciągu roku więcej niż 10%',
        'Nakazuje funduszowi utrzymywanie co najmniej połowy aktywów w gotówce',
        'Zapewnia, że zarządzający nie pobierze opłaty za sukces, dopóki fundusz nie odrobi wcześniejszych strat'
    ],
    explanation_pl = 'Bez zasady high-water mark fundusz mógłby spaść o 20%, następnie wzrosnąć o 20% i pobrać opłatę za zysk, mimo że inwestor wciąż byłby na minusie. Zasada ta wymaga przebicia historycznego szczytu notowań przed naliczeniem nowej premii.'
WHERE id = 44;

UPDATE duel_question
SET prompt_pl = 'Dlaczego marża na kursie walutowym (spread walutowy) jest często niedostrzeganym kosztem przez inwestorów indywidualnych?',
    options_pl = ARRAY[
        'Ponieważ ukryty narzut procentowy jest wbudowany bezpośrednio w kurs wymiany przy zakupie i sprzedaży zagranicznych aktywów',
        'Ponieważ przewalutowania można dokonać tylko raz w roku',
        'Ponieważ marże walutowe są automatycznie zwracane na koniec roku podatkowego',
        'Ponieważ koszty walutowe dotyczą wyłącznie gotówki w banknotach, a nie transakcji internetowych'
    ],
    explanation_pl = 'Jeśli platforma dolicza np. 1% marży do kursu waluty przy zakupie i sprzedaży, tracisz ten kapitał w obie strony, nawet gdy sama transakcja jest reklamowana jako darmowa. Warto sprawdzać tabele kursowe brokera lub zasilać rachunek bezpośrednio w walucie rozliczeniowej.'
WHERE id = 45;

UPDATE duel_question
SET prompt_pl = 'Co inflacja robi z gotówką leżącą na nieoprocentowanym (0%) koncie osobistym przez kilka lat?',
    options_pl = ARRAY[
        'Zwiększa liczbę środków pieniężnych na rachunku',
        'Sukcesywnie obniża siłę nabywczą tych pieniędzy (to, ile towarów i usług można za nie kupić)',
        'Nie ma żadnego wpływu, dopóki środki nie zostaną wypłacone',
        'Automatycznie przekształca tę gotówkę w procent składany'
    ],
    explanation_pl = 'Inflacja oznacza ogólny wzrost cen, więc za tę samą kwotę z biegiem czasu kupisz coraz mniej. Liczba na wyciągu bankowym pozostaje bez zmian, ale realna wartość Twoich oszczędności maleje.'
WHERE id = 46;

UPDATE duel_question
SET prompt_pl = 'Czym jest procent składany?',
    options_pl = ARRAY[
        'Odsetkami wypłacanymi dopiero w ostatnim dniu wieloletniej pożyczki',
        'Specjalną opłatą karną za wcześniejsze zerwanie lokaty',
        'Naliczaniem odsetek nie tylko od wpłaconego kapitału, ale również od wcześniej wypracowanych odsetek',
        'Stopą procentową, która maleje z każdym rokiem trwania inwestycji'
    ],
    explanation_pl = 'Gdy zyski są reinwestowane, zaczynają generować własne odsetki w kolejnych okresach, tworząc efekt kuli śnieżnej. W długim terminie wypracowane i dopisane odsetki mogą przewyższyć pierwotnie wpłacony kapitał.'
WHERE id = 47;

UPDATE duel_question
SET prompt_pl = 'Dlaczego eksperci finansowi zalecają zbudowanie poduszki finansowej przed rozpoczęciem inwestowania?',
    options_pl = ARRAY[
        'Ponieważ brokerzy odmawiają otwarcia konta osobom bez poduszki finansowej',
        'Ponieważ poduszka finansowa zawsze przynosi wyższy zysk niż akcje',
        'Ponieważ posiadanie poduszki finansowej zwalnia z działania inflacji',
        'Aby niespodziewane wydatki nie zmuszały do sprzedaży inwestycji w złym momencie ani zaciągania drogich kredytów'
    ],
    explanation_pl = 'Niespodziewana naprawa auta lub utrata pracy może zbiec się z dołkiem na giełdzie. Posiadanie bezpiecznej rezerwy płynnej gotówki chroni długoterminowe inwestycje przed koniecznością przedwczesnej sprzedaży ze stratą.'
WHERE id = 48;

UPDATE duel_question
SET prompt_pl = 'Inflacja wynosi 4% w skali roku, a konto oszczędnościowe jest oprocentowane na 2%. Co dzieje się z Twoją siłą nabywczą?',
    options_pl = ARRAY[
        'Tracisz w ciągu roku około 2% realnej siły nabywczej',
        'Zyskujesz 6% siły nabywczej',
        'Zyskujesz 2% siły nabywczej',
        'Twoja siła nabywcza pozostaje całkowicie bez zmian'
    ],
    explanation_pl = 'Ponieważ ceny rosną szybciej niż odsetki na koncie, realna stopa zwrotu jest ujemna (w uproszczeniu 2% - 4% = -2%). Choć nominalna kwota na koncie wzrosła, w rzeczywistości kupisz za nią mniej niż rok wcześniej.'
WHERE id = 49;

UPDATE duel_question
SET prompt_pl = 'Jakie cechy są najważniejsze dla poduszki finansowej (funduszu awaryjnego)?',
    options_pl = ARRAY[
        'Maksymalny potencjał wzrostu, nawet kosztem ogromnych wahań wartości',
        'Bezpieczeństwo kapitału oraz szybki, bezkosztowy dostęp do gotówki',
        'Zablokowanie środków na co najmniej pięć lat bez możliwości wcześniejszej wypłaty',
        'Skoncentrowanie całości w akcjach jednej dynamicznie rosnącej spółki'
    ],
    explanation_pl = 'Poduszka finansowa to zabezpieczenie na wypadek niespodziewanych sytuacji życiowych, dlatego środki muszą być dostępne natychmiast i nienarażone na załamania giełdowe. Płynność i bezpieczeństwo są tu ważniejsze niż wysoki zysk.'
WHERE id = 50;

UPDATE duel_question
SET prompt_pl = 'Do czego służy „reguła 72” w finansach?',
    options_pl = ARRAY[
        'Do wyliczenia dokładnej kwoty podatku należnego od dywidend',
        'Do określenia optymalnej liczby spółek wchodzących w skład indeksu',
        'Do szybkiego oszacowania liczby lat potrzebnych do podwojenia kapitału przy stałej stopie zwrotu',
        'Do pomiaru maksymalnego obsunięcia kapitału w funduszu obligacji'
    ],
    explanation_pl = 'Podzielenie liczby 72 przez roczną stopę zwrotu pozwala szybko oszacować czas podwojenia kapitału (np. 72 / 6% = ok. 12 lat). Działa to również odwrotnie – pokazuje, po ilu latach inflacja zmniejszy siłę nabywczą pieniądza o połowę.'
WHERE id = 51;

UPDATE duel_question
SET prompt_pl = 'Czym różni się stopa zwrotu nominalna od stopy zwrotu realnej?',
    options_pl = ARRAY[
        'Stopa nominalna jest przed opłatami, a stopa realna jest przed podatkami',
        'Stopa realna uwzględnia wyłącznie dywidendy, a stopa nominalna tylko zmiany cen',
        'Stopa nominalna jest wypłacana w walucie obcej, a realna w walucie krajowej',
        'Stopa nominalna to procentowy zysk na papierze, a stopa realna uwzględnia wpływ inflacji'
    ],
    explanation_pl = 'Stopa nominalna pokazuje liczbowy wzrost kapitału w danej walucie, a stopa realna informuje o rzeczywistym wzroście siły nabywczej. Uwzględnianie stopy realnej pozwala ocenić, czy inwestycja rzeczywiście buduje bogactwo ponad wzrost kosztów życia.'
WHERE id = 52;

UPDATE duel_question
SET prompt_pl = 'Dlaczego rozpoczęcie inwestowania 10 lat wcześniej daje często lepszy wynik niż wpłacanie większych kwot w późniejszym wieku?',
    options_pl = ARRAY[
        'Dodatkowe lata dają procentowi składanemu znacznie więcej czasu na wielokrotne pomnożenie wczesnego kapitału',
        'Giełdy rosną zawsze szybciej w przypadku portfeli osób młodszych',
        'Starsi inwestorzy płacą wyższe opłaty za zarządzanie w funduszach',
        'Procent składany przestaje działać po ukończeniu 40. roku życia'
    ],
    explanation_pl = 'Procent składany przyspiesza z biegiem lat, ponieważ zyski naliczają się od coraz większej bazy kapitałowej. Dodatkowa dekada pracy kapitału wykonuje ogromną pracę, którą bardzo trudno nadrobić samym zwiększeniem bieżących wpłat.'
WHERE id = 53;

UPDATE duel_question
SET prompt_pl = 'Jaka jest różnica między procentem prostym a procentem składanym w horyzoncie wielu lat?',
    options_pl = ARRAY[
        'Procent prosty jest wypłacany co miesiąc, a procent składany raz na dekadę',
        'Procent prosty naliczany jest wyłącznie od początkowego kapitału, a procent składany również od dopisanych odsetek',
        'Procent prosty przynosi w długim okresie zawsze większy kapitał niż procent składany',
        'Procent składany ma zastosowanie wyłącznie do kredytów hipotecznych, a nie do inwestycji'
    ],
    explanation_pl = 'Przy procencie prostym kwota odsetek w każdym okresie jest stała, bo zależy tylko od kapitału początkowego. Przy procencie składanym odsetki powiększają bazę, sprawiając, że krzywa wzrostu kapitału staje się coraz bardziej stroma.'
WHERE id = 54;

UPDATE duel_question
SET prompt_pl = 'Jak działa regularne inwestowanie stałych kwot (tzw. uśrednianie kosztów) przy zmiennych cenach rynkowych?',
    options_pl = ARRAY[
        'Gwarantuje zysk nawet wtedy, gdy aktywo trwale traci na wartości',
        'Kupuje dokładnie taką samą liczbę jednostek co miesiąc, bez względu na kurs',
        'Wpłacanie stałej kwoty pozwala nabyć więcej jednostek, gdy ceny spadają, i mniej, gdy rosną',
        'Automatycznie wstrzymuje zakupy za każdym razem, gdy rynki spadają'
    ],
    explanation_pl = 'Regularne zakupy za stałą kwotę uśredniają cenę nabycia – w dołkach kupujesz więcej tanich jednostek, a na szczytach mniej drogich. Pozwala to ograniczyć stres związany z trafianiem w idealny moment rynkowy.'
WHERE id = 55;

UPDATE duel_question
SET prompt_pl = 'Inwestycja zyskała +50% w pierwszym roku, a w drugim roku straciła -50%. Jaki jest łączny wynik po dwóch latach?',
    options_pl = ARRAY[
        '0% – wracasz dokładnie do kwoty początkowej',
        '# +25% – ponieważ zyski kumulują się szybciej niż straty',
        '-10% – z powodu rocznej inflacji',
        '-25% – ponieważ spadek o 50% dotyczy powiększonej bazy kapitałowej z pierwszego roku'
    ],
    explanation_pl = 'Zaczynając ze 100 zł, wzrost o 50% daje 150 zł. Następnie spadek o 50% ze 150 zł oznacza stratę 75 zł, czyli pozostaje 75 zł – co stanowi łączną stratę 25%. Średnia arytmetyczna bywa myląca, ponieważ kapitał pomnaża się geometrycznie.'
WHERE id = 56;

UPDATE duel_question
SET prompt_pl = 'Korzystając z dokładnego równania Fishera: jeśli stopa nominalna wynosi 10%, a inflacja 5%, to ile wynosi rzeczywista stopa realna?',
    options_pl = ARRAY[
        'Około 4,76% – nieco mniej niż prosta różnica 10% - 5%',
        'Zawsze dokładnie 5,00% w każdym przypadku',
        'Około 5,25% – nieco więcej niż prosta różnica 10% - 5%',
        'Około 15,00% – ponieważ inflacja dodaje się do wyniku'
    ],
    explanation_pl = 'Dokładna stopa realna wynosi (1 + 0,10) / (1 + 0,05) - 1 ≈ 4,76%, ponieważ inflacja zmniejsza również wartość samego wypracowanego zysku. Proste odejmowanie stóp jest wygodnym przybliżeniem, ale lekko zawyża rzeczywisty wynik realny.'
WHERE id = 57;

UPDATE duel_question
SET prompt_pl = 'Dlaczego średnia geometryczna stopa zwrotu jest zawsze mniejsza lub równa średniej arytmetycznej?',
    options_pl = ARRAY[
        'Ponieważ średnia geometryczna pomija wpływ dywidend',
        'Ponieważ zmienność wywołuje opór kapitałowy: straty zmniejszają bazę, od której naliczane są późniejsze zyski',
        'Ponieważ średnia arytmetyczna nie uwzględnia lat ze stratami',
        'Ponieważ średnią geometryczną liczy się wyłącznie dla obligacji'
    ],
    explanation_pl = 'Przy stałych wynikach obie średnie są równe, ale każde wahanie stóp zwrotu powiększa różnicę na niekorzyść średniej geometrycznej. Im większa zmienność, tym niższy rzeczywisty skumulowany zysk w porównaniu ze zwykłą średnią arytmetyczną.'
WHERE id = 58;

UPDATE duel_question
SET prompt_pl = 'Jeśli spłacisz zadłużenie na karcie kredytowej z oprocentowaniem 18% rocznie zamiast inwestować te środki, co to oznacza finansowo?',
    options_pl = ARRAY[
        'Osiągnięcie 0% zysku, ponieważ spłata długu nie tworzy aktywów',
        'Podjęcie ryzyka rynkowego odpowiadającego zmienności na poziomie 18%',
        'Uzyskanie gwarantowanej, wolnej od ryzyka i podatku stopy zwrotu 18% na spłaconej kwocie',
        'Natychmiastową utratę 18% siły nabywczej'
    ],
    explanation_pl = 'Każda spłacona złotówka długu oprocentowanego na 18% to pewna oszczędność 18 groszy rocznie bez podejmowania jakiegokolwiek ryzyka rynkowego. Mało która inwestycja jest w stanie pobić tak wysoki, pewny zysk netto.'
WHERE id = 59;

UPDATE duel_question
SET prompt_pl = 'Jak częstotliwość kapitalizacji odsetek wpływa na efektywną roczną stopę procentową (EAR) przy tej samej stopie nominalnej?',
    options_pl = ARRAY[
        'Częstsza kapitalizacja obniża efektywną roczną stopę procentową',
        'Częstotliwość kapitalizacji nie ma żadnego znaczenia matematycznego',
        'Miesięczna kapitalizacja podwaja roczną stopę procentową w porównaniu z roczną',
        'Częstsza kapitalizacja daje nieco wyższą efektywną stopę roczną, ponieważ dopisane odsetki szybciej same generują zysk'
    ],
    explanation_pl = 'Przykładowo nominalne 6% kapitalizowane co miesiąc daje w ujęciu rocznym efektywną stopę ok. 6,17%, a nie równe 6,00%. Porównywanie efektywnej stopy rocznej pozwala sprawiedliwie zestawić oferty o różnej częstotliwości dopisywania odsetek.'
WHERE id = 60;

UPDATE duel_question
SET prompt_pl = 'Rynki spadają o 15% w ciągu tygodnia, a Ty czujesz impuls, by natychmiast wszystko sprzedać. Jaki to błąd poznawczy?',
    options_pl = ARRAY[
        'Nadmierna pewność siebie (overconfidence)',
        'Awersja do straty (loss aversion)',
        'Zakotwiczenie (anchoring)',
        'Przywiązanie do rynku lokalnego (home bias)'
    ],
    explanation_pl = 'Ból związany ze stratą odczuwamy psychologicznie około dwa razy mocniej niż radość z takiego samego zysku, co skłania do panicznej ucieczki. Wyprzedaż pod wpływem emocji trwale materializuje straty, które z czasem mogłyby zostać odrobione.'
WHERE id = 61;

UPDATE duel_question
SET prompt_pl = 'Kupujesz akcje spółki tylko dlatego, że wszyscy w pracy bez przerwy o niej rozmawiają. Jaki to błąd poznawczy?',
    options_pl = ARRAY[
        'Nadmierna pewność siebie',
        'Pułapka utopionych kosztów',
        'Owczy pęd (zachowanie stadne)',
        'Efekt potwierdzenia'
    ],
    explanation_pl = 'Podążanie za tłumem daje złudne poczucie bezpieczeństwa. Ceny napędzane modą i szumem medialnym potrafią jednak runąć równie szybko, gdy uwaga tłumu przeniesie się gdzie indziej.'
WHERE id = 62;

UPDATE duel_question
SET prompt_pl = 'Czym jest zjawisko FOMO (Fear of Missing Out) w inwestowaniu?',
    options_pl = ARRAY[
        'Utrzymywaniem poduszki finansowej na rachunku bankowym',
        'Weryfikowaniem tabeli opłat funduszu przed zainwestowaniem',
        'Cierpliwym czekaniem na wyznaczony dzień comiesięcznej wpłaty',
        'Pochopnym kupowaniem gwałtownie drożejącego aktywa ze strachu, że omija Cię zysk, na którym inni się bogacą'
    ],
    explanation_pl = 'FOMO zmusza inwestorów do zakupów po silnych wzrostach, gdy wyceny są już wygórowane. Decyzje podejmowane pod presją emocji często kończą się kupowaniem na górce i bolesnymi stratami po wygaśnięciu mody.'
WHERE id = 63;

UPDATE duel_question
SET prompt_pl = 'Po dwóch udanych transakcjach inwestor dochodzi do wniosku, że bez trudu pokona rynek i rezygnuje z dywersyfikacji. Jaki to błąd poznawczy?',
    options_pl = ARRAY[
        'Nadmierna pewność siebie (overconfidence)',
        'Awersja do straty',
        'Przywiązanie do rynku lokalnego',
        'Błąd status quo'
    ],
    explanation_pl = 'Nadmierna pewność siebie sprawia, że chwilowe szczęście bierzemy za trwałe umiejętności i lekceważymy ryzyko. Badania pokazują, że zbyt pewni siebie inwestorzy dokonują za wielu transakcji i osiągają niższe stopy zwrotu.'
WHERE id = 64;

UPDATE duel_question
SET prompt_pl = 'Nie chcesz sprzedać przynoszącej straty spółki, dopóki jej kurs nie wróci dokładnie do ceny zakupu, ignorując jej pogarszające się perspektywy. Jaki to błąd?',
    options_pl = ARRAY[
        'Owczy pęd',
        'Zakotwiczenie (anchoring)',
        'Efekt świeżości',
        'Błąd przeżywalności'
    ],
    explanation_pl = 'Zakotwiczenie sprawia, że kurczowo trzymamy się przypadkowej liczby z przeszłości (np. ceny zakupu), choć rynek nie wie i nie dba o to, ile zapłaciliśmy. Decyzje inwestycyjne powinny wynikać z przyszłych perspektyw, a nie z sentymentu do dawnych cen.'
WHERE id = 65;

UPDATE duel_question
SET prompt_pl = 'Posiadasz akcje spółki i czytasz wyłącznie artykuły, które ją chwalą, a wszelkie ostrzeżenia ignorujesz jako nieważne. Jaki to błąd poznawczy?',
    options_pl = ARRAY[
        'Księgowanie mentalne',
        'Przywiązanie do rynku lokalnego',
        'Efekt potwierdzenia (confirmation bias)',
        'Awersja do straty'
    ],
    explanation_pl = 'Efekt potwierdzenia popycha nas do szukania informacji zgodnych z naszymi przekonaniami i odrzucania faktów z nimi sprzecznych. Świadome szukanie argumentów przeciwko własnej tezie pomaga zachować obiektywizm.'
WHERE id = 66;

UPDATE duel_question
SET prompt_pl = 'Dlaczego „efekt świeżości” (recency bias) jest niebezpieczny po kilku latach silnych wzrostów na giełdzie?',
    options_pl = ARRAY[
        'Sprawia, że inwestorzy zapominają hasła do konta maklerskiego',
        'Zmusza inwestorów do trzymania wszystkich środków w gotówce',
        'Obniża opłaty pobierane przez fundusze aktywne',
        'Wprowadza w błąd, sugerując, że niedawne wysokie zyski będą trwać bez końca i bez żadnych korekt'
    ],
    explanation_pl = 'Nasz umysł przypisuje największe znaczenie ostatnim wydarzeniom, uznając bieżący trend za coś trwałego. Zakładanie wiecznej hossy skłania do podejmowania nadmiernego ryzyka tuż przed nadejściem załamania rynku.'
WHERE id = 67;

UPDATE duel_question
SET prompt_pl = 'Czym jest „home bias” (przywiązanie do rynku rodzimego) w portfelu inwestora indywidualnego?',
    options_pl = ARRAY[
        'Lokowaniem nieproporcjonalnie dużej części kapitału w spółki krajowe tylko dlatego, że wydają się lepiej znane',
        'Inwestowaniem wyłącznie z komputera domowego zamiast z telefonu',
        'Całkowitym unikaniem inwestycji w spółki z sektora nieruchomości',
        'Trzymaniem wszystkich oszczędności na jednym koncie awaryjnym'
    ],
    explanation_pl = 'Znane marki z własnego podwórka wydają się bezpieczniejsze, nawet jeśli rodzimy rynek to zaledwie ułamek globalnej gospodarki. Taka koncentracja uzależnia zarówno dochody z pracy, jak i majątek inwestycyjny od sytuacji w jednym kraju.'
WHERE id = 68;

UPDATE duel_question
SET prompt_pl = 'Na czym polega „pułapka utopionych kosztów” (sunk cost fallacy) przy inwestycji, w którą już nie wierzysz?',
    options_pl = ARRAY[
        'Porównywaniu prowizji maklerskich przed złożeniem zlecenia',
        'Trzymaniu tracącej spółki tylko dlatego, że zainwestowało się w nią wcześniej dużo pieniędzy lub czasu',
        'Automatycznym odkładaniu określonej kwoty w każdym miesiącu',
        'Obliczaniu realnej stopy zwrotu po uwzględnieniu inflacji'
    ],
    explanation_pl = 'Utracone pieniądze przepadły bez względu na to, czy zamkniesz pozycję, czy nie – przeszłe koszty nie powinny decydować o przyszłości. Warto zadać sobie pytanie: „Czy mając dziś wolną gotówkę, kupiłbym to aktywo ponownie?”.'
WHERE id = 69;

UPDATE duel_question
SET prompt_pl = 'Dlaczego sprawdzanie stanu portfela kilkanaście razy dziennie może pogorszyć długoterminowe wyniki inwestycyjne?',
    options_pl = ARRAY[
        'Brokerzy pobierają opłatę za podgląd konta po przekroczeniu pięciu logowań dziennie',
        'Ciągłe sprawdzanie kursu obniża fundamentalną wartość przedsiębiorstw',
        'Ciągły widok krótkoterminowych wahań i spadków wywołuje stres oraz skłania do impulsywnych decyzji',
        'Częste logowanie automatycznie resetuje okres naliczania procentu składanego'
    ],
    explanation_pl = 'Codzienne ruchy cen to w dużej mierze szum informacyjny, a częsty widok spadków nieustannie pobudza awersję do straty. Rzadsze zaglądanie na konto ułatwia zachowanie spokoju i trzymanie się długofalowej strategii.'
WHERE id = 70;

UPDATE duel_question
SET prompt_pl = 'Czym jest „efekt dyspozycji” (disposition effect) obserwowany u inwestorów indywidualnych?',
    options_pl = ARRAY[
        'Corocznym rebalancingiem portfela w stałym, z góry ustalonym dniu',
        'Nabywaniem funduszy indeksowych wyłącznie w trakcie rynkowych spadków',
        'Trzymaniem obligacji w portfelu aż do terminu ich wykupu',
        'Zbyt szybką sprzedażą zyskownych pozycji, by poczuć satysfakcję, i kurczowym trzymaniem stratnych, by nie przyznać się do błędu'
    ],
    explanation_pl = 'Pod wpływem chęci uniknięcia żalu inwestorzy zbyt wcześnie realizują drobne zyski, a latami trzymają pozycje tracące z nadzieją na odbicie. Zwykle kończy się to przedwczesnym ucięciem zysków i portfelem pełnym słabych spółek.'
WHERE id = 71;

UPDATE duel_question
SET prompt_pl = 'Czym jest „księgowanie mentalne” (mental accounting) w finansach osobistych?',
    options_pl = ARRAY[
        'Nielogicznym traktowaniem pieniędzy w zależności od ich źródła – np. ryzykowaniem premią, przy jednoczesnym chronieniu pensji',
        'Prowadzeniem arkusza kalkulacyjnego do kontroli comiesięcznych wydatków domowych',
        'Dokładnym wyliczaniem podatku giełdowego przed złożeniem zeznania rocznego',
        'Porównywaniem dwóch funduszy na podstawie ich wskaźników kosztów'
    ],
    explanation_pl = 'Każda złotówka ma dokładnie taką samą wartość, niezależnie od tego, skąd pochodzi, jednak w umyśle dzielimy pieniądze na osobne szufladki. Traktowanie „łatwych” pieniędzy (np. premii czy wygranej) jak żetonów do gry prowadzi do podejmowania lekkomyślnego ryzyka.'
WHERE id = 72;

UPDATE duel_question
SET prompt_pl = 'Dlaczego „błąd przeżywalności” (survivorship bias) sprawia, że historyczne wyniki funduszy wyglądają na lepsze niż w rzeczywistości?',
    options_pl = ARRAY[
        'Ponieważ starsi inwestorzy żyją dłużej niż młodsi',
        'Ponieważ słabe fundusze są zamykane lub łączone i znikają z baz danych, pozostawiając głównie fundusze z dobrymi wynikami',
        'Ponieważ giełdy usuwają dane z najbardziej zyskownych lat',
        'Ponieważ w rankingach funduszy uwzględnia się wyłącznie obligacje'
    ],
    explanation_pl = 'Analizując fundusze działające na rynku od dekady, nie widzimy tych, które w tym czasie upadły lub zostały zlikwidowane z powodu fatalnych wyników. Przez to historyczne średnie wyglądają znacznie bardziej optymistycznie niż realne doświadczenia inwestorów.'
WHERE id = 73;

UPDATE duel_question
SET prompt_pl = 'Czym jest „błąd pewności wstecznej” (hindsight bias) po dużym krachu lub nagłym boomie rynkowym?',
    options_pl = ARRAY[
        'Analizowaniem minionych błędów w celu udoskonalenia własnych zasad inwestycyjnych',
        'Sprawdzaniem historycznych wskaźników inflacji przed przejściem na emeryturę',
        'Wmawianiem sobie po fakcie, że dane wydarzenie było z góry oczywiste, co buduje złudną pewność siebie na przyszłość',
        'Zestawianiem wyników funduszu z jego indeksem odniesienia'
    ],
    explanation_pl = 'Gdy wydarzenie już nastąpi, nasz umysł tworzy iluzję, że było ono łatwe do przewidzenia, zapominając o ówczesnej niepewności. Wiara, że „to było przecież oczywiste”, rodzi niebezpieczne przekonanie, że bez trudu przewidzimy kolejny zwrot na rynku.'
WHERE id = 74;

UPDATE duel_question
SET prompt_pl = 'Dlaczego spisane zasady inwestycyjne (np. strategia inwestycyjna lub plan regularnych wpłat) pomagają chronić się przed błędami psychologicznymi?',
    options_pl = ARRAY[
        'Ponieważ spisany plan prawnie zabrania rynkom giełdowym spadków',
        'Ponieważ brokerzy podwyższają oprocentowanie klientom, którzy wgrają swój plan',
        'Ponieważ sztywne zasady zwalniają z konieczności rozumienia ryzyka i opłat',
        'Ponieważ ustalenie zasad na chłodno ogranicza ryzyko podejmowania chaotycznych decyzji w chwilach paniki lub euforii'
    ],
    explanation_pl = 'Emocje zawężają racjonalne myślenie dokładnie wtedy, gdy stawka jest najwyższa. Z góry przyjęty, spisany plan działania (np. kiedy dopłacasz, kiedy rebalansujesz) działa jak pas bezpieczeństwa chroniący przed impulsywnymi błędami.'
WHERE id = 75;
