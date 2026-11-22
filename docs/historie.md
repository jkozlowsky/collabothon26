# Historie ze świata

> Koncept treści lekcji. Status: **propozycja do dyskusji**.
> Powiązane: [F4. Lekcje](F4-lekcje.md) (typy kroków, format JSON). Makieta ekranu głównego: globus z pinami.

## 1. Pomysł

Ekran główny to globus. Każdy pin to **historia jednej współczesnej osoby z jakiegoś miejsca na świecie**, a historia to ścieżka kilku krótkich lekcji („Lesson 3 of 6”). Uczymy na sytuacji, która spotyka konkretną osobę, i dajemy użytkownikowi podejmować za nią decyzje.

- **Tylko współczesne historie.** Bez historycznych wydarzeń w tle: uczymy finansów, nie historii.
- **Postać wymyślona, sytuacja prawdziwa.** Osoba jest fikcyjna, ale zjawisko, z którym się mierzy, naprawdę jest typowe dla tego miejsca.
- Różne pokolenia wynikają z samych historii: postacie mają różny wiek, etap życia i horyzont.

## 2. Test miasta

> **Jeśli po podmianie „Seul” na „Lyon” lekcja działa bez żadnej zmiany, to miasto jest tylko grafiką.**

Miasto daje lekcji trzy warstwy:

| Warstwa | Co to jest | Wymagane? |
|---|---|---|
| **1. Problem typowy dla miejsca** | Zjawisko finansowe, które naprawdę tam występuje i wokół którego zbudowana jest lekcja | **tak**, bez tego nie robimy pinu |
| **2. Lokalny detal** | Jedna karta „Słowo z …”, waluta z przeliczeniem na €, imię i wiek postaci | tak |
| **3. Wygląd** | Skórka ekranu (np. czat), kolory, ilustracja | tak |

Kroki z mechaniką (matematyka, wykresy, suwaki) są uniwersalne i tak ma być, bo to one uczą. Miasto nie musi być w każdym kroku; musi być powodem, dla którego ta lekcja istnieje.

## 3. Struktura historii i lekcji

Historia = 3–6 lekcji po 2–5 min. Pojedyncza lekcja ma zwykle ten przebieg:

| Etap | Co się dzieje | Kroki z F4 |
|---|---|---|
| Sytuacja | Postać i jej problem, najlepiej pokazane, nie opowiedziane (czat, rachunek, ekran aplikacji) | `text` (ze skórką) |
| Mechanizm | Użytkownik sam „dotyka” zjawiska: zgaduje, przesuwa suwaki, widzi wykres | `predict`, `slider-chart` |
| Lokalny detal | Karta „Słowo z …” | `text` |
| Rozpoznanie | Ćwiczenie na materiale z historii | `sort`, `match` |
| Decyzja | 2–3 wybory za postać → przeskok w czasie → skutek każdej decyzji | `scenario` |
| Utrwalenie | Jedno pytanie o mechanizm | `quiz` |
| „A u Ciebie?” | Ten sam mechanizm na danych użytkownika z banku (F1) | `action` |

## 4. Wzór: lekcja „Seul: czat, który zawsze wie”

**Postać:** Ji-woo, 27 lat, pracuje w biurze w Seulu, ma odłożone ₩10 mln (ok. 6 800 €).

**Warstwa 1 (dlaczego Seul):** w Korei popularne są **„leading rooms” (리딩방)**, płatne czaty z „pewnymi typami” na akcje, przed którymi regularnie ostrzega koreański nadzór finansowy. Drugie zjawisko to **영끌 (yeongkkeul)**, „wyciągnąć wszystko, łącznie z duszą”: pożyczyć ile się da, żeby zainwestować. To słowo spopularyzowały media w latach 2020–21, gdy masowo zaczęli inwestować młodzi Koreańczycy.

**Cel nauki:** po spadku trzeba więcej urosnąć, żeby wrócić; pożyczone pieniądze mnożą też straty; jak rozpoznać czerwone flagi w „pewnych typach”.

| # | Krok | Co widzi użytkownik | Warstwa |
|---|---|---|---|
| 1 | `text` (skórka czatu) | Wiadomości wpadają jedna po drugiej na grupowym czacie z pracy: „XYZ +40% w tydzień 🚀”, „kuzyn ma leading room, mówią że się podwoi” | 1, 3 |
| 2 | `predict` | „Akcja urosła 40%, w następnym tygodniu spada 40%. Gdzie jest Ji-woo?” Strzał suwakiem, odsłona: **−16%**, nie zero | — |
| 3 | `slider-chart` | Suwak „strata %”, wykres „ile trzeba urosnąć, żeby wrócić”. Cel: znajdź stratę, po której trzeba +100% (−50%) | — |
| 4 | `text` („Słowo z Seulu”) | Kolega proponuje 영끌: pożyczyć drugie tyle i dokupić | 1, 2 |
| 5 | `slider-chart` | Suwaki: ile pożyczonych pieniędzy i ruch ceny. Wykres: wynik na własnych pieniądzach i moment, w którym traci się więcej, niż się miało | — |
| 6 | `sort` | Wiadomości z czatu do koszyków „czerwona flaga” / „informacja”: „Gwarantowane x2 w miesiąc”, „Dołącz do płatnego VIP roomu”, „Firma podała wyższe przychody”, „Wszyscy kupują” | 1 |
| 7 | `scenario` | Decyzja Ji-woo: wszystko + pożyczka / mała kwota, którą może stracić / odpuszcza. Przeskok 6 miesięcy na stylizowanym wykresie „pompowania i zrzutu”, każda decyzja ma swoje zakończenie | 1 |
| 8 | `quiz` | „Dlaczego +40%, a potem −40% nie daje zera?” | — |
| 9 | `action` („A u Ciebie?”) | Z danych banku: „X% Twoich oszczędności jest w jednym miejscu”. Propozycja własnej zasady: „maksymalnie Y% w jeden zakład” | — |

Czas: ok. 4 min. Liczby: 1,4 × 0,6 = 0,84 → −16%; po −50% potrzeba +100%.

### Szkic JSON (fragment)

Format kroków jak w F4. Lekcja dostaje pole `story` i opcjonalną skórkę kroku.

```jsonc
{
  "id": 7,
  "story": "seoul",
  "title": "The chat that always knows",
  "steps": [
    { "type": "text", "id": "t1", "skin": "chat",
      "messages": [
        { "from": "Min-jun", "text": "XYZ +40% this week 🚀" },
        { "from": "Soo-ah", "text": "My cousin's leading room says it will double" }
      ] },
    { "type": "predict", "id": "p1",
      "prompt": "The stock rose 40%, then fell 40%. Where is Ji-woo?",
      "input": { "kind": "slider", "min": -50, "max": 50, "step": 1, "unit": "%" },
      "answer": -16,
      "reveal": "A 40% drop is taken from a bigger amount than the 40% rise was." },
    { "type": "sort", "id": "so1",
      "buckets": ["Red flag", "Information"],
      "items": [
        { "text": "Guaranteed 2x in a month", "bucket": 0 },
        { "text": "Join our paid VIP room", "bucket": 0 },
        { "text": "Everyone is buying", "bucket": 0 },
        { "text": "The company reported higher revenue", "bucket": 1 }
      ] }
  ]
}
```

## 5. Kandydaci na kolejne historie

Kolumna „Warstwa 1” to ocena testu z §2: czy zjawisko naprawdę jest typowe dla miejsca.

| Pin | Postać i sytuacja | Czego uczy | Warstwa 1 |
|---|---|---|---|
| **Seul** | Ji-woo i czat z „pewnymi typami” (wzór wyżej) | spadki i odrabianie strat, dźwignia, czerwone flagi | silna |
| **Berlin** | Ktoś trzyma wszystko na koncie oszczędnościowym, bo „bezpiecznie” | koszt niewykorzystanej szansy, inflacja vs. oprocentowanie | silna (Niemcy trzymają dużo w gotówce i na kontach) |
| **Buenos Aires** | Nauczycielka, której pensja co miesiąc kupuje mniej | inflacja, realna wartość pieniądza | silna |
| **Nairobi** | Sprzedawczyni z targu oszczędza przez telefon (M-Pesa) i w grupie oszczędnościowej (chama) | nawyk oszczędzania, poduszka finansowa *(pin „Saving on the go”)* | silna |
| **Mumbaj** | Rodzina od lat odkłada złoto na wesele córki | złoto vs. inne aktywa, długi horyzont *(pin „Why gold glitters”)* | silna |
| **Tokio** | Matka zaczyna inwestować przez nowe konto NISA: tylko japońskie firmy czy cały świat? | dywersyfikacja między krajami, konta z ulgą podatkową | silna (nowy NISA od 2024) |
| **São Paulo** | Lodówka „w 12 rat bez odsetek”, potem kolejne raty | prawdziwy koszt rat i kredytu | silna (kultura „parcelado”) |
| **Lagos** | Freelancerka dostaje pensję w dolarach, a lokalna waluta skacze | ryzyko walutowe | silna |
| **Manila** | Pracownik za granicą co miesiąc wysyła pieniądze rodzinie | opłaty za przelewy, budżet domowy | silna |
| **Frankfurt** | Ktoś kupuje swoją pierwszą akcję *(pin „Your first share”)* | jak działają akcje | słaba, do przemyślenia |
| **Lizbona** | Emeryt dostaje na Instagramie ofertę „10% miesięcznie, gwarantowane” | oszustwa, „za dobre, żeby było prawdziwe” | słaba (zjawisko globalne) |
| **Londyn** | Dwie osoby, te same wpłaty, inne opłaty, porównanie po 25 latach | opłaty, które też się składają | słaba |
| **Warszawa** | Programista ma połowę majątku w akcjach pracodawcy | koncentracja ryzyka | słaba |

Tematy ze słabą warstwą 1 są dobre, ale trzeba im znaleźć miasto, w którym to zjawisko jest naprawdę typowe, albo zrobić je jako lekcję w innej historii.

## 6. Zasady pisania

- **Zjawisko w tle sprawdzone** (czy naprawdę jest typowe, skala liczb). Gdzie upraszczamy dane: stopka „Simplified from real data.”
- **Postać nie jest karykaturą** ani stereotypem kraju; ma zwyczajny, konkretny problem.
- **Bez morału „trzeba było kupić X”.** Pokazujemy skutki i mechanizm, nie rekomendujemy produktu (MiFID II, F4 §5). Bez nazw prawdziwych akcji, funduszy i marek (np. komunikatora).
- **Krótko:** karta postaci max ~40 słów, wiadomość na czacie max 1 linijka.
- Pojęcia ze słownika w tekście jako `[[klucz]]` (F10).

## 7. Format danych historii

Historia grupuje lekcje i trzyma dane pinu na globusie. Lekcje mają format z F4.

```jsonc
{
  "id": "seoul",
  "city": "Seoul",
  "subtitle": "Hype & borrowed money",
  "pin": { "lat": 37.57, "lng": 126.98, "icon": "message-circle" },
  "character": { "name": "Ji-woo", "age": 27, "avatar": "jiwoo.png" },
  "currency": { "code": "KRW", "perEur": 1470 },  // do przeliczeń „≈ €”, kurs zaokrąglony
  "lessons": [7, 8, 9]
}
```

Backend: tabela `story` + `lesson.story_id` i `lesson.position` (nowa migracja Flyway). Szczegóły do ustalenia z topikiem C (globus, postęp na ścieżce).

## 8. Otwarte pytania

- [ ] Która historia jest misją na demo, zrobioną end to end? (Seul jest rozpisany; Berlin jest blisko jury z Commerzbanku.)
- [ ] Pin „Tulip mania” z makiety jest historyczny: podmienić na Seul?
- [ ] Ile historii na globusie na demo (1 pełna, reszta jako zablokowane/zaczęte piny)?
- [ ] Skąd ilustracje postaci (jeden styl dla wszystkich)?
- [ ] Język treści: EN czy PL/DE?
