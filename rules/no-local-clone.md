---
name: no-local-git-clone
description: "Never clone remote repos locally without explicit user approval — use the github tool or gh instead"
condition: "\\bgit\\s+clone\\b"
scope: "tool"
---

Do NOT clone remote repositories to the local machine. Per the user's AGENTS.md, GitHub operations (searching code/repos, reading files, viewing PRs) MUST go through the `github` tool; `gh` CLI (authenticated, separate rate limit) is the fallback. `git clone` to local is forbidden unless the user explicitly asked for it in this conversation. If you hit a rate limit or tool error, switching to the `github` tool or `gh api` is the correct move — never route around it by cloning. If a clone is genuinely unavoidable, ask the user first, use `/tmp`, and delete it when done.