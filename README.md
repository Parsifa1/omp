# My oh-my-pi config

A personal configuration for [oh-my-pi](https://github.com/nicepkg/oh-my-pi), built around multi-model routing, specialized subagents, MCP integrations, extensions, and theme customization.

## Model Configuration (`models.yml`)

Models are routed through **Magpie** using the OpenAI Responses API:

| Role | Current model |
|---|---|
| default | GLM 5.3 Flash Max |
| designer | Gemini 3.8 Flash |
| vision / smol / commit | DeepSeek Flash |
| review | GPT-5.6 Sol |
| plan | GPT-5.6 Terra |
| slow | GPT-6 Astra |

Routing is configured through `modelRoles` in `config.yml`. The API key is provided via the `MAGPIE_API_KEY` environment variable.

## Core Configuration (`config.yml`)

- **Theme**: Everforest dark with Nerd Font symbols
- **Status line**: Path, Git branch, model, context usage, total tokens, and subagent count
- **Context compaction**: Enabled; triggers at 85%, using `snapcompact`, `remote`, then `soft`, and superseding older reads
- **Memory**: Mnemopi backend enabled, scoped by project tag, with automatic branch summaries
- **Rendering and tools**: Mermaid, calculator, and asynchronous execution enabled
- **Task execution**: Task isolation enabled with `generic` commit mode; default tasks are eagerly scheduled and show the resolved model badge
- **Bash interceptor**: Enabled; recommends `pnpm` / `pnpx` instead of `npx` for Node.js projects
- **Todo reminders**: Enabled, with a maximum of 5 reminders
- **MCP**: Tool notifications enabled
- **Secrets**: Enabled; API keys and other sensitive values are injected through the secrets system
- **GitHub integration**: Enabled
- **Edit mode**: hashline (line-anchored editing)
- **LSP diagnostics**: Reported during edits
- **Retry policy**: Up to 5 retries
- **Checkpoints**: Disabled
- **Browser**: Headless mode
- **Claude user/project commands**: Disabled
- **Disabled providers**: opencode, llama.cpp, LM Studio, Ollama, and local

## Subagents (`agents/`)

Each agent specializes in a domain and is dispatched as needed:

| Agent | Model | Responsibility |
|---|---|---|
| **plan** | `pi/plan` / `pi/slow` | Software architect; read-only analysis and implementation plans for complex requests |
| **reviewer** | `pi/review` | Code review; reports bugs, risks, and correctness verdicts |
| **oracle** | `pi/slow` | Deep diagnostic advisor for dead ends, architectural tradeoffs, and subtle bugs |
| **designer** | `pi/default` | UI/UX implementation, design review, and accessibility |
| **explore** | `magpie/copilot/auto` / `pi/smol` | Fast, read-only codebase exploration with concise context handoffs |
| **librarian** | `pi/smol` | Verifies library and API details against source code |
| **task** | `default` | General-purpose agent for multi-step tasks |
| **quick_task** | `pi/smol` | Low-overhead execution of mechanical tasks |

Agent collaboration: `plan` → `explore`; `reviewer` → `explore` + `task`; `oracle` → `explore`; `designer` → `explore`.

## MCP Servers (`mcp.json`)

- **Context7**: Context-aware documentation retrieval over HTTP, using `CONTEXT7_API_KEY`
- **Firefox DevTools**: Disabled by default; can be enabled on demand, launched with `pnpx`, and configured for macOS Zen Browser
- **HopperMCPServer**: Disabled by default; configured for the macOS Hopper reverse-engineering tool

## Skills (`skills/`)

- **skill-execution**: Resolves `skill://` paths when running scripts bundled with Skills; uses temporary `uv` virtual environments for missing dependencies to avoid polluting the workspace

## Extensions (`extensions/`)

- **comment-checker**: Checks code comments; provides an extension hook and CLI
- **skill-mcp**: Bridges Skill MCP servers to oh-my-pi
- **axonhub-trace**: Adds session thread and per-turn trace identifiers to AxonHub requests
- **claude-metadata-device-id**: Adds `device_id` and `account_uuid` metadata to Claude requests
- **herdr-omp-agent-state**: Reports oh-my-pi session, agent, and tool state to Herdr; installed and managed by Herdr

## Other Files

- `themes/everforest.json`: Everforest theme definition
- `.env`: Local environment variables; do not commit sensitive values
- `ssh.json`: SSH-related configuration
***
