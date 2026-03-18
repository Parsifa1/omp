import type { ExtensionAPI, ExtensionContext } from "@oh-my-pi/pi-coding-agent";

const THREAD_HEADER = "AH-Thread-Id";
const TRACE_HEADER = "AH-Trace-Id";
const PROVIDER = "axonhub";

export default function axonhubTrace(pi: ExtensionAPI): void {
  // oh-my-pi messages carry no opaque id field; timestamp is the finest-grained
  // per-turn discriminator available without forking the SDK.
  let latestTraceId: string | undefined;
  let sessionId: string | undefined;

  // registerProvider creates new model objects in #models, but
  // Agent.#state.model holds the old reference. createClient reads
  // model.headers from that stale ref, so registerProvider headers
  // never reach the wire. Direct mutation of ctx.model.headers is
  // the only path that works without patching core.
  function injectHeaders(ctx: ExtensionContext): void {
    sessionId ??= ctx.sessionManager.getSessionId();
    const model = ctx.model;
    if (!model || model.provider !== PROVIDER) return;

    const headers: Record<string, string> = { ...(model.headers ?? {}) };
    headers[THREAD_HEADER] = sessionId;
    if (latestTraceId) {
      headers[TRACE_HEADER] = latestTraceId;
    } else {
      delete headers[TRACE_HEADER];
    }

    model.headers = headers;
  }

  pi.on("session_start", (_event, ctx) => {
    sessionId = ctx.sessionManager.getSessionId();
    latestTraceId = undefined;
  });

  pi.on("session_switch", (_event, ctx) => {
    sessionId = ctx.sessionManager.getSessionId();
    latestTraceId = undefined;
  });

  // `context` fires just before each LLM call — reliable point to capture
  // the triggering user message's timestamp as the trace id for that turn.
  pi.on("context", (event, ctx) => {
    for (let i = event.messages.length - 1; i >= 0; i--) {
      const msg = event.messages[i] as { role?: string; timestamp?: number };
      if (msg.role === "user" && msg.timestamp) {
        latestTraceId = String(msg.timestamp);
        break;
      }
    }
    injectHeaders(ctx);
  });
}
