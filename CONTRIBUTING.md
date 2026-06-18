# Contributing

Thanks for your interest in Pixin! This is a small, fast-moving project — contributions,
issues, and ideas are welcome.

## Getting set up

```bash
pnpm install
pnpm dev        # game at http://localhost:5173/ · editor at /?edit
```

Requirements: **Node 20+** and **pnpm**.

## The green bar

Before opening a PR, make sure all three pass:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

New / changed files should also be Prettier-clean (`npx prettier --check <files>`). Many
behaviours are visual — give them a quick **`pnpm dev`** smoke (the `/` and `/?edit` routes
should serve), and note in the PR what you verified.

## How we work

This project follows a documented loop (see [`AGENTS.md`](AGENTS.md) and
[`agent_docs/workflow.md`](agent_docs/workflow.md)): **analyze → propose architecture → execute →
log → commit message**. In particular:

- **Append a `agent_docs/dev_log.md` entry after every change** (newest on top: _What / Why /
  How_). It's the project's memory — not optional.
- **Document editor features** in [`agent_docs/editor_guide.md`](agent_docs/editor_guide.md) when
  you add or change one.
- **Respect the invariants** in `AGENTS.md` (view ≠ logic, no per-frame state in the store,
  data-driven systems, strong types — no `any`, the game runs without the LLM). If a change
  conflicts with them, raise it in the issue/PR first.
- **Schema-first.** Every feature extends the one `GameDoc` schema (`src/data/schema.ts`), then
  the runtime that plays it, then the editor that authors it — extend via discriminated-union
  `kind`s so it stays backward-compatible.

## Commits & PRs

- Branch off `main`; keep PRs focused.
- Write a clear commit message (what + why). End AI-assisted commits with a `Co-Authored-By:`
  trailer.
- Reference the relevant roadmap milestone where it helps.

## Reporting issues

Include what you did, what you expected, what happened, and (for visual bugs) a screenshot or
the scene / `game.json` snippet that reproduces it.

By contributing you agree your work is licensed under the project's [MIT license](LICENSE).
