---
name: use-dedicated-tools
description: "Do not run cat/head/tail/grep/rg/find/fd/sed -i in bash — use the dedicated read/grep/glob/edit tools instead."
condition: "(?m)^\\s*(cat|head|tail|less|more)\\s+(?!/dev/(null|tty))|^\\s*(grep|rg|ripgrep|ag|ack)\\s|^\\s*(find|fd|locate)\\s+.*(-name|-iname|-type|--type|-glob)|^\\s*sed\\s+[^\\n]*(-i(?!\\w)|--in-place)|(?:^|[;&|]\\s*)\\s*perl\\s+(?:-[^\\s]*i|[^\\n]*\\s-[^\\s]*i)|^\\s*awk\\s+[^\\n]*-i\\s+inplace"
scope: "tool:bash"
interruptMode: "always"
---

Do not read, search, or edit files through the `bash` tool. It has dedicated equivalents that are faster, respect `.gitignore`, and produce structured output:

- `cat` / `head` / `tail` / `less` / `more` on files → use the `read` tool (it provides better context and handles binary files)
- `grep` / `rg` / `ag` / `ack` → use the `grep` tool
- `find` / `fd` / `locate` with name/type/glob filters → use the `glob` tool
- `sed -i` / `perl -pi` / `awk -i inplace` → use the `edit` tool (it has diff preview, fuzzy matching, and seen-line validation)

Shortcut: the dedicated tools give paging, context lines, and artifact spilling for free; a raw shell command does not.