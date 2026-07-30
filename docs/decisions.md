# Decisions

## Brand And Output

- The generator is for a systematic ENKO subbrand identity, not one-off decorative logos.
- The output should be a square 1:1 graphic sign.
- The sign should be generated from a letter, but the final image does not need to read as a literal untouched letter.

## Rendering

- Current exploration uses raster/canvas for speed and flexibility.
- SVG/vector export is postponed until the visual mechanics are stable.
- PNG export is acceptable during the visual search phase.

## Transformation

- The letter is drawn into a hidden canvas.
- The visible sign is generated from radial grid cells.
- Two render modes exist:
  - raster fragments: cells clip and transform pieces of the source letter;
  - solid cells: cells become filled modules when enough of the letter falls inside them.
- The cleaner direction is `solid cells`, because it produces more canonical graphic signs.

## Rolled Back

- A large background letter behind the grid was removed.
- Duplicating the whole letter around the circle was removed.
- Ring detail and ring spread controls were rolled back.
- Ray-like trapezoid profiles and rounded corners were rolled back.

## Git

- The project is under git on branch `main`.
- The GitHub remote is `https://github.com/s-girich/enko-logo-tool.git`.
- Generated exports in `output/` should not be committed.
