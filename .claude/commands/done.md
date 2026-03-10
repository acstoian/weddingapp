Perform a full session wrap-up. Do the following steps in order:

1. **Write `.claude/context-snapshot.md`** — a comprehensive snapshot of this session including:
   - What was worked on and why
   - All key decisions made and their rationale
   - Current state of every in-progress task
   - Any blockers, open questions, or TODOs
   - Important file paths and code locations touched
   - Anything the next session must know to resume with zero information loss

2. **Update `.claude/sessionlog.md`** — append a dated entry summarizing:
   - Tasks completed this session
   - What changed and where
   - Any issues encountered and how they were resolved

3. **Update `.claude/nextsession.md`** — overwrite with:
   - The single most important thing to do next session
   - Ordered list of follow-up tasks
   - Any warnings or gotchas to be aware of

4. **Update `.claude/decisions.md`** — append any architectural or design decisions made this session with rationale. If no new decisions were made, leave the file unchanged.

5. Tell the user: "Session docs updated. You can safely start a new session — context will be restored automatically."
