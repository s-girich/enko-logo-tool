# Decisions

## Brand And Output

- The generator is for a systematic ENKO subbrand identity, not one-off decorative logos.
- The output should be a square 1:1 graphic sign.
- The sign should be generated from a letter, but the final image does not need to read as a literal untouched letter.

## Rendering

- The visible preview and primary export are SVG.
- The hidden Canvas is retained only as a glyph coverage mask.
- PNG remains available as a 2000 x 2000 raster export rendered from the current SVG.
- The generator has one visual mode: vector solid cells.

## Transformation

- The letter is drawn into a hidden canvas.
- Coverage is sampled across the area of each radial cell.
- Cells above the fill threshold become opaque SVG paths.
- Grid lines and the outer boundary are debugging guides and appear only when `showGrid` is enabled.
- Raster fragments, refraction, and mixing controls were removed.
- Numeric controls have no artificial min/max limits so practical ranges can be established through testing.
- Large row counts are normalized into the available radius; total and post-gap cell counts remain visible.
- `Квадратный калейдоскоп` is the first experimental non-radial mode.
- Its output is derived from a folded glyph seed and a fixed vector vocabulary: rectangles, circles, diamonds, and quarter circles.
- Fourfold and eightfold symmetry are supported; symmetric modules share shape and color.

## Rolled Back

- A large background letter behind the grid was removed.
- Duplicating the whole letter around the circle was removed.
- Ring detail and ring spread controls were rolled back.
- Ray-like trapezoid profiles and rounded corners were rolled back.

## Git

- The project is under git on branch `main`.
- The GitHub remote is `https://github.com/s-girich/enko-logo-tool.git`.
- Generated exports in `output/` should not be committed.
