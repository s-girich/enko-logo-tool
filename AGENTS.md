# ENKO Logo Tool - Agent Notes

## Start Command

When the user writes exactly `start` or asks to start/resume this project, do this before other work:

1. Read `docs/brief.md`.
2. Read `docs/decisions.md`.
3. Read `docs/session-log.md`.
4. If the next task changes generator mechanics, also read `docs/algorithm.md`.
5. Reply with a short status summary:
   - current project direction;
   - last stable state;
   - likely next step.

Keep this startup summary concise.

## Session Context

At the start of a work session, read these files before making project decisions:

1. `docs/brief.md`
2. `docs/decisions.md`
3. `docs/session-log.md`
4. `docs/algorithm.md` when changing generator mechanics

Keep updates concise. At the end of meaningful work:

1. Update `docs/session-log.md`.
2. Update `docs/brief.md` or `docs/decisions.md` only when stable project direction changes.
3. Commit changes with a short, meaningful message.

Do not commit generated exports from `output/`.
