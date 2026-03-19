import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

import { registerSkillMcpTool } from "./tool";

export default function skillMcp(pi: ExtensionAPI): void {
  registerSkillMcpTool(pi);
}
