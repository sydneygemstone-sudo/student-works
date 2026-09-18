# Development Log Convention

Each project needs one obvious history entrypoint.

A useful dated entry records:
- date and classroom/session purpose;
- baseline commit;
- student-confirmed requirements or feedback;
- changes actually made;
- tests and real device/browser checks;
- known issues and deferred ideas;
- final commit and tag;
- next-session reading order.

Prefer short dated Markdown entries plus Git history and QA evidence. Do not duplicate large transcripts across repositories.

Recommended layout:
- `docs/DEVLOG.md` for a short index;
- `docs/devlog/YYYY-MM-DD.md` for substantial session notes;
- `_qa/YYYY-MM-DD/` for evidence;
- a dedicated handoff file when the next session has unresolved work.
