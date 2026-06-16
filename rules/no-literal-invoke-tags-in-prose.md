---
name: no-literal-invoke-tags-in-prose
description: "Never type tool-call <invoke>/<parameter> tags as prose text — emit a real tool call through the function-calling channel"
condition: ["<invoke\\s+name=", "</invoke>", "<parameter\\s+name="]
scope: "text"
---

STOP. You are typing tool-call invocation syntax (`<invoke name=...>`, `<parameter name=...>`, `</invoke>`) as literal prose. This executes NOTHING — the read/edit/bash never runs and the user sees dead markup.

Prose and tool calls are SEPARATE channels:
- Prose (this text stream) = terse reasoning and reporting only.
- Tool calls = structured invocations emitted through the function-calling channel.

When you intend to act, issue the actual tool call. NEVER write the word `call` followed by `<invoke>`/`<parameter>` tags. If you catch yourself mid-sentence about to emit these tags, delete them and make the real call instead. This has already been corrected multiple times — do not repeat it.