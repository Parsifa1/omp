---
name: no-piped-output-truncation
description: "Do not pipe commands to grep, head, or tail to filter output; run raw commands and let omp spill long outputs."
condition: "\\|\\s*(rg|grep|head|tail)\\b"
scope: "tool"
---

Never chain filtering pipes like `| grep`, `| head`, `| tail`, `| rg`, or `2>&1 | grep ...` to "preview" output. If guessed keywords miss, all useful output is lost, the command execution is wasted, and it has to be rerun anyway.

Correct approach: run the raw command directly (e.g. `cargo test --quiet --test foo`). When output is long, omp automatically spills the full output to an artifact path; inspect it page by page using `read` without losing any details.

Only exception: when the command itself is inherently a data-processing pipeline (e.g. `sort | uniq -c` for aggregation, `wc -l` for counting) and filtering criteria are not guesses against unknown diagnostic output.
