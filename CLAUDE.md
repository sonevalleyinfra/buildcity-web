# CLAUDE.md

Guidance for coding agents working in this repository.

## Read first

- `docs/rules.md`: hard-locked business rules and calculations. Do not change these formulas without written confirmation.
- `docs/architecture.md`, `docs/prd.md`, `docs/design.md`: how the product is built and why.
- `docs/task.md`: roadmap and history. `docs/memory.md`: project notes.

## Work tracking

Every task is a GitHub issue in this repo, and every project sits on one board: https://github.com/users/pilgrim-AIEngineer/projects/1 (columns: Backlog, Next, Doing, Review, Done; this repo is the "BuildCity" project).

- At the start of a session, say which issue you are working on. If the work has no issue, create one first.
- A bug or new idea found in the middle of a task is filed as a new issue, mentioned in one line, and left for later. Do not switch tasks unless the human says "switch" or production is down.
- When you stop, write the exact next step as a comment on the issue.
- The existing `office:*`, `p1`-`p3` and `role:*` labels stay in use; the board mirrors them.
- On Sumit's PC the board is updated with `~/.claude/board.ps1` (see the global `~/.claude/CLAUDE.md`). Cloud sessions cannot reach the board: file the issue and say the board was not updated.
