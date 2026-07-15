# Easy Job Apps agent guidance

## Repository workflow

- Work directly in the canonical checkout at `/home/carlos/Documents/GitHub/easyjobapps` on `main`; do not create worktrees for this repository.
- Preserve unrelated changes and inspect `git status` before editing.
- Commit completed work with a scoped commit.
- Do not run production deployment or synchronize remote runtime files unless the active task explicitly requires it.

## Architecture reference

Before changing the Chrome side panel, content scripts, service worker, storage flow, message routing, Webpack configuration, or development scripts, read:

- `agent_sidepanel_architecture.md` — agent-oriented component boundaries, message journeys, state ownership, development/reload workflow, and known hazards.
- `docs/dual-use-architecture.md` — human-facing web/extension architecture overview.

Treat `manifest.json`, `package.json`, `webpack.config.js`, and current source code as authoritative when they differ from documentation.
