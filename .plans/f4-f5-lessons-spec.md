# Spec: F4 Lekcje + F5 Warianty

> Wynik wywiadu z 2026-11-20. Uzupełnia i miejscami nadpisuje [`doc/F4-lekcje.md`](../doc/F4-lekcje.md), [`doc/F5-warianty.md`](../doc/F5-warianty.md), [`doc/historie.md`](../doc/historie.md).
> Gdzie dokumenty w `doc/` mówią co innego, **obowiązuje ten spec**.

## 1. Zakres

- **Treść:** współczesne historie ze świata (globus). Misje demo z pełną treścią: **Seul** (wzór w `doc/historie.md` §4) i **Berlin**, ewentualnie kolejne, jeśli zostanie czas. Pozostałe piny widoczne jako „Coming soon”.
- **Język:** angielski (UI, treść, wariant plain).
- **Platformy:** muszą działać **web i Android** (sposób demo jeszcze nieustalony). Każda interakcja gestem ma odpowiednik klikany.

## 2. Decyzje

| Temat | Decyzja |
|---|---|
| Gdzie żyje treść | Pliki JSON w repo, serwowane przez backend |
| Składanie wariantów | Backend |
| Persona (F5) | Zmienia **tylko** krok `action` („Your turn”); historia i postać są takie same dla wszystkich |
| Poziom (F5) | Zostaje jako nadpisania (beginner/advanced) |
| Plain language | Generowany offline przez LLM, przeglądany przez człowieka, commitowany do JSON; przełącznik „Aa” w lekcji |
| Dane do „Your turn” | Mockowane konta bankowe użytkowników; backend liczy **nazwane metryki** |
| Skutek w `scenario` | Zawsze ta sama, ustalona ścieżka na decyzję |
| Błędna odpowiedź | Styl Duolingo: idziesz dalej, błędne kroki wracają na końcu lekcji, aż do poprawnej odpowiedzi |
| XP | Stałe za ukończenie lekcji, niezależne od błędów |
| Wiedza w profilu | Per pojęcie (`concept`) |
| `slider-chart` | „Continue” aktywne dopiero po osiągnięciu celu; podpowiedź po ~20 s |
| Pojęcie `[[key]]` w tekście | Bottom sheet z definicją nad lekcją, link „More” do zakładki Glossary |
| Przerwanie lekcji | Lekcja zaczyna się od początku; stan tylko w pamięci |
| Odblokowanie | Wszystkie historie otwarte; lekcje w historii po kolei |
| Czat | Osobny typ kroku `chat` |
| `sort` | Swipe kart w lewo/prawo + przyciski (web, dostępność) |
| Cięcia przy braku czasu | Najpierw warianty level i persona; silnik i misje demo nienaruszone |

## 3. Treść w repo

```
back/src/main/resources/content/
  stories.json                 # lista historii (pin, postać, waluta, lessonIds, status)
  lessons/
    seoul-1.json
    berlin-1.json
  glossary.json                # opcjonalnie, jeśli F10 nie ma własnego źródła
```

- Backend wczytuje pliki przy starcie do pamięci. **Walidacja przy starcie (fail fast):** unikalne `id` kroków, warianty odwołują się tylko do istniejących `id`, znane typy kroków, metryki w `{…}` istnieją, `concept` istnieje w słowniku.
- Poprawka treści = edycja JSON + restart backendu. Bez migracji.
- Postęp, wyniki i wiedza są w Postgresie (migracja Flyway, §8).

## 4. Typy kroków

Wspólne pola każdego kroku: `type`, `id` (unikalne w lekcji), opcjonalnie `concepts: string[]`.

**Kroki oceniane** (wracają na końcu lekcji po błędzie): `quiz`, `match`, `sort`.
**Nieoceniane:** `text`, `chat`, `predict`, `slider-chart`, `scenario`, `action`.

| Typ | Pola | Zachowanie |
|---|---|---|
| `text` | `body` (Markdown-lite, `[[concept]]`), `title?`, `image?` | „Continue” |
| `chat` | `messages: [{from, text}]`, `title?` | Wiadomości pojawiają się kolejno ze wskaźnikiem „typing…”; tap przyspiesza; „Continue” po ostatniej |
| `quiz` | `prompt`, `options[]`, `correctIndex`, `explanation` | Natychmiastowy feedback + wyjaśnienie |
| `match` | `pairs: [[term, definition]]` | 3–5 par; błędna para miga na czerwono; przy powtórce kafelki przetasowane |
| `sort` | `buckets: [left, right]`, `items: [{text, bucket}]`, `explanation?` | Swipe karty w lewo/prawo albo przyciski pod kartą; feedback po każdej karcie; przy powtórce karty przetasowane |
| `predict` | `prompt`, `input: {kind:"slider", min, max, step, unit}`, `answer`, `reveal` | Strzał → animowane odsłonięcie odpowiedzi obok strzału + `reveal` |
| `slider-chart` | `prompt`, `model`, `params{…}`, `output`, `goal: {condition, hint}` | Wykres liczony we froncie z funkcji `model`; „Continue” po spełnieniu `goal`; `hint` po ~20 s |
| `scenario` | `prompt`, `choices: [{label, series: number[], ending}]`, `unit`, `periodLabel` | Wybór → animowany wykres ustalonej ścieżki tej decyzji + `ending`; pozostałe ścieżki pokazane wyszarzone dla porównania |
| `action` | `body` (z `{metric}`), `cta?` | „Your turn” na danych z konta; persona nadpisuje tylko ten krok |

- Modele dla `slider-chart` (np. `drawdownRecovery`, `leverage`, `inflationErosion`) to czyste funkcje TS we froncie, każda z jednym testem (np. strata −50% → wymagany wzrost +100%; +40% potem −40% → −16%).
- Wykresy `scenario` mają ustalone dane w JSON (kilkanaście punktów), bez losowości.
- Nieznany typ kroku → front pomija krok (walidacja backendu nie powinna do tego dopuścić).

## 5. Warianty (F5)

Lekcja w JSON: `steps` (baza, standard EN) + `variants`:

```jsonc
"variants": {
  "level:beginner":  { "s1": { "goal": { "hint": "Start at -50%." } } },
  "level:advanced":  { "s1": { "params": { "fees": { … } } } },
  "persona:student": { "a1": { "body": "Of your {savingsBalance}, {largestHoldingShare} sits in one place…" } },
  "persona:pre-retirement": { "a1": { "body": "…" } },
  "lang:plain":      { "t1": { "body": "…" }, "q1": { "prompt": "…" } }
}
```

- **Kolejność nakładania:** baza → `level:*` → `persona:*` → `lang:*` (później wygrywa).
- **Scalanie:** głębokie dla obiektów; **tablice zastępowane w całości**. Nadpisanie wskazuje krok po `id`.
- Persona nadpisuje wyłącznie kroki `action` (walidacja przy starcie).
- Warianty nie mogą zmieniać pól odpowiedzi: `correctIndex`, `answer`, `pairs`, `items[].bucket`, `model`, `series` (walidacja przy starcie).
- **Plain:** skrypt (offline) bierze bazową lekcję → LLM przepisuje tylko pola tekstowe → człowiek przegląda → commit do `variants["lang:plain"]`. Reguła dla LLM: nie dodawaj faktów, nie zmieniaj liczb, nie doradzaj.

## 6. API

| Metoda | Ścieżka | Opis |
|---|---|---|
| GET | `/api/stories` | Historie dla globusa: pin, postać, status (`available` / `coming-soon`), postęp użytkownika (ukończone lekcje) |
| GET | `/api/lessons/{id}?lang=standard\|plain` | Gotowa lekcja: warianty złożone dla użytkownika (level i persona z profilu, `lang` z parametru), metryki podstawione w `action` |
| POST | `/api/lessons/{id}/result` | Wynik lekcji (§7) |
| GET | `/api/glossary/{concept}` | Definicja do bottom sheetu (jeśli F10 nie dostarczy własnego endpointu) |

- Identyfikacja użytkownika (mockowane konto): według kontraktu kont z topiku B.
- Przełącznik „Aa” = ponowny `GET` z innym `lang`; front zachowuje bieżący indeks kroku.
- Lekcja zablokowana (poprzednia w historii nieukończona) → `403` z czytelnym komunikatem; UI i tak nie pozwala jej otworzyć.

### Metryki z konta

Backend ma zamkniętą listę nazwanych metryk liczonych z mockowanego konta. Pierwsza wersja (do uzgodnienia z kontraktem kont):

| Metryka | Znaczenie |
|---|---|
| `savingsBalance` | Saldo kont oszczędnościowych, sformatowane z walutą |
| `cashShare` | % majątku w gotówce / na kontach |
| `largestHoldingShare` | % majątku w największej pojedynczej pozycji |
| `monthlySurplus` | Średnia nadwyżka miesięczna (wpływy − wydatki) |

Brak danych do metryki → backend używa wariantu tekstu bez danych (pole `bodyNoData` w kroku `action`).

## 7. Przebieg lekcji i wynik

1. Front pobiera lekcję, idzie po krokach od 0.
2. Krok oceniany z błędem przy pierwszym podejściu → wyjaśnienie, dalej; krok trafia do kolejki powtórek.
3. Po ostatnim kroku: powtórki z kolejki (przetasowane), aż każda zostanie zaliczona.
4. Ekran końcowy: XP, pojęcia z lekcji (słabe zaznaczone), przycisk do następnej lekcji w historii.
5. `POST /result`:

```jsonc
{
  "steps": [ { "stepId": "q1", "correctFirstTry": false } ],
  "scenarioChoices": { "sc1": 0 },
  "lang": "standard"
}
```

Backend: zapisuje ukończenie (idempotentnie, XP tylko za pierwsze ukończenie), aktualizuje wiedzę per pojęcie: dla każdego pojęcia z kroków ocenianych licznik poprawnych przy pierwszym podejściu / wszystkich. Słabe pojęcia zasilają fiszki (F12) i rekomendacje (F6).

## 8. Backend: dane

Migracja Flyway `V<n>__lesson_progress.sql`:

- `lesson_completion(user_id, lesson_id, completed_at, xp)`, unikalne `(user_id, lesson_id)`
- `concept_knowledge(user_id, concept, correct, attempts)`, PK `(user_id, concept)`
- `scenario_choice(user_id, lesson_id, step_id, choice, created_at)` (pod F7)

Obecne tabele `lesson` i `question` (V2) przestają być źródłem treści; usunąć w tej samej migracji, gdy front przejdzie na nowe API.

## 9. Frontend

- `src/types/lessons.ts`: unia typów kroków po `type`.
- `src/app/lesson/[id].tsx`: player (indeks + kolejka powtórek, `switch (step.type)`).
- `src/components/steps/<Type>.tsx`: jeden plik na typ; każdy dostaje `step` i `onDone({ correct? })`.
- `src/lib/models.ts`: modele `slider-chart` + testy.
- Biblioteki: `react-native-svg` (wykresy, `npx expo install`), `@react-native-community/slider` (suwaki, `npx expo install`, sprawdzić web). Swipe: wbudowane `PanResponder` + `Animated`, bez nowej zależności. Bottom sheet: wbudowany `Modal`.
- UI zgodnie ze skillem `finance-quest-ui` (Figma jako źródło prawdy).

## 10. Dostępność

- Skalowanie czcionki systemowej, layout nie pęka przy 200%.
- Swipe ma przyciski; suwak ma `accessibilityLabel` i wartość z jednostką.
- Wykres zawsze z liczbą-podsumowaniem obok.
- Dobrze/źle nie tylko kolorem (ikona + tekst).
- Systemowe „ogranicz ruch” wyłącza animacje (`AccessibilityInfo.isReduceMotionEnabled`); czat wtedy pokazuje wszystkie wiadomości od razu.

## 11. Edukacja, nie doradztwo

Bez nazw prawdziwych akcji, funduszy i marek. Wykresy przyszłych wartości: „Illustration only.” Uproszczone dane: „Simplified from real data.” Krok `action` opisuje stan konta i mechanizm, nie mówi, co kupić.

## 12. Priorytety

1. **MUST:** player + `text`, `chat`, `quiz`, `match`, `sort`, `action`; powtórki błędów; `GET /api/stories`, `GET /api/lessons/{id}`, `POST /result`; lekcja Seul end to end na web i Androidzie.
2. **SHOULD:** `predict`, `slider-chart`, `scenario`; metryki z konta; bottom sheet słownika; `lang:plain` + „Aa”; lekcja Berlin.
3. **COULD (tnie się pierwsze):** warianty `level:*` i `persona:*`; kolejne historie.

## 13. Do zrobienia poza kodem

- [ ] Rozpisać lekcję Berlin w `doc/historie.md` według wzoru Seulu.
- [ ] Uzgodnić z topikiem B: kontrakt mockowanych kont i identyfikację użytkownika; listę metryk.
- [ ] Uzgodnić z topikiem C: `GET /api/stories` dla globusa, ekran końcowy, fiszki ze słabych pojęć.
- [ ] Zaktualizować `doc/F4-lekcje.md` i `doc/F5-warianty.md` (JSONB → pliki JSON, nowe typy `chat`/swipe, persona tylko w `action`, usunąć wzmiankę o historycznych historiach).
- [ ] Podmienić pin „Tulip mania” na makiecie.
