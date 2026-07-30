# Session Log

## 2026-07-30

### Done

- Replaced the visible Canvas renderer with an SVG renderer.
- Kept the hidden Canvas only for glyph coverage analysis.
- Removed the raster-fragment render mode and the inactive refraction and mixing controls.
- Added SVG export and retained PNG and JSON exports.
- Replaced numeric sliders with direct number fields for exact parameter tuning.
- Allowed decimal precision for continuous values while keeping sectors and row count integral.
- Removed artificial minimum and maximum limits from all numeric controls.
- Added safe fallback while number fields are being edited.
- Renamed `Ячейки` to `Ряды` and added live total/visible cell counts to the interface and JSON export.
- Normalized large row counts into the available radius instead of collapsing excess rings.
- Added the first non-radial mode: `Квадратный калейдоскоп`.
- Added fourfold and eightfold glyph-seed symmetry.
- Added a deterministic SVG vocabulary of rectangles, circles, diamonds, and quarter circles.
- Added symmetric multicolor palettes for the square mode.
- Added contextual controls so radial-only parameters are hidden in the square mode.
- Verified mirrored shape/color pairs, the existing rosette, and the mobile layout.
- Added `Радиальная эмблема` with glyph-driven tracks, petals, layers, and four radial primitives.
- Added `Модульный герб` with horizontal/vertical bars, central diamonds, circles, and corner modules.
- Connected gaps, scale, offset, threshold, and seed rotation across the three experimental families.
- Compared all three modes on `Э` and `Ж`.
- Verified radial repetition groups, SVG integrity, and mobile layout for all three modes.
- Identified `Модульный герб` as the preliminary best balance; kept all modes for continued testing.
- Improved cell classification from five probe points to a 5 x 9 area sample.
- Made filled modules fully opaque for a cleaner canonical sign.
- Set `Розетка`, 12 px gaps, and hidden grid as the default presentation.
- Made the outer boundary a debugging guide that is hidden with the grid.
- Created the initial ENKO Logo Tool project.
- Built a static browser app with `index.html`, `src/styles.css`, and `src/app.js`.
- Implemented a Canvas-based raster generator.
- Added radial grid templates:
  - `Кирпичная`
  - `Галактика`
  - `Лучевая`
  - `Смешанная`
  - `Штриховая`
  - `Пульс`
  - `Из буквы`
  - `Розетка`
- Added render modes:
  - `Растровые фрагменты`
  - `Закрашивать ячейки`
- Added controls for sectors, scale, offset, refraction, rows, row thickness, cell gaps, fill threshold, ring rotation, grid visibility, palette, PNG export, and JSON export.
- Added git and GitHub:
  - branch: `main`
  - remote: `https://github.com/s-girich/enko-logo-tool.git`
  - first commit: `Initial ENKO logo generator`
- Added project memory documentation:
  - `AGENTS.md`
  - `docs/brief.md`
  - `docs/decisions.md`
  - `docs/session-log.md`
- Added the project `start` command protocol in `AGENTS.md`.
- Added the project `finish` command protocol in `AGENTS.md`.

### Current State

- The stable direction is a clean modular SVG sign using `Розетка` and solid cells.
- The visible preview and downloaded SVG use the same path geometry.
- Desktop and mobile layouts were visually checked in the browser.
- The repository is synchronized with GitHub.
- The working tree should be kept clean after each meaningful session.
- In a new session, the user can write `start` to trigger the project memory workflow.
- At the end of a session, the user can write `finish` to trigger documentation and git wrap-up.

### Next Ideas

- Compare several letters and tune the area-coverage threshold range.
- Explore weighting samples toward cell centers or preserving connected groups.
- Explore alternate canonical grids that still derive from the source letter.
- Add curated presets for good ENKO-style outputs.

### Wrap-Up Notes

- Clarified the git workflow:
  - `commit` saves a project version locally;
  - `push` sends saved commits to GitHub;
  - uncommitted changes still exist in project files but are not recoverable as named git versions.
- Established a lightweight documentation workflow:
  - use `start` at the beginning of a new project session;
  - use `finish` at the end to update documentation and git history.
- Recommended continuing with GitHub Desktop for push when command-line authentication is not available, while learning terminal commands gradually.
