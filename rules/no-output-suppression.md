---
name: no-output-suppression
description: "Do not pipe to grep/head/tail to preview output, and do not discard stderr with 2>/dev/null — run raw commands and let omp spill/truncate."
condition: "(?m)\\|\\s*(rg|grep|head|tail)\\b|^(?!\\s*(?:command\\s+-v|which|type|hash|test\\b|\\[\\s)).*\\b2(>|&1>&?)?/dev/null\\b"
scope: "tool:bash"
interruptMode: "always"
---

Two bad habits throw away output omp would have handled for free:

## 1. Filtering pipes as "preview"

Never chain `| grep`, `| head`, `| tail`, `| rg`, or `2>&1 | grep ...` to preview output. If guessed keywords miss, all useful output is lost, the command execution is wasted, and it has to be rerun anyway.

Run the raw command directly (e.g. `cargo test --quiet --test foo`). When output is long, omp automatically spills the full output to an artifact path; inspect it page by page using `read` without losing any details.

Exception: when the command is itself a data-processing pipeline (`sort | uniq -c` for aggregation, `wc -l` for counting) and the filtering criteria are not guesses against unknown diagnostic output.

## 2. Discarding stderr with `2>/dev/null`

Never suppress stderr with `2>/dev/null` (or `2>/dev/null` combined output forms like `2>&1 >/dev/null`). omp captures stdout and stderr separately with truncation and artifact spilling — there is no noise problem to solve, and the suppressed stderr is exactly where failure diagnostics live (command errors, missing files, parse failures). A silently failing command costs a rerun to debug.

Exception: exit-code probes that intentionally ignore output, such as `command -v foo 2>/dev/null`, `which foo 2>/dev/null`, `test -e path 2>/dev/null`, `type foo 2>/dev/null`, or `[ -f x ] 2>/dev/null`.
