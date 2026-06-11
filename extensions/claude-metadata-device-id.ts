import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

type ModelLike = {
  api?: string;
  id?: string;
  name?: string;
};

let processDeviceId: string | undefined;

function isClaudeModel(model: unknown): model is ModelLike {
  if (!model || typeof model !== "object") return false;
  const candidate = model as ModelLike;
  if (candidate.api !== "anthropic-messages") return false;
  return /claude/i.test(`${candidate.id ?? ""} ${candidate.name ?? ""}`);
}

function parseUserId(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
    return parsed as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

export function getOrCreateDeviceId(
  readStored: () => string | undefined = () => processDeviceId,
  writeStored: (value: string) => void = (value) => {
    processDeviceId = value;
  },
): string {
  const existing = readStored();
  if (existing && /^[0-9a-f]{64}$/.test(existing)) return existing;
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const next = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  writeStored(next);
  return next;
}

export function applyClaudeDeviceMetadata(
  payload: unknown,
  model: unknown,
  deviceId: string,
): boolean {
  if (!isClaudeModel(model)) return false;
  if (!payload || typeof payload !== "object") return false;

  const request = payload as { metadata?: { user_id?: unknown } };
  const metadata = request.metadata;
  if (!metadata || typeof metadata !== "object") return false;

  const userId = parseUserId(metadata.user_id);
  if (!userId || typeof userId.device_id === "string") return false;

  userId.device_id = deviceId;
  metadata.user_id = JSON.stringify(userId);
  return true;
}

function providerRequestPayload(event: unknown): unknown {
  if (!event || typeof event !== "object") return event;
  const candidate = event as { request?: unknown; payload?: unknown; body?: unknown };
  return candidate.request ?? candidate.payload ?? candidate.body ?? event;
}

export default function claudeMetadataDeviceId(pi: ExtensionAPI): void {
  pi.setLabel?.("Claude metadata device_id");

  pi.on("before_provider_request", (event, ctx) => {
    applyClaudeDeviceMetadata(providerRequestPayload(event), ctx.model, getOrCreateDeviceId());
  });
}