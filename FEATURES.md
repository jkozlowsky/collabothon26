# Finance Quest: lista featurów i wymagań

> Collabothon 2026 · Commerzbank · 48h · zespół 6 osób
> Hasło robocze: **„Duolingo for finance”**

Legenda:
- 📝 **Nasz pomysł:** wynika z naszych notatek i ustaleń
- ✅ **Wymagania:** co musi działać, żeby feature był „gotowy”
- 💡 **Sugestia:** opcjonalne usprawnienie do decyzji zespołu

---

## 0. Kontekst (z kart organizatora)

**Challenge:** jak sprawić, żeby nauka finansów była *engaging, relevant i actionable*, żeby ludzie sami jej szukali, nabierali pewności i stosowali wiedzę w praktyce.

**Grupa docelowa wg Challenge Card:** *self-directed investors*, czyli osoby, które same podejmują decyzje inwestycyjne albo chcą zacząć.

**Czego oczekuje Commerzbank:**
- działający prototyp z **jedną kompletną „misją”/lekcją od początku do końca**
- opis **docelowego użytkownika** i **celu nauki**
- pokazanie, **jak rozwiązanie buduje zrozumienie i zaangażowanie**

**Motyw przewodni:** *„Innovations for all generations”*, czyli różne etapy życia, cele, horyzonty i poziomy doświadczenia.

**Kryteria oceny (równe wagi):** 🎯 Relevance · 💻 Technical Implementation · 💡 Innovation · 🎨 Design · 🎤 Demo & Pitch

**Z otwarcia (nasze notatki):**
- ludzie nie mają czasu, wiedzy ani umiejętności → jak uprościć brak informacji?
- jak ludzie chcą konsumować informacje? (technika + design)
- **sedno:** połączyć to, że ludzie *chcą* się uczyć, *dostają ważne informacje* i *aktywnie ich szukają*
- liczy się **inkluzywność**, **sposób przetwarzania informacji**, **design, który sprawia, że chce się uczyć**
- jury interesuje się tym, **jak** coś jest zaimplementowane

**Do oddania:** Project Card (nazwa, one-liner ≤ 200 znaków, tech stack, opis: problem / rozwiązanie / prototyp / behind the build / wyzwania / wyniki), link do repo.

---

## 1. Wizja produktu

📝 Osobna aplikacja **zintegrowana z bankiem**, która uczy finansów w formie krótkich, zgamifikowanych lekcji (jak Duolingo), personalizowanych na podstawie danych użytkownika i jego zachowań.

**Flow użytkownika:**
```
Pobranie appki → Profilowanie AI (dane z banku) → Test / onboarding (wiedza, cele)
→ [opcjonalnie] intro + guide → Ścieżka lekcji + rekomendacje
→ Lekcje · Quiz House · Chatbot · Słownik · Profil (avatar, fiszki)
```

💡 **Sugestia:** na pitchu pokazać appkę jako moduł, który może żyć też *wewnątrz* aplikacji bankowej (mniejsza bariera niż instalacja nowej appki).

---

## 2. Featury

### F1. Profilowanie AI na podstawie danych (JEV)
📝 Wstępne profilowanie użytkownika na podstawie danych bankowych, oparte o AI (JEV).

✅ Wymagania:
- przykładowe (mockowe) dane klienta: wiek, dochody, saldo, wydatki, posiadane produkty
- AI na tej podstawie przypisuje profil, np. etap życia, poziom, prawdopodobne cele
- wynik zapisany w profilu użytkownika i używany przez inne moduły
- zgoda użytkownika na użycie danych (RODO)

---

### F2. Test wiedzy / onboarding i kategoryzacja
📝 Test oceniający użytkownika: jego wiedzę, co chce się uczyć itd. Onboarding i kategoryzacja.

✅ Wymagania:
- krótki test (≈ 5–10 pytań, < 3 min), w tym pytania o cele i zainteresowania
- wynik: poziom wiedzy per kategoria (np. oszczędzanie, inwestowanie, ETF, ryzyko, emerytura)
- kategoryzacja łączy dane z F1 i wynik testu w jeden profil
- możliwość pominięcia lub powtórzenia później

---

### F3. Short intro + optional guide
📝 Krótkie intro i opcjonalny przewodnik po aplikacji.

✅ Wymagania:
- 2–4 ekrany intro (co to jest, co zyskasz), do pominięcia
- opcjonalny guide (coach marks / podświetlenia) po głównych elementach UI

---

### F4. Lekcje: core aplikacji
> Szczegóły: [`docs/F4-lekcje.md`](docs/F4-lekcje.md)
📝 Lekcje w różnych formach, jak w Duolingo:
- quizy
- łączenie kafelków (pojęcie ↔ definicja)
- filmiki
- strona tekstu

✅ Wymagania:
- silnik lekcji: lekcja = sekwencja kroków różnych typów (quiz, kafelki, wideo, tekst)
- treść lekcji w ustrukturyzowanym formacie (np. JSON), żeby łatwo dodawać nowe
- feedback po każdej odpowiedzi (dobrze/źle + wyjaśnienie)
- wynik lekcji aktualizuje wiedzę w profilu (co wie, a czego nie)
- **minimum na demo: 1 w pełni dopracowana lekcja/misja** + kilka kolejnych na ścieżce
- lekcje krótkie (2–5 min), bo ludzie nie mają czasu

💡 Sugestie:
- zakończyć lekcję scenariuszem z życia albo symulacją decyzji („masz 5 000 €, rynek spadł o 20%, co robisz?”), bo karta mówi o *real-world scenarios*
- na końcu dać „pierwszy krok” do wykonania (np. szkic planu oszczędnościowego, przypomnienie), żeby trafić w *actionable*
- filmiki są drogie w produkcji w 48h: wystarczy 1 krótki albo animowana karta / audio

---

### F5. Warianty lekcji: inkluzywność
> Szczegóły: [`docs/F5-warianty.md`](docs/F5-warianty.md)
📝 Każda lekcja może mieć różne warianty: ta sama treść przechowywana w różnych wersjach.

✅ Wymagania:
- jedna treść bazowa → kilka wariantów, np.:
  - poziom: początkujący / zaawansowany
  - ~~prosty język / standardowy~~ (usunięte, zob. `.plans/lesson-video-mode-spec.md` §9)
  - przykłady pod etap życia (student / rodzina / przed emeryturą)
  - forma: tekst / audio / wizualna
- wariant dobierany automatycznie na podstawie profilu (F1 + F2), z możliwością ręcznej zmiany
- dostępność: kontrast, rozmiar czcionki, czytelność

💡 Sugestia: warianty generowane przez LLM z treści bazowej (tylko przepisuje, nie dodaje faktów).

---

### F6. Sugerowanie i proponowanie obszarów
📝 Aplikacja sugeruje i proponuje obszary do nauki.

✅ Wymagania:
- rekomendacja „następna lekcja / obszar dla Ciebie” na ekranie głównym
- na podstawie: profilu (F1), wyniku testu (F2), luk w wiedzy z lekcji (F4) i Quiz House (F8)
- krótkie uzasadnienie („polecamy, bo…”)

💡 Sugestia: rekomendacje kontekstowe na podstawie zdarzeń, np. „masz dużo gotówki na koncie → lekcja o inflacji”, „rynek spadł → lekcja o emocjach inwestora”. Odpowiada to na „actively seek it out”.

---

### F7. Filtrowanie kolaboratywne: uczenie się na zachowaniach i decyzjach
📝 Filtrowanie kolaboratywne, uczymy się na zachowaniach i decyzjach użytkowników.

✅ Wymagania:
- zbieranie zdarzeń: ukończone lekcje, odpowiedzi, czas, decyzje w scenariuszach
- model rekomendacji „użytkownicy podobni do Ciebie uczyli się też…”
- zasila F6

💡 Sugestia: bez prawdziwych użytkowników CF nie ma danych. Na hackathonie wygenerować syntetyczne dane albo zrobić wersję regułową i pokazać CF jako architekturę / roadmapę, uczciwie opisane w Project Card.

---

### F8. Quiz House: rywalizacja
📝 Quiz House: rywalizacja z innymi, sprawdzanie się w wybranych kategoriach, ranking. Na tej podstawie wiemy, co użytkownik wie, a czego nie.

✅ Wymagania:
- wybór kategorii i pojedynek z innym użytkownikiem (lub botem)
- ranking (ogólny / per kategoria / znajomi)
- wyniki aktualizują poziom wiedzy w profilu → zasila F6/F7

💡 Sugestie:
- pojedynek asynchroniczny (wyzwanie, przeciwnik gra później) jest dużo prostszy niż rozgrywka na żywo
- ranking oparty na wiedzy i dobrych decyzjach, nie na zyskach (unikamy efektu hazardu)

---

### F9. Chatbot do bieżących decyzji
📝 Chatbot pomagający przy bieżących decyzjach finansowych.

✅ Wymagania:
- czat z LLM, który zna profil użytkownika i kontekst lekcji
- tłumaczy pojęcia i konsekwencje decyzji prostym językiem
- linkuje do słownika (F10) i pasujących lekcji (F4)

💡 Sugestia: chatbot **edukuje, a nie doradza** („wyjaśniam”, nie „kup X”). Doradztwo inwestycyjne to temat regulacyjny (MiFID II) i jury z banku na pewno o to zapyta. Dobrze mieć disclaimer i przycisk „Wyjaśnij to” przy pojęciach w lekcji.

---

### F10. Słownik definicji / wiki
📝 Słownik pojęć i wiki. W lekcjach i modułach są odnośniki do definicji.

✅ Wymagania:
- baza pojęć (definicja, przykład, powiązane pojęcia, powiązane lekcje)
- pojęcia w lekcjach podświetlone → kliknięcie otwiera definicję (popup)
- wyszukiwarka
- definicje też w wariantach (F5), np. prosty język

---

### F11. Avatar, który się rozwija
📝 Po pobraniu appki użytkownik ma swojego avatara, który się rozwija.

✅ Wymagania:
- avatar tworzony na starcie
- rozwój zależny od postępów (XP, poziom, ukończone ścieżki, odznaki)
- widoczny na profilu i w Quiz House

💡 Sugestia: avatar jako „Future You”, czyli pokazuje użytkownika w przyszłości (np. na emeryturze) i zmienia się w zależności od decyzji w lekcjach. Daje to emocjonalne powiązanie nauki z realnym celem.

---

### F12. Profil + fiszki
📝 Na profilu są dostępne fiszki.

✅ Wymagania:
- profil: avatar, poziom, postępy per kategoria, odznaki, statystyki
- fiszki z pojęć z ukończonych lekcji
- tryb powtórki

💡 Sugestie:
- fiszki automatycznie z pojęć, w których użytkownik się pomylił, z powtórkami w odstępach (spaced repetition)
- streak / dzienne cele jako lekki mechanizm powrotu do aplikacji

---

## 3. Podział na 3 główne topiki (po 2 osoby)

| Topic | Featury | Osoby |
|---|---|---|
| **A. Nauka i treść** (core) | F4 Lekcje · F5 Warianty / inkluzywność · F10 Słownik/wiki | _____ , _____ |
| **B. Personalizacja i AI** | F1 Profilowanie AI (JEV) · F2 Test / onboarding · F6 Rekomendacje · F7 Filtrowanie kolaboratywne · F9 Chatbot | _____ , _____ |
| **C. Zaangażowanie i gamifikacja** | F3 Intro/guide · F8 Quiz House + ranking · F11 Avatar · F12 Profil + fiszki | _____ , _____ |

**Zadania wspólne (przypisać właścicieli):**
- 🎨 Design system / UI kit (spójny wygląd wszystkich topików): _____
- 🗄️ Wspólny backend i model danych (profil użytkownika, lekcja, pojęcie, zdarzenia): _____
- 🎤 Pitch, scenariusz demo, Project Card: _____
- 📊 Mockowe dane klientów (persony): _____

> ⚠️ Pierwsze ~2h: ustalić wspólne kontrakty (format JSON lekcji, struktura profilu użytkownika, API między modułami), żeby 3 topiki dało się połączyć na koniec.

---

## 4. Priorytety (propozycja do dyskusji)

| Prio | A. Nauka i treść | B. Personalizacja i AI | C. Zaangażowanie |
|---|---|---|---|
| **MUST** (demo nie działa bez tego) | Silnik lekcji (quiz, kafelki, tekst) · 1 kompletna lekcja | Test/onboarding · profilowanie (choćby proste) | Profil użytkownika · podstawowa gamifikacja (XP, poziom) |
| **SHOULD** (mocno podnosi ocenę) | Warianty lekcji (inkluzywność) · słownik z odnośnikami | Rekomendacje obszarów · chatbot | Avatar · fiszki · Quiz House (vs bot) |
| **COULD** (jeśli zostanie czas) | Filmiki · kolejne lekcje | Filtrowanie kolaboratywne (dane syntetyczne) | Ranking · pojedynki ze znajomymi · intro/guide |

---

## 5. Dodatkowe sugestie (poza naszymi notatkami, do decyzji)

1. **Zawęzić personę do self-directed investors,** bo tak brzmi Challenge Card. Pewnie część zespołów zrobi ogólną edukację finansową.
2. **Od wiedzy do działania:** karta mówi, że problem to nie brak informacji, tylko brak odwagi do działania. Każda lekcja może kończyć się małym realnym krokiem.
3. **Scenariusze i symulacje decyzji** (np. na danych historycznych z giełdy) zamiast samych quizów, bo karta wprost wymienia *missions, challenges, real-world scenarios*.
4. **Wyróżnienie na tle 15 zespołów:** quizy, streaki, avatar i ranking zrobi prawie każdy. Warto mieć 1–2 rzeczy, których inni nie mają (np. warianty generowane na żywo, scenariusze decyzji, Future You).

---

## 6. Otwarte pytania

- [ ] Czym dokładnie jest **JEV** (model / narzędzie / osoba)?
- [ ] Platforma: mobile (React Native / Flutter) czy web (PWA)?
- [ ] Czy Commerzbank udostępnia API / dane / sandbox? (zapytać na Discord #Commerzbank)
- [ ] Jaki LLM i czy mamy klucze/kredyty?
- [ ] Persona: szeroka (wszyscy klienci) czy zawężona (self-directed investors)?
- [ ] Długość pitchu, język (EN/DE), demo na żywo czy nagrane?
- [ ] Tech stack: _____
