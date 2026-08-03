# Project Brief

ENKO Logo Tool is a browser-based generator for systematic subbrand signs for ENKO.

The design idea: take a letter as source material and transform it through a radial modular grid. The output should feel like a clean graphic symbol, not a shredded texture.

## Current Stack

- Static `index.html`
- Plain CSS in `src/styles.css`
- Plain JavaScript and SVG in `src/app.js`
- Hidden Canvas mask for glyph coverage analysis
- No build step
- SVG export
- PNG export
- JSON export for generation parameters

## Current Best Direction

The current strategic direction favors symmetric, logo-like systems derived from `Радиальная эмблема` and `Квадратный калейдоскоп`.

- `Priority`: radial repetition and 4x/8x square reflection
- `Letter sensitivity`: coverage, stroke depth, counterforms, and radial intersection profiles
- `Render`: vector solid cells
- `Cell gaps`: 8-18
- `Fill threshold`: 10-24
- `Grid`: off for final sign, on for debugging

`Розетка` remains the stable baseline. The strongest new refinement candidate is `Морфокалейдоскоп`; `Герб-мандала` is the main hybrid candidate.

## Current Experiment

Three glyph-driven families are available for comparison:

- `Квадратный калейдоскоп`: strict modular system with 4x/8x reflection.
- `Радиальная эмблема`: expressive concentric repetition across petals and layers.
- `Модульный герб`: large axial bars, central diamonds, circles, and corner modules.

Current preliminary balance:

- `Модульный герб` is the strongest logo-like direction.
- `Радиальная эмблема` is the most expressive and decorative.
- `Квадратный калейдоскоп` is the quietest and most systematic.

Three high-symmetry hybrids increase sensitivity to the source letter:

- `Радиальный отпечаток`: ray-intersection profiles control repeated radial modules.
- `Морфокалейдоскоп`: reflected module orbits respond to stroke depth, direction, and counterforms.
- `Герб-мандала`: a morph-kaleidoscope core is joined to a radial fingerprint perimeter.

The first comparison across `Э`, `А`, `Ж`, and `О` favors `Морфокалейдоскоп` for compact logo character. `Радиальный отпечаток` is the most expressive, while `Герб-мандала` has the richest hybrid structure and needs continued tuning of the relationship between core and perimeter.

Three asymmetric glyph-derived families are also available:

- `Тектоника`: the strongest current asymmetric logo-like direction.
- `Скелет`: the closest relationship to the internal construction of the glyph.
- `Упаковка`: the freest and most abstract composition.

Four additional glyph-seed experiments extend the generator beyond reflection, graphs, and packing:

- `Арматура`: directional bars and junction markers inferred from local stroke structure.
- `Изолинии`: nested erosion contours derived from the glyph distance field.
- `Матрица`: a compact geometric base with glyph-derived negative cutouts.
- `Кристалл`: a deterministic irregular triangle mesh filtered by glyph coverage.

The first visual pass makes `Матрица` and `Кристалл` the strongest new emblem-like candidates. `Изолинии` is the clearest contour-driven family, while `Арматура` remains the most literal and constructional.

Each mode remembers its own structural parameters while the user compares templates.

## Avoided Directions

- Heavy raster slicing can look like shredded paper.
- Large background letters are not desired.
- Letter duplication around the circle is not desired.
- Ray/trapezoid cell profiles and rounded cell corners were tested and rolled back.
- Detail/spread controls for rings were tested and rolled back.

## Working Ritual

At the start of a new session, read:

```text
docs/brief.md
docs/decisions.md
docs/session-log.md
```

When changing the generator mechanics, also read:

```text
docs/algorithm.md
```

At the end of a meaningful session:

```text
update docs/session-log.md
git status
git add .
git commit -m "..."
git push
```
