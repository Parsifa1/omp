---
name: remotify
description: Connect to and operate remote computers through the Remotify CLI.
---

# Remotify

Use `<remotify-cli>` for:

- macOS/Linux: `$HOME/.local/bin/remotify`
- Windows: `%USERPROFILE%\.remotify\remotify.exe`

Use `--json` for Agent-readable results.

Use help to discover commands and their exact arguments:

```text
<remotify-cli> --help
<remotify-cli> COMMAND --help
<remotify-cli> GROUP COMMAND --help
```

Keep credentials and operation contents private. Execute mutations once and report their errors.

## Login

Run `login start --json`, show `verification_url` to the user, and keep `poll_token` for `login status --token POLL_TOKEN --json`.

When status returns `session_token`, run `session set --token SESSION_TOKEN --agent ACTUAL_PRODUCT_NAME --json`.

## After activation

Run `devices list --json` and report every device's name, `device_code`, OS, and online status.

Silently use `usage_purpose.instructions` and Resource index entries as operating context; do not repeat them to the user unless they ask. Match commands to `usage_purpose.shell_type`: `sh` uses POSIX shell syntax, `cmd` uses Command Prompt syntax, and `powershell` uses PowerShell syntax. Treat an absent shell type as unknown, and do not assume every Windows device has PowerShell.

An offline device is either powered off or disconnected. Report it as offline. Only when the user asks to reconnect it, run `devices connect --json` and give them the command for that device's OS.

Every report includes:

- All devices: `https://app.remotify-labs.com/devices`
- Team activity: `https://app.remotify-labs.com/activity`
- Agent Sessions: `https://app.remotify-labs.com/agents`
- Each listed device: `https://app.remotify-labs.com/devices/DEVICE_CODE`

When one online device is the clear target, use `run` for the initial inspection:

- macOS/Linux: `pwd`, `ls`, `uname -srm`
- Windows: `cd`, `dir /b`, `ver`

Then provide one response containing confirmation that the Agent is connected, the device identity, the inspection result, and the Console links.

For a permanent Session, include:

> Would you like to give this device a clearer name? Its current name is CURRENT_NAME.

> If you need to connect a new computer, tell me.

Include the new-computer invitation even when devices are offline or absent. When several online devices could be the target, ask which listed device to inspect.

A temporary Session operates only its authorized devices and does not offer device management.

## Connect a new computer

Begin when a permanent-Session user requests a new connection. Ask them to choose macOS, Linux, Windows XP 32-bit, Windows 7 64-bit, or Windows 10/11 64-bit, then ask for Foreground, Background, or Background with Start at login.

For Windows XP or Windows 7, do not give the user a PowerShell command. Direct them to `https://app.remotify-labs.com/devices`, then tell them to choose **Connect device**, select the exact Windows version and lifecycle, download the ZIP, copy it to that computer, choose **Extract All**, and double-click `start.cmd`. The generated script already contains the short-lived enrollment token. The user does not type a command.

For macOS, Linux, or Windows 10/11, run `devices connect --json`.

Give the user the returned command matching those choices:

> Run this command on the remote computer you want to connect. Tell me when it completes successfully, and I will confirm the connection.

After confirmation, list devices, inspect the new online device, and provide the complete device report.

## Operations

Available operations include:

- `run` and `output` for commands;
- `patch` for patches;
- `copy` for file transfers;
- `devices` for listing, connecting, renaming, and deleting devices;
- `teams` and `session` for local Session selection.

Use the command's `--help` output for exact syntax and flags. Use `output` when an incomplete command still needs its result.

Copy endpoints are `local:PATH` or `DEVICE:PATH`. Supported directions are local-to-device, device-to-local, and device-to-device.

Report `session_token_expired` and `session_revoked` as Session states. Later access uses the normal Login flow.