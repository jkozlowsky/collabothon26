# F4. Lekcje: silnik i interaktywne kroki

> Rozwinięcie F4 z [`FEATURES.md`](../FEATURES.md). Status: **propozycja do dyskusji**.
> Powiązane: [F5. Warianty lekcji](F5-warianty.md).

## 1. Pomysł

Oprócz klasycznych kroków à la Duolingo (quiz, kafelki, tekst) lekcje mają **interaktywne kroki w stylu Brilliant.org**: czysty, przejrzysty ekran z jednym dużym elementem, którym użytkownik manipuluje (suwak, wykres, przeciąganie), i widzi efekt od razu. Najpierw eksperyment, potem nazwa pojęcia, na końcu utrwalenie quizem.

Co bierzemy z Brilliant:
- **jedna idea na ekran**, dużo powietrza, duży wizual w centrum;
- **zgadnij → sprawdź → wyjaśnij** zamiast „przeczytaj → odpowiedz”;
- wyjaśnienie przychodzi **po** interakcji, nie przed.

---

## 2. Typy kroków

Lekcja = lista kroków. Każdy krok ma `type`.

### 2.1 Klasyczne (MUST)

| Typ | Opis | Feedback |
|---|---|---|
| `text` | Krótki tekst (max ~60 słów) + opcjonalna ilustracja. Pojęcia ze słownika oznaczone `[[klucz]]` → klikalne (F10). | brak, przycisk „Dalej” |
| `quiz` | Pytanie jednokrotnego wyboru (to, co już mamy w `lesson/[id].tsx`). | dobrze/źle + wyjaśnienie |
| `match` | Łączenie kafelków pojęcie ↔ definicja (3–5 par). | para na zielono / czerwono |

### 2.2 Interaktywne w stylu Brilliant (SHOULD)

| Typ | Co widzi użytkownik |
|---|---|
| `slider-chart` | 1–3 suwaki + wykres, który zmienia się na żywo. Opcjonalny cel: „ustaw suwaki tak, żeby…”. |
| `predict` | Najpierw strzał (suwak lub wybór), potem animowane odsłonięcie prawdziwej wartości obok strzału. |
| `sort` | Ułóż elementy w kolejności albo rozłóż do koszyków. |
| `scenario` | Sytuacja + 2–3 decyzje → każda decyzja pokazuje swoją konsekwencję na wykresie. Bez „złej odpowiedzi” jak w quizie, pokazujemy skutki. Treść: decyzje postaci z [historii ze świata](historie.md). |

### 2.3 Zakończenie lekcji (SHOULD)

| Typ | Opis |
|---|---|
| `action` | „Pierwszy krok”: mały realny krok po lekcji (tekst + przycisk CTA, np. otwórz kalkulator / ustaw przypomnienie). Ostatni krok przed ekranem wyniku. |

### 2.4 Później (COULD)

`video`, `fill-blank`, `estimate` (wpisz liczbę), `compare` (dwa wykresy obok siebie).

### Zasady UX dla wszystkich kroków

- **Jedna idea na ekran.** Jeśli krok potrzebuje scrolla, to są dwa kroki.
- Duży element interaktywny w środku, tekst nad nim max 2 linijki, przycisk akcji na dole w zasięgu kciuka.
- Feedback natychmiast i zawsze z wyjaśnieniem *dlaczego*.
- Animacje krótkie (150–300 ms); bez nich wszystko nadal działa (dostępność, F5).
- Liczby zawsze z jednostką i formatowaniem lokalnym (`76 123 €`).

---

## 3. Format lekcji (kontrakt JSON)

> ⚠️ Wspólny kontrakt (patrz `AGENTS.md`). Zmiany ogłaszamy zespołowi.

Obecny model (`lesson` + `question`) obsługuje tylko quiz. Propozycja: **kroki jako JSONB w jednej kolumnie** `lesson.steps`. Nowy typ kroku = zmiana tylko we froncie, bez migracji.

Przykład na istniejącej lekcji „Compound interest” (tylko ilustracja formatu, nie wybór lekcji na demo):

```jsonc
{
  "id": 2,
  "emoji": "📈",
  "title": "Compound interest",
  "summary": "Why time is your best investor.",
  "xp": 70,
  "category": "investing",                 // do profilu wiedzy (F2/F6)
  "concepts": ["compound-interest"],       // klucze słownika F10
  "steps": [
    { "type": "predict", "id": "p1",
      "prompt": "You invest €10,000 once at 7% a year. What is it worth after 30 years?",
      "input": { "kind": "slider", "min": 10000, "max": 100000, "step": 1000, "unit": "€" },
      "answer": 76123,
      "reveal": "Growth on growth is hard to imagine." },

    { "type": "slider-chart", "id": "s1",
      "prompt": "Change the parameters. What moves the curve the most?",
      "model": "compound",                 // nazwa funkcji liczącej we froncie
      "params": {
        "monthly": { "label": "Monthly", "min": 0, "max": 500, "step": 25, "value": 100, "unit": "€" },
        "rate":    { "label": "Return",  "min": 0, "max": 10,  "step": 0.5, "value": 6, "unit": "%" },
        "years":   { "label": "Years",   "min": 1, "max": 40,  "step": 1,  "value": 10 }
      } },

    { "type": "text", "id": "t1",
      "body": "That curve is [[compound-interest]]: you earn returns on your returns." },

    { "type": "quiz", "id": "q1",
      "prompt": "What increases the effect of compound interest the most?",
      "options": ["A long investment horizon", "Withdrawing profits often", "Keeping cash at home"],
      "correctIndex": 0,
      "explanation": "The longer interest earns interest, the faster your capital grows." },

    { "type": "match", "id": "m1",
      "pairs": [["Return", "What your money earns per year"],
                ["Horizon", "How long you stay invested"],
                ["Principal", "The money you put in"]] },

    { "type": "scenario", "id": "sc1",
      "prompt": "TODO: situation",
      "choices": [ { "label": "TODO", "series": "a" }, { "label": "TODO", "series": "b" } ],
      "data": "TODO",                      // szereg/model we froncie, liczy skutek każdej decyzji
      "takeaway": "TODO" },

    { "type": "action", "id": "a1",
      "body": "See what €50/month would be worth by your 60th birthday.",
      "cta": "Open calculator" }
  ]
}
```

Reguły:
- `id` kroku unikalne w lekcji → po nim zapisujemy odpowiedzi i nakładamy warianty (F5).
- **Modele obliczeń (`compound`, …) żyją we froncie** jako czyste funkcje TS. JSON wybiera model i parametry, nie zawiera kodu.
- Nieznany `type` → front pomija krok.

### Backend

- Migracja `V3__lesson_steps.sql`: `ALTER TABLE lesson ADD COLUMN steps JSONB` + przeniesienie istniejących pytań do `steps` jako kroki `quiz`. Tabela `question` do usunięcia, gdy front przejdzie na `steps`.
- `GET /api/lessons/{id}` zwraca `steps` jak są w bazie (backend nie zna typów kroków).
- `POST /api/lessons/{id}/result`: `{ correct, total, answers: { stepId: … } }` → XP + aktualizacja wiedzy w profilu. Kształt profilu ustalamy z topikiem B/C.

### Frontend

- `src/types/lessons.ts`: unia `Step = TextStep | QuizStep | MatchStep | …` po polu `type`.
- `src/app/lesson/[id].tsx`: player = indeks kroku + `switch (step.type)`. Każdy komponent kroku dostaje `step` i `onDone(result)`.
- `src/components/steps/`: jeden plik na typ kroku.
- `src/lib/models.ts`: funkcje liczące + jeden test na model (np. 10 000 € · 7% · 30 lat ≈ 76 123 €).
- Wykresy: `react-native-svg` (`npx expo install`, działa w Expo Go i na webie) + własny prosty `LineChart`. Bez ciężkich bibliotek wykresów.
- Suwak: `@react-native-community/slider` (`npx expo install`). `sort` na start przez tap/↑↓, drag & drop jeśli zostanie czas.

---

## 4. Definicja „gotowe” (DoD)

- [ ] Player obsługuje `text`, `quiz`, `match` (MUST)
- [ ] Player obsługuje `predict`, `slider-chart`, `sort`, `scenario`, `action` (SHOULD)
- [ ] Lekcja demo przechodzi end to end na Androidzie i webie
- [ ] Feedback po każdej odpowiedzi z wyjaśnieniem
- [ ] Wynik lekcji wysyłany do backendu, XP widoczne w profilu
- [ ] `npm run check` przechodzi

## 5. Edukacja, nie doradztwo (MiFID II)

- Wykresy z przyszłymi wartościami: „Illustration only. Past returns don't guarantee future returns.”
- Bez nazw konkretnych funduszy/akcji.

## 6. Otwarte pytania

- [ ] **Temat misji na demo.** Uwaga: krach −20% (sell/hold/buy), confidence meter i przełączanie persony na scenie wychodzą z każdego czystego promptu do Claude'a, więc zakładamy, że inne zespoły je mają.
- [ ] **Treść kroku `scenario`**: patrz [`historie.md`](historie.md).
- [ ] Język treści: EN (jak obecne dane) czy PL/DE?
