---
name: use-dedicated-tools
description: "Do not run cat/head/tail/grep/rg/find/fd/sed -i in bash — use the dedicated read/grep/glob/edit tools instead."
condition: '(?:(?:"command"\s*:\s*"|[;&]\s*|\|\|\s*|\|&\s*|\\n)(?:\\[nrt]|\s)*)(?:(?:cat|head|tail|less|more)\s+(?!/dev/(?:null|tty))|(?:grep|rg|ripgrep|ag|ack)\s|(?:find|fd|locate)\s+(?:\\.|[^"])*?(?:-name|-iname|-type|--type|-glob)|sed\s(?:\\.|[^"])*?(?:-i(?!\w)|--in-place)|awk\s(?:\\.|[^"])*?-i\s+inplace|perl\s+(?:-[^\s]*i|(?:\\.|[^"])*?\s-[^\s]*i))'
scope: "tool:bash"
interruptMode: "always"
---

Do not read, search, or edit files through the `bash` tool. It has dedicated equivalents that produce structured, token-efficient output and reach cases raw shell text cannot:

- `cat` / `head` / `tail` / `less` / `more` on files → use the `read` tool (line ranges, binary/image/PDF/archive/notebook decoding, paging with footers, `scheme://` paths)
- `grep` / `rg` / `ag` / `ack` → use the `grep` tool (results grouped per file, unified gitignore/skip semantics, no dependence on output truncation for large hit sets)
- `find` / `fd` / `locate` with name/type/glob filters → use the `glob` tool (nearest-first ordering, dirs marked, no raw path stream to parse)
- `sed -i` / `perl -pi` / `awk -i inplace` → use the `edit` tool (diff preview, fuzzy matching, seen-line validation, LSP diagnostics, atomic write)

Speed is not the reason. The embedded shell runs these in-process (no fork/exec), so the wall-clock gap is small. The reasons are output shape (tokens you actually pay for), coverage (binaries, documents, `scheme://` URLs, paging), and safety (atomic writes, diagnostics).

Exempt: a stage that consumes another command's stdout through `|` — `ps aux | grep python`, `git log | grep fix` — because a path-based dedicated tool cannot be fed that stdin. Also `/dev/null` and `/dev/tty` reads, and pure data pipelines (`sort | uniq -c`, `wc -l`).