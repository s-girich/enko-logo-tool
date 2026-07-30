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

## Finish Command

When the user writes exactly `finish` or asks to close/wrap up the session, do this:

1. Check `git status --short`.
2. Summarize what changed during the session.
3. Update `docs/session-log.md` with:
   - date;
   - done;
   - current state;
   - next ideas.
4. Update `docs/brief.md`, `docs/decisions.md`, or `docs/algorithm.md` only if stable project direction, decisions, or mechanics changed.
5. Show the documentation changes briefly.
6. Commit with a short message if the user wants the session saved.
7. Remind the user to push with GitHub Desktop if command-line push is unavailable.

Keep the final user-facing summary short and practical.
