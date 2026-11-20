# F5. Warianty lekcji: inkluzywność

> Rozwinięcie F5 z [`FEATURES.md`](../FEATURES.md). Status: **propozycja do dyskusji**.
> Opiera się na formacie kroków z [F4](F4-lekcje.md).

## 1. Pomysł

Ta sama lekcja (te same kroki, ta sama logika, te same wykresy) dopasowuje się do osoby, która ją robi. Zmieniają się **teksty, przykłady, liczby startowe i poziom trudności**, a nie struktura lekcji.

Interaktywne kroki z F4 dobrze się do tego nadają: wariant zmienia tylko kontekst wokół wykresu (tekst, wartości startowe suwaków), a sam krok zostaje ten sam.

## 2. Wymiary wariantów

| Wymiar | Wartości | Co się zmienia | Prio |
|---|---|---|---|
| **Persona / etap życia** | `student` · `family` · `pre-retirement` | przykłady w tekstach, wartości startowe suwaków | SHOULD |
| **Język** | `plain` · `standard` | długość zdań, brak żargonu, pojęcia zawsze z linkiem do słownika | SHOULD |
| **Poziom** | `beginner` · `advanced` | beginner: więcej podpowiedzi, mniej opcji w quizie; advanced: dodatkowy krok/parametr (np. suwak inflacji) | COULD |
| **Forma** | tekst · audio · wizualna | audio: odczyt tekstu (`expo-speech`); wizualna: priorytet kroków interaktywnych | COULD |
| **Dostępność** | rozmiar czcionki, kontrast, ograniczenie animacji | ustawienia globalne, nie per lekcja (patrz §6) | MUST (podstawy) |

## 3. Model danych: baza + nadpisania

Lekcja ma **jedną treść bazową** (`standard`, bez persony) i **nadpisania per krok**. Wariant nadpisuje tylko pola, które się różnią. Brak nadpisania → bierzemy bazę. Dzięki temu nie trzymamy 3 × 2 × 2 kopii lekcji.

```jsonc
{
  "id": 2,
  "steps": [ /* treść bazowa, jak w F4 */ ],
  "variants": {
    "persona:student": {
      "s1": { "params": { "monthly": { "value": 50 }, "years": { "value": 40 } } }
    },
    "persona:pre-retirement": {
      "s1": { "params": { "monthly": { "value": 500 }, "years": { "value": 7 } } }
    },
    "lang:plain": {
      "t1": { "body": "Your money earns money. Then that money earns money too. The longer you wait, the faster it grows." },
      "q1": { "prompt": "What makes your money grow the most?" }
    }
  }
}
```

**Kolejność nakładania** (późniejsze wygrywa): `baza` → `level:*` → `persona:*` → `lang:*`.
Nakładanie = głębokie scalenie obiektów (deep merge) po `id` kroku. Jedna czysta funkcja we froncie, np. `applyVariants(lesson, profile)`, z jednym testem.

Backend nie musi znać wariantów: zwraca całą lekcję z `variants`, front składa wersję. (Lekcje są małe, kilka KB.)

## 4. Skąd wiemy, który wariant?

```
profil (F1: wiek/etap życia, F2: poziom + preferencje)
  → { persona, level, lang }
  → applyVariants(lesson, …)
```

- Persona i poziom z profilu (F1/F2). Język `plain` jeśli użytkownik wybrał go w onboardingu albo ma niski wynik testu.
- **Ręczna zmiana:** w lekcji przełącznik „Aa” (plain/standard) i w profilu wybór persony. Zmiana działa od razu, bez przeładowania.
- Brak profilu → baza.

## 5. Generowanie wariantów przez LLM (SHOULD/COULD)

Pisanie nadpisań ręcznie dla 1 lekcji demo jest OK (to ~10 krótkich tekstów). Dla skalowania:

- **Offline (zalecane na hackathon):** skrypt bierze bazową lekcję + instrukcję („przepisz dla studenta, prostym językiem, nie dodawaj faktów, nie zmieniaj liczb w odpowiedziach”) → generuje `variants` → **człowiek przegląda** → commit do migracji/seedu. Zero ryzyka na żywo.
- **Na żywo (ryzykowne):** endpoint `POST /api/lessons/{id}/variant` generuje nadpisania dla wybranej persony. Na demo zawsze mieć fallback do gotowego wariantu.
- Twarde reguły dla LLM: zmienia tylko pola tekstowe i wartości startowe; nie zmienia `correctIndex`, `answer`, `model`, `data`; nie dodaje porad inwestycyjnych (MiFID II, patrz F4 §5). Walidacja wyniku: te same `id` kroków, te same klucze.

## 6. Dostępność (podstawy, MUST)

- Systemowy rozmiar czcionki działa (nie blokować `allowFontScaling`), layout nie pęka przy 200%.
- Kontrast tekstu min. 4.5:1 (sprawdzić kolory w `constants/theme.ts`).
- Kroki interaktywne mają alternatywę bez gestu: suwak obsługiwany czytnikiem ekranu (`accessibilityLabel`, wartość z jednostką), `sort` przez przyciski ↑/↓.
- Wykres zawsze z liczbą-podsumowaniem obok („After 30 years: €76,123”), żeby nie polegać tylko na wizualu.
- Kolor nie jest jedyną informacją dobrze/źle (ikona ✓/✗ + tekst).
- Systemowe „ogranicz ruch” wyłącza animacje (`AccessibilityInfo.isReduceMotionEnabled`).

## 7. Definicja „gotowe” (DoD)

- [ ] `applyVariants()` + test (baza, nadpisanie persony, kolejność nakładania)
- [ ] Lekcja demo ma warianty: 3 persony + `plain`
- [ ] Wariant dobiera się z profilu; ręczny przełącznik w lekcji działa na żywo
- [ ] Podstawy dostępności z §6 sprawdzone na Androidzie
- [ ] (COULD) skrypt LLM generujący `variants` z bazowej lekcji

## 8. Otwarte pytania

- [ ] Ile person faktycznie potrzebujemy: 3 czy 2?
- [ ] Gdzie żyje przełącznik persony: w lekcji (demo) czy tylko w profilu (produkt)? 
- [ ] Jaki LLM i klucze (wspólne z F9)?
- [ ] Czy warianty słownika (F10) robimy tym samym mechanizmem? (propozycja: tak, `variants` przy pojęciu)
