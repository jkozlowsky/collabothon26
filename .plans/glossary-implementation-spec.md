# Słownik (Glossary): specyfikacja implementacji

Zakres: zakładka **Glossary** w aplikacji Finance Quest (feature F10 z `FEATURES.md`), zgodnie z makietami w Figmie
(plik "Finance Quest — Globe Learn Screen", sekcja "Glossary · Browse · Search · Definition (F10)").
Kod, komentarze i commity po angielsku, treść aplikacji po angielsku.

---

## 1. Podjęte decyzje

| Temat | Decyzja | Dlaczego |
|---|---|---|
| Źródło haseł | Backend + Postgres (Flyway), endpointy REST | Tak samo jak lekcje; jury ocenia "jak to zaimplementowano"; treść bez wydawania nowej wersji appki |
| Linki w definicji | Znaczniki w tekście: `[[slug\|widoczny tekst]]` | Jeden tekst do edycji, ten sam parser posłuży później w lekcjach |
| Ulubione | Backend, per użytkownik (`/api/users/{userId}/glossary/favorites`) | Spójne z profilem, przetrwa przeinstalowanie, baza pod późniejsze fiszki |
| Karta "On your account" | **Pominięta w v1.** Układ zostawia na nią miejsce | Brak danych bankowych w backendzie; ryzyko dla terminu |
| Wyszukiwanie | **Na serwerze**, Postgres + `pg_trgm` (tolerancja literówek), `aliases` jako synonimy | Wybór użytkownika; "ładna" historia techniczna dla jury |
| Treść | Angielski, ~16 haseł, 5 kategorii; część kompletna (przykład + grafika + powiązania), część uboższa | Realny koszt contentu |
| Popup w lekcji | **Poza zakresem.** Parser i komponent definicji pisane tak, żeby dało się go użyć w lekcjach później | Ekran lekcji należy do innej osoby |
| Grafiki | Rysowane w kodzie (`react-native-svg`) | Ostre, kolory z tokenów, dane z liczb |
| Zasilanie bazy | **Migracje V15 (schemat) i V16 (dane)**, po zmianie treści lokalnie `make db-reset` | Wybór użytkownika; aplikacja nie jest nigdzie wdrażana, więc baza jest za każdym razem czyszczona. Odstępstwo od reguły README ("nie edytujemy wypchniętej migracji"), zaakceptowane świadomie |
| Puste kategorie | Backend zwraca tylko kategorie, które mają hasła | Nic nie jest puste na demo |
| Praca w zespole | Gałąź `feature/glossary`, merge przez PR | Zabezpiecza demo przed zepsutym `main` |

---

## 2. Co użytkownik widzi (ekrany)

Wszystkie ekrany zachowują layout z Figmy. Przed pisaniem UI użyć skilla `finance-quest-ui` i tokenów z `front/src/constants/theme.ts`.

1. **Browse** (`/glossary`): nagłówek, pole wyszukiwania, chipy kategorii (`All`, kategorie, `Saved · N`), lista kategorii. Każda kategoria to **zwijany** nagłówek (okrągła strzałka, licznik haseł) i karta z wierszami haseł. Domyślnie rozwinięta jest pierwsza kategoria, reszta zwinięta. Stan zwinięcia trzymany w pamięci ekranu (nie zapisujemy go).
2. **Search** (ten sam ekran, po wpisaniu tekstu): zamiast chipów i listy kategorii pokazujemy licznik wyników, karty wyników z **podświetloną frazą** w nazwie hasła oraz sekcję "Mentioned in other definitions" (hasła, w których definicji występuje fraza).
3. **No results**: gdy brak trafień, tekst "No terms match your search", karta "Did you mean" z najbliższym hasłem (podobieństwo trigramowe) i chipy "Browse by category". Bez propozycji zapytania do asystenta.
4. **Definition** (`/glossary/[slug]`): przycisk wstecz, pigułka kategorii, gwiazdka ulubionych, okruszki, tytuł i pełna nazwa, karta definicji z klikalnymi linkami, opcjonalna grafika, karta "Example", "Related terms", opcjonalna karta "Practise it" (link do lekcji), stopka "Educational content, not investment advice."
5. **Saved** (ten sam ekran Browse z aktywnym chipem `Saved`): zapisane hasła pogrupowane w swoich kategoriach; pusty stan "No saved terms yet. Tap the star on any definition."

Wszystkie stany ładowania i błędu przez istniejący `AsyncContent`.

---

## 3. Baza danych: migracja `V15__glossary.sql`

Plik: `back/src/main/resources/db/migration/V15__glossary.sql` (schemat), dane w `V16__glossary_content.sql`. Hibernate działa z `ddl-auto=validate`, więc encje muszą dokładnie pasować do tabel.

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;          -- fuzzy search; docker-compose user is a superuser

CREATE TABLE glossary_category (
    id       BIGSERIAL PRIMARY KEY,
    slug     VARCHAR(40) NOT NULL UNIQUE,         -- 'basics', 'investing', ...
    name     VARCHAR(60) NOT NULL,
    position INT         NOT NULL
);

CREATE TABLE glossary_term (
    id                  BIGSERIAL PRIMARY KEY,
    slug                VARCHAR(60)  NOT NULL UNIQUE,   -- 'etf', 'compound-interest'
    name                VARCHAR(80)  NOT NULL,          -- 'ETF'
    full_name           VARCHAR(120),                   -- 'Exchange-traded fund' (subtitle, optional)
    category_id         BIGINT       NOT NULL REFERENCES glossary_category (id),
    position            INT          NOT NULL,          -- order inside the category
    short_description   VARCHAR(160) NOT NULL,          -- one line shown in lists
    definition_standard TEXT         NOT NULL,          -- markup: see section 4
    example             TEXT,
    aliases             TEXT[]       NOT NULL DEFAULT '{}',   -- synonyms searched as well
    graphic_key         VARCHAR(40)                     -- which SVG graphic to draw, NULL = none
);
CREATE INDEX glossary_term_name_trgm ON glossary_term USING gin (name gin_trgm_ops);

CREATE TABLE glossary_related (                       -- the "Related terms" chips
    term_id         BIGINT NOT NULL REFERENCES glossary_term (id) ON DELETE CASCADE,
    related_term_id BIGINT NOT NULL REFERENCES glossary_term (id) ON DELETE CASCADE,
    position        INT    NOT NULL,
    PRIMARY KEY (term_id, related_term_id)
);

CREATE TABLE glossary_favorite (
    user_id    VARCHAR(64) NOT NULL,                  -- bank customer id, like user_profile.user_id
    term_id    BIGINT      NOT NULL REFERENCES glossary_term (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, term_id)
);
```

Numer V5 jest wolny na wszystkich gałęziach zdalnych (sprawdzone). Przed otwarciem PR sprawdzić `origin/main`, czy ktoś inny go nie zajął.

---

## 4. Format definicji (znaczniki linków)

Definicja to zwykły tekst. Fragment będący linkiem do innego hasła zapisujemy jako `[[slug|widoczny tekst]]`:

```
An ETF is a basket of many [[stock|stocks]] and [[bond|bonds]] that you buy as one share.
Spreading money across many of them is called [[diversification|diversification]].
```

Parser `front/src/lib/glossaryMarkup.ts`:

```ts
export type Segment = { type: 'text'; value: string } | { type: 'link'; slug: string; label: string };
export function parseDefinition(text: string): Segment[];
```

Zasady parsera:
- Znacznik niepoprawny (brak `]]`, pusty slug) zostaje zwykłym tekstem (nigdy nie rzuca wyjątku).
- `[[slug]]` bez `|` pokazuje slug jako tekst.
- Czysta funkcja, bez zależności od Reacta, w pełni testowalna.

Backend nie interpretuje znaczników, tylko je przekazuje. **Test integralności danych** (patrz 8) sprawdza, że każdy slug użyty w znacznikach istnieje w bazie, żeby żaden link nie prowadził w próżnię.

---

## 5. API backendu

Pakiet `com.collabothon.back.glossary`, w stylu istniejących pakietów `lesson` i `profile`: encje JPA, repozytoria, kontrolery z DTO jako `record`. Klasy kontrolerów i rekordy package-private jak w `UserProfileController`.

### 5.1 Lista (Browse)
`GET /api/glossary` → kategorie z hasłami (tylko kategorie niepuste, w kolejności `position`):
```json
[{ "slug": "investing", "name": "Investing",
   "terms": [{ "slug": "etf", "name": "ETF", "shortDescription": "A basket of many investments bought as one" }] }]
```
Pobierane raz na wejście do zakładki. Front buduje z tego też mapę `slug → name` (potrzebną do okruszków i do widoku Saved).

### 5.2 Szczegóły hasła
`GET /api/glossary/terms/{slug}` → 404, gdy slug nie istnieje:
```json
{ "slug": "etf", "name": "ETF", "fullName": "Exchange-traded fund",
  "category": { "slug": "investing", "name": "Investing" },
  "definitionStandard": "...[[stock|stocks]]...",
  "example": "... lub null", "graphicKey": "diversification | null",
  "related": [{ "slug": "stock", "name": "Stock" }] }
```

### 5.3 Wyszukiwanie
`GET /api/glossary/search?q=div` (q: 1 do 64 znaków, w przeciwnym razie 400). Odpowiedź:
```json
{ "terms":       [{ "slug": "dividend", "name": "Dividend", "category": {...}, "shortDescription": "..." }],
  "mentions":    [{ "slug": "stock", "name": "Stock", "snippet": "…some companies share profit as a dividend…" }],
  "suggestions": [{ "slug": "dividend", "name": "Dividend" }] }
```
- `terms`: nazwa zaczyna się od `q` (priorytet), potem nazwa zawiera `q`, potem alias zawiera `q`. Sortowanie: dopasowanie na początku, potem alfabetycznie. Limit 20.
- `mentions`: hasła, których definicja zawiera `q` jako słowo, a które nie są w `terms`. Snippet to krótki wycinek wokół trafienia (wycinany po stronie serwera, bez znaczników `[[ ]]`). Limit 5.
- `suggestions`: wypełniane **tylko gdy `terms` jest puste**; hasła o `similarity(lower(name), lower(q)) > 0.3`, max 3 (to obsługuje literówki, np. "divdend" → Dividend).
- Znaki specjalne `%`, `_`, `\` w `q` **muszą być zescapowane** przed użyciem w `LIKE`/`ILIKE` (inaczej wpisanie `%` zwróci wszystko).
- Wyniki zwracamy w jednej odpowiedzi; podświetlenie dopasowania liczy front (`indexOf` bez rozróżniania wielkości liter).

### 5.4 Ulubione
- `GET /api/users/{userId}/glossary/favorites` → `["etf","stock"]` (tablica slugów)
- `PUT /api/users/{userId}/glossary/favorites/{slug}` → 204, idempotentne; 404, gdy slug nie istnieje
- `DELETE /api/users/{userId}/glossary/favorites/{slug}` → 204, idempotentne

Walidacja `userId` jak w profilu (niepusty, max 64 znaki). Front liczy filtr "Saved" i licznik lokalnie z listy z 5.1 plus tablicy slugów, więc nie potrzeba osobnego endpointu z danymi haseł.

Kontrakty (kształt JSON) odzwierciedlamy w `front/src/types/glossary.ts` z komentarzem wskazującym kontroler, jak robi to `types/lessons.ts`. Zgodnie z AGENTS.md: wspólne kontrakty zmieniamy świadomie i informujemy zespół.

---

## 6. Frontend

### 6.1 Struktura plików (nowe)

Trasa `glossary` zamienia się z pliku w folder (Expo Router):
```
front/src/app/(tabs)/glossary/_layout.tsx     Stack bez nagłówka + GlossaryProvider
front/src/app/(tabs)/glossary/index.tsx       Browse / Search / Saved
front/src/app/(tabs)/glossary/[slug].tsx      Definition
front/src/types/glossary.ts
front/src/lib/glossaryMarkup.ts               parser znaczników
front/src/lib/fuzzy.ts                        tylko jeśli potrzebny po stronie frontu (podświetlanie); domyślnie nie
front/src/hooks/useGlossary.tsx               kontekst: lista, mapa slug→name, ulubione
front/src/hooks/useGlossarySearch.ts          debounce + zapytanie
front/src/components/glossary/*               SearchField, CategoryChips, CategorySection, TermRow,
                                              DefinitionText, Breadcrumb, FavoriteButton,
                                              ExampleCard, RelatedChips, PractiseCard, SearchResultCard
front/src/components/glossary/graphics/*      CompoundGrowthChart, DiversificationBasket, InflationPower
                                              + rejestr graphicKey → komponent
```
Przed napisaniem kodu dotykającego Expo / Expo Router zgodnie z `front/AGENTS.md` sprawdzić wersjonowane dokumentacje (`expo ~58`), bo API zmieniają się między wersjami. Po zmianie trasy na folder zweryfikować, że `(tabs)/_layout.tsx` nadal poprawnie wiąże zakładkę `glossary` (nazwa folderu).

### 6.2 Dane i stan
- `GlossaryProvider` (w `_layout.tsx` folderu) pobiera: listę (5.1) i ulubione (5.4). Udostępnia: `categories`, `nameBySlug`, `favorites` (Set), `toggleFavorite(slug)`.
- `toggleFavorite` robi **aktualizację optymistyczną** (gwiazdka zmienia się od razu), a przy błędzie sieci cofa zmianę i pokazuje krótki komunikat.
- Hook `useApi` obsługuje tylko GET. Mutacje wołają `api()` bezpośrednio (`PUT`, `DELETE`).
- Stała `USER_ID` jak w `useOnboarding` (demo: `demo-user`).

### 6.3 Wyszukiwanie
- `useGlossarySearch(q)`: debounce ~250 ms, minimum 1 znak po przycięciu, **zignorowanie spóźnionych odpowiedzi** (jeśli użytkownik wpisał kolejną literę, wynik poprzedniego zapytania nie może nadpisać nowego). Użyć `AbortController` albo znacznika "ostatnie zapytanie wygrywa".
- Pusty tekst = wracamy do widoku Browse bez zapytania.
- Błąd sieci w trakcie wyszukiwania pokazuje komunikat w miejscu wyników z przyciskiem "Try again", nie zastępuje całego ekranu.
- `keyboardShouldPersistTaps="handled"` na liście, żeby pierwsze dotknięcie wyniku od razu go otwierało, a nie tylko chowało klawiaturę.

### 6.4 Nawigacja i okruszki
- Każdy link w definicji **dodaje nowy ekran** na stos: `router.push({ pathname: '/glossary/[slug]', params: { slug, trail } })`. Natywny gest/przycisk wstecz wraca wtedy do poprzedniego hasła (zachowuje kontekst).
- Expo Router nie udostępnia historii, więc ścieżkę przekazujemy parametrem `trail` (slugi oddzielone przecinkiem, **bez bieżącego hasła**). Nazwy do okruszków bierzemy z `nameBySlug`.
- Okruszki: `Glossary › Stock › ETF`. Gdy elementów jest więcej niż 3, skracamy do `… › Przedostatni › Bieżące`. Dotknięcie okruszka wraca o odpowiednią liczbę ekranów (`router.dismiss(n)` lub `dismissTo`; **zweryfikować w dokumentacji Expo Router 58**). Dotknięcie "Glossary" wraca do listy.
- Strzałka wstecz w nagłówku = `router.back()`.
- Wejście bezpośrednie na `/glossary/etf` (bez `trail`) pokazuje `Glossary › ETF`.
- Nieznany slug (404 z backendu): komunikat "This term does not exist" i przycisk powrotu.

### 6.5 Ekran Definition
- Treść: `definitionStandard`.
- `DefinitionText`: zagnieżdżone `<Text>` z `onPress` dla linków (podkreślone, kolor `globeOceanLight`, `fonts.semiBold`, `accessibilityRole="link"`). Czytelne też dla czytników ekranu.
- Grafika: jeśli `graphicKey != null`, renderuje komponent z rejestru; nieznany klucz = brak grafiki (nigdy crash).
- Karta "Practise it": **nie w v1.** Powiązanie hasła z lekcją (`lesson_id`) usunięte przy merge'u z main: tabela `lesson` z `V2__lessons.sql` zniknęła w V5, lekcje są teraz plikami JSON z id typu `berlin-1`.
- Karta "On your account": **nie implementujemy w v1**, ale w układzie zostaje miejsce (zakomentowana sekcja z odnośnikiem do tego dokumentu).
- Stopka "Educational content, not investment advice." zawsze widoczna.

### 6.6 Dostępność i zachowanie na różnych platformach
- Obszary dotyku min. 44 × 44 px (gwiazdka, strzałka w nagłówku kategorii, chipy).
- Gwiazdka: `accessibilityRole="button"`, `accessibilityLabel` "Save term" / "Remove from saved", `accessibilityState={{ selected }}`.
- Zwijanie kategorii: `accessibilityState={{ expanded }}`.
- Aplikacja działa też na webie (`react-native-web`): bez API dostępnych tylko natywnie. Haptyka (`expo-haptics`) tylko na urządzeniach (sprawdzić `Platform.OS`).

---

## 7. Zakres treści (~16 haseł, 5 kategorii)

Szkic merytoryczny przygotowuje Claude (ze znacznikami linków i przykładami). **Zespół weryfikuje fakty** i dba, żeby sformułowania opisywały pojęcia, a nie radziły co kupić (MiFID II).

| Kategoria | Hasła | Kompletne (przykład + grafika + powiązania) |
|---|---|---|
| Basics | Inflation, Interest rate, Compound interest, Budget | Inflation, Compound interest |
| Investing | Stock, ETF, Dividend, Diversification, Bond, Index | ETF, Diversification |
| Saving | Emergency fund, Savings rate | Emergency fund |
| Credit & debt | APR, Credit score | — |
| Risk | Volatility, Risk tolerance | — |

- Hasła "kompletne": `example`, `related`, `graphic_key`.
- Grafiki: `compound-growth` (słupki "€ 1,000 at 5%": Today / 10 / 20 / 30 yrs), `diversification` (jeden koszyk kontra wiele), `inflation-power` (malejąca siła nabywcza).
- Pozostałe hasła: `definition_standard` + `short_description` + `related`, bez grafiki.
- Każde hasło ma 0 do 3 aliasów (synonimy do wyszukiwarki, np. Dividend: `payout`; Emergency fund: `rainy day fund`).

---

## 8. Testy

**Backend** (wzór: `LessonControllerTests`, Testcontainers):
- lista zwraca kategorie w kolejności, bez pustych;
- szczegóły: 200 dla istniejącego, 404 dla nieistniejącego slugu;
- wyszukiwanie: prefiks (`div` → Dividend, Diversification), alias, trafienie w definicji (`mentions`), literówka (`divdend` → `suggestions` zawiera Dividend), `q` ze znakiem `%` nie zwraca wszystkiego, `q` pusty lub za długi = 400;
- ulubione: PUT dwa razy = nadal jedno, DELETE nieistniejącego = 204, nieznany slug = 404;
- **test integralności danych**: każdy `[[slug|...]]` w `definition_standard` wskazuje istniejące hasło; każde hasło ma kategorię; `graphic_key` należy do znanego zbioru.

**Frontend** (Jest + Testing Library, wzór: `lessons.test.tsx`, mock `fetch`):
- `parseDefinition`: zwykły tekst, jeden link, wiele linków, niedomknięty znacznik, pusty slug, `[[slug]]` bez etykiety;
- ekran Browse: kategoria zwija się i rozwija; pierwsza jest rozwinięta;
- wyszukiwanie: wpisanie tekstu pokazuje wyniki z podświetleniem, brak wyników pokazuje "Did you mean";
- ulubione: dotknięcie gwiazdki zmienia stan od razu, błąd sieci go cofa;
- okruszki: skracają się przy więcej niż 3 poziomach.

Przed ogłoszeniem pracy za skończoną: `npx expo lint`, `npx tsc --noEmit`, testy frontu i backendu.

---

## 9. Kolejność prac (demo-first)

Każdy etap kończy się czymś, co da się pokazać. Jeśli zabraknie czasu, tniemy od końca.

1. **Baza i lista:** `V15`/`V16` z kategoriami i hasłami, `GET /api/glossary`, test integralności danych.
2. **Browse:** ekran z kategoriami i zwijaniem, `GlossaryProvider`, stany ładowania i błędu.
3. **Definition:** `GET /terms/{slug}`, parser znaczników, klikalne linki, "Related terms", okruszki i nawigacja wstecz.
4. **Wyszukiwanie:** endpoint z `pg_trgm`, ekran Search, "No results" z "Did you mean".
5. **Ulubione:** endpointy, gwiazdka, chip `Saved`.
6. **Grafiki i "Practise it".**
7. **Dopracowanie i testy:** stany błędów, dostępność, test Jest dla głównych przepływów, przegląd treści pod kątem MiFID II.

Etapy 1 do 3 (lista, definicja z linkami i okruszkami) to rdzeń dema "słownik z odnośnikami".

---

## 10. Ryzyka i rzeczy do sprawdzenia

- **`pg_trgm`:** `CREATE EXTENSION` wymaga uprawnień. Obraz Postgres 17 z `docker-compose` oraz Testcontainers używają użytkownika z pełnymi uprawnieniami, ale sprawdzić na czystej bazie przed PR. Awaryjnie: samo `ILIKE` bez rozszerzenia (traci się tylko tolerancję literówek).
- **Migracje edytowane po pushu:** świadomie zaakceptowane (zespół robi `make db-reset` po zmianie treści). Jeśli to kiedyś zacznie przeszkadzać, można przenieść dane do migracji powtarzalnej `R__`.
- **Konflikt numeru migracji:** sprawdzić `origin/main` przed PR i ewentualnie przenumerować (przenumerowane na V15/V16: zaraz po V14 z main, bo Flyway nie stosuje migracji o numerze niższym niż już zastosowane).
- **Zmiana trasy `glossary` na folder:** upewnić się, że zakładka w dolnym pasku nadal działa i nie pojawiają się dodatkowe zakładki (np. `[slug]`).
- **API okruszków:** `router.dismiss`/`dismissTo` zweryfikować w dokumentacji Expo Router dla SDK 58 zanim zacznie się kod nawigacji.
- **Merytoryka i regulacje:** definicje i przykłady musi przejrzeć człowiek z zespołu (MiFID II). Zdania typu "warto kupić" są niedopuszczalne.
- **Karta "On your account":** poza v1. Jeśli zostanie czas, osobny endpoint z danymi demonstracyjnymi i reguła "które hasło pokazuje który fakt" po stronie bazy.

## 11. Poza zakresem (v1)

Fiszki, hasło dnia, ostatnio oglądane, popup definicji w lekcjach, karta "On your account", propozycja zapytania do asystenta przy braku wyników, zapamiętywanie stanu zwinięcia kategorii.
