---
name: skill-execution
description: "Use when executing scripts, templates, or helper commands bundled inside any `skill://` resource. Triggers include: a skill's instructions reference `scripts/...`, `python scripts/...`, or helper commands that need to run; you see `skill://` paths in a skill's examples; a skill script fails with `ModuleNotFoundError`, `ImportError`, or missing dependency; you need to create a throwaway virtual environment for skill dependencies. Covers: resolving skill asset paths via `skill://` URIs (auto-resolved by the harness in bash and tools, no file lookup needed), creating a `uv` venv for missing packages, and running skill scripts with the correct working directory."
---

# Skill Execution

## Core fact

`skill://<name>/<path>` is a virtual path auto-resolved by the harness — usable directly in `bash`, `read`, `edit`, **no file lookup needed**. When a skill says `python scripts/office/unpack.py`, what actually runs is `python skill://<name>/scripts/office/unpack.py`.

Skill assets and workspace assets are not the same space: skill scripts live in the skill's directory tree, not in the current project.

## Missing packages

Skill scripts often depend on third-party packages (e.g. `defusedxml`, `docx`). Create a throwaway venv with `uv`, **named per-skill** to avoid cross-contamination:

```bash
uv venv /tmp/venv-<skill-name>
uv pip install --python /tmp/venv-<skill-name>/bin/python <missing-packages>
/tmp/venv-<skill-name>/bin/python skill://<name>/scripts/...
```

Disposable — don't pollute the workspace.

## cwd caveat

Skill scripts often use relative imports (e.g. `from helpers.merge_runs import ...`). The script's directory must be the cwd or on `PYTHONPATH`:

```bash
cd skill://<name>/scripts && /tmp/venv-<skill-name>/bin/python office/unpack.py ...
# or without cd:
PYTHONPATH=skill://<name>/scripts /tmp/venv-<skill-name>/bin/python skill://<name>/scripts/office/unpack.py ...
```

## Key points

- `skill://` URIs work directly in bash and tools — no file lookup
- Missing packages → `uv venv` + `uv pip install --python`, throwaway env
- Relative imports → cwd or `PYTHONPATH` pointing at the script's directory
