---
name: use-python-not-python3
description: "Use `python` instead of `python3` in shell commands"
condition: "\"command\"\\s*:\\s*\"[^\"]*\\bpython3\\b"
scope: "tool"
---

This environment does not provide a `python3` binary. Run Python using `python` instead, or use the `eval` tool (with `language: "py"`).