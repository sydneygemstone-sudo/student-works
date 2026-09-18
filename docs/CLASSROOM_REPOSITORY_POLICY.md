# Classroom Repository Policy

GitHub is the only durable source of truth for student projects.

## Rules
1. Start work from the canonical GitHub repository, not from an old Desktop/dev folder.
2. Local checkouts are temporary working copies only.
3. Specs, classroom decisions, QA evidence, screenshots worth preserving, handoff notes, and development logs must be committed to GitHub.
4. Never leave the only copy of a requirement or handoff in Desktop, /dev, /mnt/data, Downloads, or an MCP control folder.
5. Large classroom projects may use standalone repositories. The student-works repository keeps an index and pointer, not a second editable copy.
6. Generated dependencies and caches such as node_modules, venvs, runtime logs, and browser caches are not source assets and must not be archived as source.

## End-of-class closeout
- Run tests and classroom QA.
- Update the project devlog/handoff.
- Commit and push all durable work.
- Create or update a dated classroom snapshot tag when appropriate.
- Verify the remote branch/tag and required files.
- Remove the temporary local checkout when it is no longer needed.

If remote verification fails, keep the local working copy and mark the closeout blocked.
