import fs from "node:fs";

interface OmpContext {
  sessionManager?: {
    getSessionFile?: () => unknown;
  };
}

interface MessageUpdateEvent {
  message?: {
    role?: string;
    timestamp?: number | string;
    content?: unknown;
  };
}

interface OmpExtensionApi {
  on: (event: string, handler: (event: unknown, ctx: unknown) => void) => void;
}

export default function (pi: OmpExtensionApi) {
  let streamPath: string | undefined;
  let throttleTimer: NodeJS.Timeout | undefined;
  let pendingData: string | undefined;

  function updatePath(ctx: unknown): string | undefined {
    try {
      const ompCtx = ctx as OmpContext | undefined;
      const file = ompCtx?.sessionManager?.getSessionFile?.();
      if (typeof file === "string" && file.endsWith(".jsonl")) {
        streamPath = `${file}.stream`;
        return streamPath;
      }
    } catch {}
    return streamPath;
  }

  function flush(): void {
    if (!streamPath || !pendingData) return;
    try {
      const tmp = `${streamPath}.tmp`;
      fs.writeFileSync(tmp, pendingData);
      fs.renameSync(tmp, streamPath);
    } catch {}
  }

  function cleanup(): void {
    if (throttleTimer) {
      clearTimeout(throttleTimer);
      throttleTimer = undefined;
    }
    pendingData = undefined;
    if (streamPath) {
      try {
        if (fs.existsSync(streamPath)) fs.unlinkSync(streamPath);
        if (fs.existsSync(`${streamPath}.tmp`)) fs.unlinkSync(`${streamPath}.tmp`);
      } catch {}
    }
  }

  pi.on("session_start", (_event: unknown, ctx: unknown) => {
    updatePath(ctx);
  });

  pi.on("session_switch", (_event: unknown, ctx: unknown) => {
    cleanup();
    updatePath(ctx);
  });

  pi.on("message_start", (_event: unknown, ctx: unknown) => {
    updatePath(ctx);
  });

  pi.on("message_update", (rawEvent: unknown, ctx: unknown) => {
    const event = rawEvent as MessageUpdateEvent | undefined;
    if (event?.message?.role !== "assistant") return;
    const target = updatePath(ctx);
    if (!target) return;

    const payload = JSON.stringify({
      type: "message",
      timestamp: event.message.timestamp ? new Date(event.message.timestamp).toISOString() : new Date().toISOString(),
      message: event.message,
    });

    pendingData = payload;

    if (!throttleTimer) {
      flush();
      throttleTimer = setTimeout(() => {
        throttleTimer = undefined;
        flush();
      }, 150);
    }
  });

  pi.on("message_end", () => {
    cleanup();
  });

  pi.on("agent_end", () => {
    cleanup();
  });

  pi.on("session_shutdown", () => {
    cleanup();
  });
}
