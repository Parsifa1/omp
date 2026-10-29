---
name: skill-script-execution
description: "Execute skill scripts using skill:// URIs with throwaway uv venv in /tmp instead of searching or running local scripts/"
condition: '(?<![\w/])\.?/?scripts/|\bfind\b.*\.sh|\buv pip install\b'
question: "Is the output running, searching for, or discussing a skill script using a local relative path (like `scripts/...`) or struggling with skill package dependencies instead of using `skill://` with a `/tmp` uv venv?"
scope: "tool"
---

When executing scripts referenced in skills:
1. Use `skill://<skill-name>/scripts/...` directly in `bash` or tools — it auto-resolves without copying or local file lookup.
2. For missing dependencies, create a throwaway venv in `/tmp`: `uv venv /tmp/venv-<skill>` and `uv pip install --python /tmp/venv-<skill>/bin/python <pkg>`.
3. Run with `PYTHONPATH=skill://<skill-name>/scripts /tmp/venv-<skill>/bin/python skill://<skill-name>/scripts/...`.