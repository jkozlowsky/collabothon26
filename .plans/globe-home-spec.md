# Spec: Ekran główny z globusem (zakładka Map)

> Wynik wywiadu z 2026-11-20. Powiązane: [`f4-f5-lessons-spec.md`](f4-f5-lessons-spec.md) (lekcje, `GET /api/stories`), [`doc/historie.md`](../doc/historie.md) (treść historii).
> Wygląd: Figma „Finance Quest — Globe Learn Screen”, frame `3:496` (Learn — Globe), sheet `3:616`, callout `3:599`, nav `26:663`. Tokeny i wymiary: `.claude/skills/finance-quest-ui/DESIGN-REFERENCE.md`. Przed implementacją przejść workflow skilla `finance-quest-ui`.

## 1. Zakres

**W specu:** zakładka **Map** (ekran główny): nagłówek, globus 3D z pinami, samolot, callout, przeciągany sheet „Your stories”, pływająca nawigacja, fallback bez 3D.

**Poza specem:**
- ekran historii („Story — Seoul”, Figma `87:3125`; stary „Amsterdam 1637 (tram)” jest w archiwum): osobny spec; tu tylko nawigacja do niego;
- zakładka **Bank** (Figma `11:452` i dalsze): tylko pozycja w nawigacji;
- lekcje: spec F4/F5.

## 2. Decyzje

| Temat | Decyzja |
|---|---|
| Render globusa | 3D: three.js przez `expo-gl` + `@react-three/fiber` (web i Android) |
| Lądy | Tekstura PNG (equirectangular) w kolorach marki |
| Piny | Komponenty RN nałożone na canvas; pozycja liczona z projekcji 3D |
| Pin po drugiej stronie kuli | Niewidoczny; zanika przy horyzoncie |
| Obrót | Przeciąganie w obu osiach (pion ograniczony) + bezwładność |
| Wybór pinu lub karty | Samolot leci od ostatnio wybranego pinu, kula obraca się za nim, na końcu callout |
| Kolizje pinów | Brak kodu: na globusie tylko miasta rozrzucone po świecie (§9) |
| Pin „Coming soon” | Samolot leci jak zwykle; callout bez przycisku, z napisem „Coming soon” |
| „Continue” w callout | Prowadzi do ekranu historii (lista lekcji, powtórki) |
| Sheet | Przeciągany, 2 pozycje: zwinięty i rozwinięty |
| Stan startowy | Kula ustawiona na bieżącej historii, callout otwarty |
| Brak WebGL / błąd 3D | Statyczny obrazek kuli + piny w stałych pozycjach |
| Animacje i gesty | `react-native-reanimated` + `react-native-gesture-handler` |
| Nawigacja | Bank · **Map** (orb, aktywna) · Glossary · Profile |

## 3. Układ ekranu (390 × 844)

Od góry, według frame `3:496`:

1. **Nagłówek:** „Hi {name} · {profileLabel}” (`Label/Default`, muted), „Where to next?” (`Display/Large`), po prawej `StatChip` streak (🔥 `feedback/streak`) i `StatChip` XP (`feedback/xp`). Dane z profilu użytkownika (topik C).
2. **Globus:** kwadratowy obszar na pełną szerokość, kula ok. 280 px, ocean jako gradient `globe/ocean-light` → `globe/ocean-deep`, delikatna orbita (przerywany okrąg) i cień pod kulą.
3. **Podpowiedź** pod kulą: pill „Drag to spin · tap a pin to open its story”. Znika po pierwszym obrocie, zapamiętane lokalnie.
4. **Sheet „Your stories”** (zwinięty): uchwyt, tytuł `Title/Section`, meta „{n} paths · {done} done”, karty `StoryCard`.
5. **Pływająca nawigacja** (`FloatingNav`, glass) nad sheetem. Lista w sheecie ma dolny padding, żeby ostatnia karta nie chowała się pod nawigacją.

## 4. Globus 3D

### Scena

- Kula: `SphereGeometry` (promień 1, ~64 segmenty), materiał z teksturą lądów i gradientem oceanu (gradient w teksturze albo prosty shader). Bez realistycznego światła: płaski, ilustracyjny styl jak w Figmie, lekkie przyciemnienie przy krawędzi (efekt Fresnela).
- **Obracamy kulę (grupę), nie kamerę.** Kamera stała, patrzy na środek. Orientacja kuli = kwaternion.
- Tekstura: `assets/globe/land-2048.png`, generowana jednorazowo skryptem z danych Natural Earth (domena publiczna): ląd `globe/land`, kontur `globe/land-edge`, ocean przezroczysty. Skrypt i źródło danych w repo.

### Obrót

- Przeciąganie poziome → obrót wokół osi Y; pionowe → nachylenie, ograniczone do ±50°.
- Po puszczeniu: bezwładność z wygaszaniem (ok. 0,95 na klatkę przy 60 fps, stop przy małej prędkości).
- Przeciąganie przerywa trwającą animację (lot, dolot).
- Gest globusa działa tylko w obszarze globusa; nie konfliktuje z gestem sheetu.

### Piny (overlay RN)

- Pozycja pinu: lat/lng → wektor na kuli → obrót kuli → `camera.project()` → piksele ekranu.
- Widoczność: iloczyn skalarny normalnej pinu i kierunku do kamery. Poniżej 0 pin ukryty; w przedziale 0–0,2 zanika (opacity). Ukryty pin nie przyjmuje tapów.
- Pozycje pinów aktualizowane co klatkę przez shared values Reanimated (bez re-renderu Reacta).
- Wygląd i stany jak w Design Kit: `GlobePin` z `state: 'default' | 'active' | 'done' | 'comingSoon'`, kolor z `story/*`, aktywny `brand/accent`, ukończony ze znaczkiem ✓, „Coming soon” w `story/slate` i z kłódką. Cień `Elevation/Pin`. Cel dotyku min. 44 px.
- Aktywny pin ma pod sobą pulsujący żółty cień (jak na makiecie).

### Samolot i dolot

- Wybór pinu lub karty historii uruchamia **lot** z ostatnio wybranego pinu do nowego.
- Trasa: łuk po wielkim kole (slerp między wektorami jednostkowymi), wysokość nad powierzchnią `0,15 · sin(π·t)`.
- Samolot to ikona RN nad canvasem (jak piny), obrócona wzdłuż stycznej do trasy.
- Kula obraca się tak, żeby samolot był na środku kadru; na końcu nowy pin jest na środku i otwiera się callout.
- Czas: 0,8–1,8 s zależnie od długości łuku, easing `ease-in-out`.
- Tap w trakcie lotu przeskakuje na koniec. Gest obrotu przerywa lot (callout się nie otwiera).
- Brak poprzedniego pinu (pierwsze otwarcie) → tylko dolot kuli, bez samolotu.
- Systemowe „ogranicz ruch” → bez samolotu, kula ustawia się od razu.
- Ostatnio wybrany pin zapamiętany lokalnie (start następnego lotu po ponownym uruchomieniu).

### Callout (`PinCallout`, Figma `3:599`)

Pływa obok wybranego pinu, przypięty do jego pozycji na ekranie, nie wychodzi poza kadr (przerzucany na drugą stronę pinu przy krawędzi).

| Stan historii | Treść |
|---|---|
| W trakcie | `Overline` miasto · tytuł następnej lekcji (`Title/Card`) · „Lesson 3 of 6 · 4 min” · przycisk **Continue →** |
| Nierozpoczęta | jak wyżej, „Lesson 1 of N”, przycisk **Start →** |
| Ukończona | miasto · tytuł historii · „All {n} lessons done” · przycisk **Review →** |
| Coming soon | miasto · temat historii · „Coming soon”, bez przycisku |

Przycisk prowadzi do ekranu historii: `router.push('/story/[id]')`. Callout zamyka tap poza nim albo rozpoczęcie obrotu.

## 5. Sheet „Your stories”

- Dwie pozycje: **zwinięty** (widać nagłówek + ok. 2,5 karty, jak na makiecie) i **rozwinięty** (ok. 90% wysokości, globus przyciemniony pod spodem).
- Przeciąganie uchwytu lub nagłówka; przyciąganie do najbliższej pozycji z uwzględnieniem prędkości gestu. Tap w uchwyt przełącza pozycje. W pozycji rozwiniętej lista przewija się w środku.
- Własna implementacja na Gesture Handler + Reanimated (dwie pozycje to kilkadziesiąt linii); bez biblioteki bottom sheet.
- Karty (`StoryCard`, `state: 'default' | 'active' | 'done' | 'comingSoon'`): ikona w kafelku w kolorze historii (14%), tytuł, meta „{miasto} · {temat}”, pasek postępu albo „✓ Done” albo „Coming soon”. Bieżąca historia: `brand/accent-soft` + 2 px obramowanie petrol.
- Kolejność: bieżąca, w trakcie, nierozpoczęte, ukończone, „Coming soon”.
- **Tap na kartę = to samo co tap na pin:** sheet się zwija (jeśli był rozwinięty), samolot leci, callout.

## 6. Dane

`GET /api/stories` (z [`f4-f5-lessons-spec.md`](f4-f5-lessons-spec.md) §6), rozszerzone o pola potrzebne globusowi:

```jsonc
[
  {
    "id": "seoul",
    "city": "Seoul",
    "topic": "Hype & borrowed money",          // meta karty
    "status": "available",                     // available | coming-soon
    "pin": { "lat": 37.57, "lng": 126.98 },
    "icon": "message-circle",                  // nazwa ikony z Design Kitu
    "color": "rose",                           // klucz story/* w theme
    "progress": { "done": 1, "total": 3 },
    "nextLesson": { "id": 8, "title": "Borrowed money", "minutes": 4 }, // null gdy ukończona lub coming-soon
    "current": true                            // dokładnie jedna historia
  }
]
```

- „Bieżąca” historia: ostatnio otwierana nieukończona; jeśli brak, pierwsza dostępna nieukończona.
- Kolory `story/*` z Design Kitu są dziś przypisane do starych miast (Amsterdam, Lagos, Dubai, Cape Town). Przypisanie w danych (`color`), nie w kodzie; Design Kit trzeba zaktualizować o nowe miasta.
- Dane nagłówka (imię, etykieta profilu, streak, XP) z API profilu (topik C).

## 7. Fallback bez 3D

- Wykrywanie: na webie sprawdzenie WebGL przed montowaniem canvasu; na obu platformach error boundary wokół canvasu i timeout pierwszej klatki (np. 3 s).
- Fallback: statyczny PNG kuli (wyrenderowany z tej samej tekstury, wycentrowany na Europie i Afryce) + piny RN w stałych, wyliczonych pozycjach dla widocznych miast. Tap na pin otwiera callout bez samolotu. Miasta niewidoczne na obrazku są dostępne przez sheet.
- Reszta ekranu (nagłówek, sheet, nawigacja) działa bez zmian.

## 8. Struktura kodu

```
src/app/(tabs)/_layout.tsx        # zakładki: bank, index (Map), glossary, profile + FloatingNav
src/app/(tabs)/index.tsx          # ekran Map: składa komponenty, pobiera /api/stories
src/components/globe/Globe.tsx    # canvas r3f + overlay pinów i samolotu; fallback
src/components/globe/GlobePin.tsx
src/components/globe/Plane.tsx
src/components/globe/PinCallout.tsx
src/components/StoryCard.tsx
src/components/StorySheet.tsx
src/components/StatChip.tsx
src/components/FloatingNav.tsx
src/lib/geo.ts                    # latLng→wektor, slerp, łuk lotu, widoczność; z testami
assets/globe/land-2048.png, globe-fallback.png
scripts/make-globe-texture.*      # generator tekstury
```

- `src/lib/geo.ts` ma testy: latLng→wektor dla (0,0) i biegunów, środek łuku Berlin→Seul leży na wielkim kole, pin naprzeciw kamery ma widoczność < 0.
- Zależności przez `npx expo install`: `expo-gl`, `three`, `@react-three/fiber`, `react-native-reanimated`, `react-native-gesture-handler`. **Przed instalacją sprawdzić w dokumentacji Expo SDK 58** (zgodnie z `front/AGENTS.md`), czy `expo-gl` + r3f działa w Expo Go i na webie; jeśli nie, potrzebny development build, co wpływa na sposób demo.

## 9. Miasta na globusie (demo)

Pełna treść: **Seul** i **Berlin** (ewentualnie kolejne). Pozostałe jako „Coming soon”, max jedno miasto na region, żeby piny się nie nakładały. Propozycja z `doc/historie.md` §5: Buenos Aires **albo** São Paulo, Nairobi **albo** Lagos, Mumbaj; bez Tokio (za blisko Seulu) i bez Frankfurtu/Amsterdamu (za blisko Berlina). Ostateczna lista to decyzja treściowa.

## 10. Wydajność i dostępność

- Cel: płynne 60 fps przy obrocie na średnim Androidzie; tekstura 2048 × 1024, kula ~64 segmenty, max ~10 pinów.
- Canvas zatrzymuje renderowanie, gdy zakładka nie jest widoczna i gdy kula stoi (render na żądanie).
- Każdy pin i karta: `accessibilityRole="button"`, etykieta „{miasto}, {temat}, {stan}”. Czytnik ekranu ignoruje canvas; nawigacja przez sheet.
- „Ogranicz ruch”: bez samolotu, bez bezwładności, bez pulsowania aktywnego pinu.
- `testID`: `globe`, `globe-pin-{id}`, `pin-callout`, `story-card-{id}`, `story-sheet`.

## 11. Definicja „gotowe”

- [ ] Ekran zgodny z frame `3:496` przy 390 px (kolory, rozmiary, typografia)
- [ ] Obrót w obu osiach z bezwładnością na web i Androidzie
- [ ] Tap na pin i na kartę: lot samolotu, dolot, callout; tap w locie przeskakuje na koniec
- [ ] Piny znikają za kulą i zanikają przy horyzoncie
- [ ] Callout we wszystkich 4 stanach; przycisk otwiera `/story/[id]`
- [ ] Sheet: 2 pozycje, przeciąganie i tap w uchwyt
- [ ] Fallback działa po wymuszeniu błędu canvasu
- [ ] Testy `geo.ts`; `npm run check` przechodzi

## 12. Otwarte

- [ ] Ostateczna lista miast „Coming soon” i przypisanie kolorów `story/*`; aktualizacja Design Kitu w Figmie.
- [ ] Kontrakt profilu dla nagłówka (topik C).
- [ ] Spec ekranu historii („Story — Seoul”, `87:3125`), łącznie z route `/story/[id]`.
- [ ] Sprawdzić `expo-gl` + r3f w SDK 58 (Expo Go vs development build) przed startem prac.
- [ ] Ikona samolotu w Design Kicie.
