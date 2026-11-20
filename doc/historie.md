# Historie ze świata

> Koncept treści lekcji. Status: **propozycja do dyskusji**.
> Powiązane: [F4. Lekcje](F4-lekcje.md) (kroki, format JSON), makieta ekranu głównego: globus z pinami.

## 1. Pomysł

Ekran główny to globus. Każdy pin to **historia jednej osoby z jakiegoś miejsca na świecie**, a historia to ścieżka kilku krótkich lekcji („Lesson 3 of 6”). Nie uczymy pojęć w próżni: uczymy na tym, co spotkało konkretną osobę, i dajemy użytkownikowi podejmować za nią decyzje.

**Zasada: postać wymyślona, tło prawdziwe.** Osoba jest fikcyjna, ale miejsce, czas i to, co działo się z rynkiem, cenami czy bankiem, są zgodne z rzeczywistością. Historie są wiarygodne, a nie piszemy o prawdziwych ludziach.

**Mieszanka dwóch rodzajów:**
- **historyczne:** prawdziwe wydarzenie w tle (Amsterdam 1637, Tokio 1989);
- **współczesne:** codzienna sytuacja typowa dla miejsca (oszczędzanie przez telefon w Nairobi, inflacja w Buenos Aires).

Różne pokolenia wynikają same z historii: postacie mają różny wiek, etap życia i horyzont, a użytkownik wybiera te, które są mu bliskie (rekomendacje F6 mogą podpowiadać).

## 2. Struktura jednej historii

Historia = 3–6 lekcji po 2–5 min. Typowy przebieg (rozłożony na lekcje):

| Etap | Co się dzieje | Kroki z F4 |
|---|---|---|
| 1. Poznajesz postać | 2–3 karty: kim jest, ile ma, czego chce | `text` (z ilustracją) |
| 2. Mechanizm | Użytkownik sam „dotyka” zjawiska, które zaraz uderzy w postać | `predict`, `slider-chart`, `sort` |
| 3. Utrwalenie | Pojęcia z historii | `quiz`, `match` |
| 4. Decyzja | Sytuacja z życia postaci, 2–3 wybory | `scenario` |
| 5. Przeskok w czasie | Wykres pokazuje skutek wybranej decyzji (i pozostałych dla porównania) | `scenario` (odsłona) |
| 6. Zakończenie postaci | Co się z nią stało; bez „dobrze/źle”, tylko skutek i wyjaśnienie dlaczego | `text` |
| 7. „A u Ciebie?” | Ten sam mechanizm na danych użytkownika z banku (F1) | `action` |

Etap 7 to most między historią a życiem użytkownika: np. po historii z Buenos Aires: „Twoje 4 200 € na koncie: ile będą warte za 5 lat przy obecnej inflacji?”.

## 3. Szkice historii

| Pin | Rodzaj | Postać i sytuacja | Decyzja w `scenario` | Czego uczy |
|---|---|---|---|---|
| **Amsterdam 1637** | historyczna | Kupiec, któremu sąsiad oferuje cebulkę tulipana za cenę domu; ceny rosną od tygodni | kupić / poczekać / sprzedać to, co ma | bańki, hype, FOMO *(pin w makiecie: „Tulip mania”)* |
| **Frankfurt** | współczesna | Ktoś kupuje swoją pierwszą akcję | *do ustalenia* | jak działają akcje *(pin w makiecie: „Your first share”)* |
| **Mumbaj** | współczesna | Rodzina od lat odkłada złoto na wesele córki | złoto / lokata / mieszanka | złoto vs. inne aktywa, długi horyzont *(pin: „Why gold glitters”)* |
| **Nairobi** | współczesna | Sprzedawczyni z targu oszczędza przez telefon (M-Pesa) i w grupie oszczędnościowej (chama) | ile odkładać co tydzień, czy wypłacić na nagły wydatek | nawyk oszczędzania, poduszka finansowa *(pin: „Saving on the go”)* |
| **Buenos Aires** | współczesna | Nauczycielka, której pensja co miesiąc kupuje mniej | trzymać gotówkę / wydać od razu / szukać ochrony przed inflacją | inflacja, realna wartość pieniądza |
| **Tokio 1989** | historyczna | Pracownik biura wkłada wszystkie oszczędności w japońską giełdę na szczycie; indeks wraca do tego poziomu dopiero w 2024 | wszystko w Japonię / część za granicę / regularne wpłaty | dywersyfikacja między krajami, ryzyko jednego rynku |
| **Sztokholm 2000** | historyczna | Szwed wybiera fundusz do nowego systemu emerytalnego | domyślny tani / modny droższy | opłaty, siła domyślnego wyboru |
| **Reykjavik 2007** | historyczna | Student wpłaca oszczędności na konto z wyjątkowo wysokim oprocentowaniem w islandzkim banku | wpłacić wszystko / część / zostać przy swoim banku | ryzyko a zwrot, „za dobre, żeby było prawdziwe”, gwarancja depozytów |

## 4. Zasady pisania historii

- **Fakty w tle sprawdzone** (daty, skala zmian cen). Gdzie upraszczamy dane, piszemy to w stopce: „Simplified from real data.”
- **Postać nie jest karykaturą** ani stereotypem kraju; ma konkretny, zwyczajny problem.
- **Bez morału w stylu „trzeba było kupić X”.** Pokazujemy skutki i mechanizm, nie rekomendujemy produktu (MiFID II, F4 §5). Żadnych nazw konkretnych funduszy ani akcji.
- **Krótko:** karta postaci max ~40 słów, cała historia mieści się w 3–6 lekcjach po 2–5 min.
- Pojęcia ze słownika w tekście jako `[[klucz]]` (F10).

## 5. Format danych (szkic)

Historia grupuje lekcje i trzyma dane pinu na globusie. Lekcje mają format z F4 bez zmian.

```jsonc
{
  "id": "tokyo-1989",
  "title": "Tokyo, 1989",
  "subtitle": "One market, one basket",
  "kind": "historical",            // historical | contemporary
  "pin": { "lat": 35.68, "lng": 139.69, "icon": "trending-down" },
  "character": { "name": "Hiro", "age": 41, "avatar": "hiro.png" },
  "lessons": [7, 8, 9, 10]         // id lekcji w kolejności
}
```

Backend: tabela `story` + `lesson.story_id` i `lesson.position` (nowa migracja Flyway). Szczegóły do ustalenia z topikiem C (globus, postęp na ścieżce).

## 6. Otwarte pytania

- [ ] Która historia jest misją na demo, zrobioną end to end?
- [ ] Ile historii ma być na globusie na demo (pełna 1, reszta jako zablokowane/zaczęte piny)?
- [ ] Skąd ilustracje postaci (generowane, ikony, jeden styl dla wszystkich)?
- [ ] Język historii: EN czy PL/DE?
