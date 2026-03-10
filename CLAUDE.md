# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Wedding app — repository linked to https://github.com/acstoian/weddingapp.git.

> This file should be updated once the project is scaffolded with actual build commands, architecture notes, and development workflows.

## Working Principles

### 1. Plan by Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep the main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project context

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## UI/UX Design

**MANDATORY: Always use the `ui-ux-pro-max` skill for any UI/UX work on this project.**

When implementing any frontend UI — components, pages, layouts, design systems, or visual decisions — invoke the skill before writing code:

```
/ui-ux-pro-max
```

This applies to:
- New pages (dashboard, gallery, editor, pricing, auth)
- Component design (cards, modals, forms, navigation, buttons)
- Layout decisions (spacing, typography, color palette)
- Responsive/mobile design
- Any design review or improvement task

Do NOT design UI from scratch without invoking this skill first. It is installed from https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.

## Environment

- **Python is available** — use `py` (the Windows Python Launcher) as the Python command. `python` and `python3` are NOT on PATH. Always use `py` (e.g. `py script.py`, `py -c "..."`).

## Core Principles

- **Simplicity First**: Prefer the simplest solution that correctly solves the problem
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.

## Session Continuity

**At session start:** Read in order: `.claude/context-snapshot.md` (if exists) → `.claude/nextsession.md` → `.claude/decisions.md` → `.claude/sessionlog.md`. Then briefly tell the user the current project state and what will be worked on first.

**At ~70% context:** Automatically run `/done` without waiting to be asked. This writes a comprehensive `context-snapshot.md` capturing all session detail, updates all session docs, then instructs the user to start a new session. The new session loads context-snapshot.md and resumes with zero information loss.

**Commands:**
- `/done` — update all session docs (sessionlog + nextsession + decisions)
- `/update-session` — update sessionlog.md only
- `/update-next` — update nextsession.md only
- `/update-decisions` — update decisions.md only
