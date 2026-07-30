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

The strongest direction is a modular, canonical graphic render:

- `Template`: `Розетка`
- `Render`: vector solid cells
- `Cell gaps`: 8-18
- `Fill threshold`: 10-24
- `Grid`: off for final sign, on for debugging

## Current Experiment

Three glyph-driven families are available for comparison:

- `Квадратный калейдоскоп`: strict modular system with 4x/8x reflection.
- `Радиальная эмблема`: expressive concentric repetition across petals and layers.
- `Модульный герб`: large axial bars, central diamonds, circles, and corner modules.

Current preliminary balance:

- `Модульный герб` is the strongest logo-like direction.
- `Радиальная эмблема` is the most expressive and decorative.
- `Квадратный калейдоскоп` is the quietest and most systematic.

Three asymmetric glyph-derived families are also available:

- `Тектоника`: the strongest current asymmetric logo-like direction.
- `Скелет`: the closest relationship to the internal construction of the glyph.
- `Упаковка`: the freest and most abstract composition.

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
