---
name: use-dedicated-tools
description: "Do not run cat/head/tail/grep/rg/find/fd/sed -i in bash — use the dedicated read/grep/glob/edit tools instead."
condition: '(?:(?:"command"\s*:\s*"|\\n)(?:\\[nrt]|\s)*)(?:(?:cat|head|tail|less|more)\s+(?!/dev/(?:null|tty))|(?:grep|rg|ripgrep|ag|ack)\s|(?:find|fd|locate)\s+(?:\\.|[^"])*?(?:-name|-iname|-type|--type|-glob)|sed\s(?:\\.|[^"])*?(?:-i(?!\w)|--in-place)|awk\s(?:\\.|[^"])*?-i\s+inplace)|(?:"command"\s*:\s*"|[;&|]\s*|\\n)(?:\\[nrt]|\s)*perl\s+(?:-[^\s]*i|(?:\\.|[^"])*?\s-[^\s]*i)'
scope: "tool:bash"
interruptMode: "always"
---

Do not read, search, or edit files through the `bash` tool. It has dedicated equivalents that are faster, respect `.gitignore`, and produce structured output:

- `cat` / `head` / `tail` / `less` / `more` on files → use the `read` tool (it provides better context and handles binary files)
- `grep` / `rg` / `ag` / `ack` → use the `grep` tool
- `find` / `fd` / `locate` with name/type/glob filters → use the `glob` tool
- `sed -i` / `perl -pi` / `awk -i inplace` → use the `edit` tool (it has diff preview, fuzzy matching, and seen-line validation)

Shortcut: the dedicated tools give paging, context lines, and artifact spilling for free; a raw shell command does not.