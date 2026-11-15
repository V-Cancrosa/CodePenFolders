# CodePen Things

Moja kolekcja efektów UI z [CodePen](https://codepen.io) do ponownego użycia w innych projektach:
terminale (głównie z myślą o FoE) oraz guziki i efekty elementów (projekt z OBS).

**Nie jestem autorem tych efektów.** Każdy folder to niezmieniony eksport pena z CodePen,
razem z oryginalnym plikiem `LICENSE.txt` (MIT) i `README.md` z linkiem do źródła.
Wszystkie zasługi należą do autorów wymienionych poniżej.

## Podgląd

**Galeria online: https://v-cancrosa.github.io/CodePen_Things/**

Lokalnie: otwórz `index.html` przez lokalny serwer (np. `python -m http.server 8765` i wejdź na
`http://localhost:8765`), żeby zobaczyć wszystkie efekty w jednej galerii z filtrem FoE / OBS.

## Struktura

Każdy projekt ma ten sam układ:

```
<kategoria>/<nazwa>/
├── src/        # kod źródłowy (SCSS / LESS / CSS, HTML, JS)
├── dist/       # gotowy, skompilowany HTML / CSS / JS
├── README.md   # link do oryginalnego pena
└── LICENSE.txt # licencja MIT autora
```

## Terminale

| Projekt | Autor | Oryginał | Uwagi |
|---|---|---|---|
| [Fallout 3 Terminal](terminals/fallout-3-terminal) | 32bitkid | [pen](https://codepen.io/32bitkid/pen/DrXOVg) | LESS + JS; usunięty zbędny prefixfree.js |
| [Fallout Terminal CSS Theme](terminals/fallout-terminal-inspired-css-theme) | macktropolis | [pen](https://codepen.io/macktropolis/pen/vNMRpK) | prawie samo CSS |
| [Terminal UI](terminals/terminal-ui) | arcticben | [pen](https://codepen.io/arcticben/pen/OWYyeo) | wymaga jQuery 2.1 + GSAP 1.19 (CDN) |
| [Terminal](terminals/terminal) | ronaldsvilcins | [pen](https://codepen.io/ronaldsvilcins/pen/jPXBJO) | bez zależności |
| [CSS Terminal Window](terminals/css-terminal-window) | joshcummingsdesign | [pen](https://codepen.io/joshcummingsdesign/pen/qOKaWd) | czyste CSS |
| [termynal.js](terminals/termynal-js-a-lightweight-and-modern-animated-terminal-window) | ines | [pen](https://codepen.io/ines/pen/MoaRYM) | animowane wpisywanie komend |

## Guziki i efekty

| Projekt | Autor | Oryginał | Uwagi |
|---|---|---|---|
| [Button Hover Effects](effects/button-hover-effects) | kjbrum | [pen](https://codepen.io/kjbrum/pen/wBBLXx) | |
| [Button Hover (box-shadow)](effects/button-hover-effects-with-box-shadow) | giana | [pen](https://codepen.io/giana/pen/BZaGyP) | |
| [Hover.css](effects/hover-css) | Ian Lunn | [pen](https://codepen.io/IanLunn/pen/AxBReL) | pełna biblioteka: [IanLunn/Hover](https://github.com/IanLunn/Hover) |
| [Animated Back Glow](effects/animated-back-glow) | georgehastings | [pen](https://codepen.io/georgehastings/pen/xgwxgo) | |
| [Neon Glass Context Menu](effects/neon-glass-context-menu) | simeydotme | [pen](https://codepen.io/simeydotme/pen/PwwYZOe) | |
| [Neumorphic Elements](effects/neumorphic-elements) | myacode | [pen](https://codepen.io/myacode/pen/PoqQQNM) | ładuje cudzy Font Awesome Kit – podmień przy użyciu |
| [Modal Animations](effects/modal-animations) | designcouch | [pen](https://codepen.io/designcouch/pen/obvKxm) | |
| [Fancy Slider](effects/fancy-slider) | suez | [pen](https://codepen.io/suez/pen/wMMgXp) | |
| [AOS – animacje przy scrollu](effects/aosanimations) | michalsnik | [pen](https://codepen.io/michalsnik/pen/WxNdvq) | |
| [Subscriber Coaster](effects/subscribercoaster) | cobra_winfrey | [pen](https://codepen.io/cobra_winfrey/pen/VwYBRvj) | |
| [Three Dots – loadery](effects/three-dotscss-loading-animations-made-with-single-element) | nzbin | [pen](https://codepen.io/nzbin/pen/GGrXbp) | pełna biblioteka: [nzbin/three-dots](https://github.com/nzbin/three-dots) |

## Licencja

Każdy efekt jest objęty licencją MIT swojego autora – patrz `LICENSE.txt` w danym folderze.
Przy użyciu w innym projekcie zachowaj tę informację o licencji i autorze.
Galeria `index.html` i ten README są moje.
