# CodePenFolders

Moja kolekcja efektów UI z [CodePen](https://codepen.io) do ponownego użycia w innych projektach:
terminale (głównie z myślą o FoE) oraz guziki i efekty elementów (projekt z OBS).

**Nie jestem autorem tych efektów.** Każdy folder to eksport pena z CodePen,
razem z oryginalnym plikiem `LICENSE.txt` (MIT) i `README.md` z linkiem do źródła.
Wszystkie zasługi należą do autorów wymienionych poniżej.

Jedyna zmiana względem oryginałów: z `dist/index.html` usuwany jest skrypt `prefixfree.js`
(dodawał prefiksy CSS dla starych przeglądarek, dziś zbędne, a przy hostingu poza CodePen
powodował błędy CORS).

## Podgląd

**Galeria online: https://v-cancrosa.github.io/CodePenFolders/**

Lokalnie: uruchom `python -m http.server 8765` w tym folderze i wejdź na `http://localhost:8765`.

## Dodawanie nowych penów

1. Na CodePen: **Export → Export .zip**.
2. Na stronie [Dodaj ZIP](https://v-cancrosa.github.io/CodePenFolders/upload.html) wybierz kategorię, tagi
   i upuść pliki (wymaga jednorazowego tokenu GitHub – instrukcja jest na tej stronie).
   Można też wrzucić ZIP ręcznie na GitHubie do `inbox/<kategoria>/`.
3. GitHub Actions (`.github/workflows/pages.yml`) uruchamia `tools/process_inbox.py`:
   rozpakowuje ZIP do `<kategoria>/<nazwa>/`, usuwa `prefixfree.js`, dopisuje pen do `items.json`
   i tabel poniżej, a potem publikuje galerię. Trwa to około minuty.
   Wadliwe paczki trafiają do `inbox/_bledy/` z opisem problemu.

## Struktura

```
items.json                # lista penów, z której korzysta galeria
<kategoria>/<nazwa>/
├── src/                  # kod źródłowy (SCSS / LESS / Pug / CSS, HTML, JS)
├── dist/                 # gotowy HTML / CSS / JS
├── README.md             # link do oryginalnego pena
└── LICENSE.txt           # licencja MIT autora
```

<!-- items:start -->

## Terminale

| Projekt | Autor | Oryginał | Uwagi |
|---|---|---|---|
| [Fallout 3 Terminal](terminals/fallout-3-terminal) | 32bitkid | [pen](https://codepen.io/32bitkid/pen/DrXOVg) | Terminal w stylu Fallouta. LESS + JS. |
| [Fallout Terminal CSS Theme](terminals/fallout-terminal-inspired-css-theme) | macktropolis | [pen](https://codepen.io/macktropolis/pen/vNMRpK) | Zielony motyw CRT, prawie samo CSS. |
| [Terminal UI](terminals/terminal-ui) | arcticben | [pen](https://codepen.io/arcticben/pen/OWYyeo) | Font VT323, animacje. ⚠ Wymaga jQuery 2.1 i GSAP 1.19 z CDN (stare wersje). |
| [Terminal](terminals/terminal) | ronaldsvilcins | [pen](https://codepen.io/ronaldsvilcins/pen/jPXBJO) | Prosty terminal, bez zależności. |
| [CSS Terminal Window](terminals/css-terminal-window) | joshcummingsdesign | [pen](https://codepen.io/joshcummingsdesign/pen/qOKaWd) | Okno terminala w czystym CSS. |
| [termynal.js](terminals/termynal-js-a-lightweight-and-modern-animated-terminal-window) | ines | [pen](https://codepen.io/ines/pen/MoaRYM) | Animowane wpisywanie komend, lekkie. |

## Guziki i efekty

| Projekt | Autor | Oryginał | Uwagi |
|---|---|---|---|
| [Button Hover Effects](effects/button-hover-effects) | kjbrum | [pen](https://codepen.io/kjbrum/pen/wBBLXx) |  |
| [Button Hover (box-shadow)](effects/button-hover-effects-with-box-shadow) | giana | [pen](https://codepen.io/giana/pen/BZaGyP) |  |
| [Hover.css](effects/hover-css) | Ian Lunn | [pen](https://codepen.io/IanLunn/pen/AxBReL) | Duża biblioteka efektów najechania. Pełna wersja: github.com/IanLunn/Hover |
| [Animated Back Glow](effects/animated-back-glow) | georgehastings | [pen](https://codepen.io/georgehastings/pen/xgwxgo) |  |
| [Neon Glass Context Menu](effects/neon-glass-context-menu) | simeydotme | [pen](https://codepen.io/simeydotme/pen/PwwYZOe) | Kliknij prawym przyciskiem w podglądzie. |
| [Neumorphic Elements](effects/neumorphic-elements) | myacode | [pen](https://codepen.io/myacode/pen/PoqQQNM) | ⚠ Ładuje cudzy klucz Font Awesome Kit – podmień przy użyciu. |
| [Modal Animations](effects/modal-animations) | designcouch | [pen](https://codepen.io/designcouch/pen/obvKxm) |  |
| [Fancy Slider](effects/fancy-slider) | suez | [pen](https://codepen.io/suez/pen/wMMgXp) |  |
| [AOS – animacje przy scrollu](effects/aosanimations) | michalsnik | [pen](https://codepen.io/michalsnik/pen/WxNdvq) |  |
| [Subscriber Coaster](effects/subscribercoaster) | cobra_winfrey | [pen](https://codepen.io/cobra_winfrey/pen/VwYBRvj) | Dobry kandydat na nakładkę w OBS. |
| [Three Dots – loadery](effects/three-dotscss-loading-animations-made-with-single-element) | nzbin | [pen](https://codepen.io/nzbin/pen/GGrXbp) | Wskaźniki ładowania z jednego elementu. Pełna wersja: github.com/nzbin/three-dots ⚠ Ładuje z CDN: clipboard 2.0.11. |
| [Border Animation (CSS)](effects/pure-css-border-animation-without-svg) | Rplus | [pen](https://codepen.io/Rplus/pen/abPLGx) | Animowana ramka z jednego elementu, bez SVG. |

## Formularze

| Projekt | Autor | Oryginał | Uwagi |
|---|---|---|---|
| [Credit Card Payment Form](forms/credit-card-payment-form) | quinlo | [pen](https://codepen.io/quinlo/pen/YONMEa) | Maski pól (imask.js) i karta SVG zmieniająca się przy wpisywaniu. Niczego nie wysyła. ⚠ Wymaga imask.js 3.4 z CDN (stara wersja). |

## Demo i ciekawostki

| Projekt | Autor | Oryginał | Uwagi |
|---|---|---|---|
| [how browsers :has()](demos/how-browsers-has) | jh3y | [pen](https://codepen.io/jh3y/pen/xbqmjgW) | Interaktywne wyjaśnienie, jak przeglądarka obsługuje selektor :has(). |

<!-- items:end -->

## Licencja

Każdy efekt jest objęty licencją MIT swojego autora – patrz `LICENSE.txt` w danym folderze.
Przy użyciu w innym projekcie zachowaj tę informację o licencji i autorze.
Galeria `index.html` i ten README są moje.
