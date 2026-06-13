# Problem-Solving Workflow

Follow this loop for **every** task. Don't skip analysis or the log.

## 1. Analyze the assignment

- Re-read the request. Identify what's actually being asked and what "done" looks like.
- **Check available skills first** — the global `pixijs-*` skills for any PixiJS work (start from the `pixijs` router). Pull in only what's relevant.
- Read the relevant `agent_docs/` doc(s) for the area you're touching (see the progressive-disclosure list in `AGENTS.md`). Don't load everything.
- If anything is **missing, ambiguous, or needs a design/product decision the user should make → ask before building.** A wrong assumption costs more than a question. State any assumptions you do make inline.
- Do focused research only if skills + docs don't cover it.

## 2. Propose architecture

- Before writing code, outline the approach: which files/modules, what data shapes, how it fits the existing structure and the **invariants** in `AGENTS.md`.
- Respect the invariants (view/logic separation, scene-graph rendering, state split, data-driven systems, strong types). If the task seems to require breaking one, **stop and flag it** — don't work around it.
- **Don't over-engineer.** Match scope to a throwaway jam: the simplest thing that works and stays swappable. YAGNI — build the thin version now, enrich when actually needed.
- For non-trivial changes, get a quick nod on the approach before executing.

## 3. Execute

- Implement the agreed approach.
- Keep changes focused on the task; don't refactor unrelated code without flagging.
- Run typecheck + lint before considering it done.
- **If the task adds or changes anything in `src/editor/`** (a panel, control, or
  authoring flow), **update `agent_docs/editor_guide.md`** in the same task — the
  editor is the OSS product surface, so its usage docs must never lag the code.

## 4. Log

- After finishing, append an entry to `agent_docs/dev_log.md`: **what** you did, **why**, and **how** you approached it (key decisions, tradeoffs, anything the next session needs).
- This is the project's running memory. **Mandatory, not optional.**

## 5. Propose a commit message

- After logging, **propose a commit message** for the change — a concise subject plus a short body covering what/why. Match the repo's existing commit style.
- **Don't run `git commit` or `git push` unless explicitly asked.** Propose the message text; the user commits.

## 6. Point to the next step

- When a task completes a milestone in `agent_docs/roadmap.md` — or a meaningful chunk of one — finish by **proposing which milestone/phase to tackle next**, and **tick the roadmap's checkboxes** for what's done.
