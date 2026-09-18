# ChatGPT Classroom Orchestration

For future classroom work, ChatGPT should treat GitHub as the starting and ending point.

## Session workflow
1. Read the project manifest and canonical repository.
2. Read the latest handoff, QA, devlog, branch, commit, and tags.
3. Create a temporary local checkout only when execution needs local files.
4. Work on a bounded branch or approved working tree.
5. Run tests and capture real QA evidence.
6. Update the dated devlog/handoff with facts, remaining gaps, and the exact tested commit.
7. Commit and push.
8. Add a classroom snapshot tag when the version is a useful rollback point.
9. Verify the remote refs and required files.
10. Remove temporary local project copies once the remote is verified.

Do not infer the newest version by scanning Desktop or /dev. Do not use a different project's session or worker without Dean confirming the execution target first.
