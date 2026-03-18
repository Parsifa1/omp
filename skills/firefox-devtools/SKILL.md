---
name: firefox-devtools
description: Load Firefox DevTools MCP on-demand for browser debugging via Zen/Firefox remote protocol. macOS only — requires Zen.app at /Applications/Zen.app.
mcp:
  firefox-devtools:
    command: pnpx
    args:
      - "@padenot/firefox-devtools-mcp@latest"
      - --firefox-path
      - /Applications/Zen.app/Contents/MacOS/zen
      - --profile-path
      - "/Users/parsifa1/Library/Application Support/zen/Profiles/mcp"
    env:
      START_URL: about:home
      MOZ_REMOTE_ALLOW_SYSTEM_ACCESS: "1"
---

# Firefox DevTools MCP

使用此 skill 在需要浏览器调试时按需启动 Firefox DevTools MCP，避免长驻后台进程污染全局 MCP 环境。

## 前置条件

> **仅限 macOS。** 此 skill 依赖 `/Applications/Zen.app` 及 macOS 特定路径，在 Linux / Windows 下不可用。非 macOS 环境下禁止加载。

- 操作系统：macOS（darwin）
- Zen Browser 已安装于 `/Applications/Zen.app`
- 已创建名为 `mcp` 的 Zen Profile，路径为 `~/Library/Application Support/zen/Profiles/mcp`

## Workflow

1. 确认当前系统为 macOS，否则停止。
2. 加载此 skill。
3. 调用 `skill_mcp`，`mcp_name="firefox-devtools"`。
4. 使用返回的工具进行浏览器调试（DOM 检查、网络请求、控制台等）。
5. 调试完成后无需手动清理，进程随 skill 卸载自动退出。

## Notes

- **仅限 macOS**，非 macOS 环境下禁止加载此 skill。
- 仅在需要前端/浏览器调试时加载，保持全局 MCP 干净。
- `MOZ_REMOTE_ALLOW_SYSTEM_ACCESS=1` 允许 MCP 通过远程协议访问浏览器实例。
- 若 Zen 未运行，MCP 会自动启动它并使用指定 profile。
