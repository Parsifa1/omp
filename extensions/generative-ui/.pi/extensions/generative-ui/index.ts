import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { StringEnum } from "@mariozechner/pi-ai";
import { Text } from "@mariozechner/pi-tui";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getGuidelines, AVAILABLE_MODULES } from "./guidelines.js";


const __dirname = dirname(fileURLToPath(import.meta.url));
const GLIMPSE_PATH = join(__dirname, "../../../node_modules/glimpseui/src/glimpse.mjs");

// ---------------------------------------------------------------------------
// Theme CSS: CSS variables, SVG pre-built classes, and form base styles.
// Injected into every WKWebView document so agent-generated widgets that use
// var(--color-*) / .c-* / .t / .th / .ts / etc. render correctly in both modes.
// ---------------------------------------------------------------------------
const THEME_CSS = `
<style>
:root {
  --font-sans: system-ui, -apple-system, sans-serif;
  --font-serif: Georgia, 'Times New Roman', serif;
  --font-mono: 'SF Mono', Menlo, Consolas, monospace;
  --border-radius-md: 8px;
  --border-radius-lg: 12px;
  --border-radius-xl: 16px;
}
@media (prefers-color-scheme: light) {
  :root {
    --color-text-primary: #2c2c2a;
    --color-text-secondary: #73726c;
    --color-text-tertiary: #9c9a92;
    --color-text-info: #185FA5;
    --color-text-success: #3B6D11;
    --color-text-warning: #854F0B;
    --color-text-danger: #A32D2D;
    --color-background-primary: #ffffff;
    --color-background-secondary: #f5f4f1;
    --color-background-tertiary: #eeedea;
    --color-background-info: #E6F1FB;
    --color-background-success: #EAF3DE;
    --color-background-warning: #FAEEDA;
    --color-background-danger: #FCEBEB;
    --color-border-primary: rgba(0,0,0,0.4);
    --color-border-secondary: rgba(0,0,0,0.3);
    --color-border-tertiary: rgba(0,0,0,0.15);
    --color-border-info: #185FA5;
    --color-border-success: #3B6D11;
    --color-border-warning: #854F0B;
    --color-border-danger: #A32D2D;
    --p: #2c2c2a; --s: #73726c; --t: #9c9a92; --bg2: #f5f4f1; --b: rgba(0,0,0,0.15);
  }
}
@media (prefers-color-scheme: dark) {
  :root {
    --color-text-primary: #e0dfd8;
    --color-text-secondary: #b4b2a9;
    --color-text-tertiary: #888780;
    --color-text-info: #85B7EB;
    --color-text-success: #97C459;
    --color-text-warning: #EF9F27;
    --color-text-danger: #F09595;
    --color-background-primary: #1c1c1a;
    --color-background-secondary: #2c2c2a;
    --color-background-tertiary: #232321;
    --color-background-info: #042C53;
    --color-background-success: #173404;
    --color-background-warning: #412402;
    --color-background-danger: #501313;
    --color-border-primary: rgba(255,255,255,0.4);
    --color-border-secondary: rgba(255,255,255,0.3);
    --color-border-tertiary: rgba(255,255,255,0.15);
    --color-border-info: #85B7EB;
    --color-border-success: #97C459;
    --color-border-warning: #EF9F27;
    --color-border-danger: #F09595;
    --p: #e0dfd8; --s: #b4b2a9; --t: #888780; --bg2: #2c2c2a; --b: rgba(255,255,255,0.15);
  }
}

/* Base reset */
*{box-sizing:border-box}
body{margin:0;padding:1rem;font-family:var(--font-sans);background:var(--color-background-primary);color:var(--color-text-primary);}

/* SVG text classes */
.t{font:400 14px var(--font-sans);fill:var(--color-text-primary)}
.ts{font:400 12px var(--font-sans);fill:var(--color-text-secondary)}
.th{font:500 14px var(--font-sans);fill:var(--color-text-primary)}

/* SVG structural classes */
.box{fill:var(--color-background-secondary);stroke:var(--color-border-tertiary)}
.node{cursor:pointer}.node:hover{opacity:0.85}
.arr{stroke:var(--color-border-secondary);stroke-width:1.5;fill:none}
.leader{stroke:var(--color-text-tertiary);stroke-width:0.5;stroke-dasharray:3 2;fill:none}

/* SVG color ramps — light mode */
@media(prefers-color-scheme:light){
.c-purple>rect,.c-purple>circle,.c-purple>ellipse{fill:#EEEDFE;stroke:#534AB7}
.c-purple>.th{fill:#3C3489}.c-purple>.ts{fill:#534AB7}.c-purple>.t{fill:#3C3489}
.c-teal>rect,.c-teal>circle,.c-teal>ellipse{fill:#E1F5EE;stroke:#0F6E56}
.c-teal>.th{fill:#085041}.c-teal>.ts{fill:#0F6E56}.c-teal>.t{fill:#085041}
.c-coral>rect,.c-coral>circle,.c-coral>ellipse{fill:#FAECE7;stroke:#993C1D}
.c-coral>.th{fill:#712B13}.c-coral>.ts{fill:#993C1D}.c-coral>.t{fill:#712B13}
.c-pink>rect,.c-pink>circle,.c-pink>ellipse{fill:#FBEAF0;stroke:#993556}
.c-pink>.th{fill:#72243E}.c-pink>.ts{fill:#993556}.c-pink>.t{fill:#72243E}
.c-gray>rect,.c-gray>circle,.c-gray>ellipse{fill:#F1EFE8;stroke:#5F5E5A}
.c-gray>.th{fill:#444441}.c-gray>.ts{fill:#5F5E5A}.c-gray>.t{fill:#444441}
.c-blue>rect,.c-blue>circle,.c-blue>ellipse{fill:#E6F1FB;stroke:#185FA5}
.c-blue>.th{fill:#0C447C}.c-blue>.ts{fill:#185FA5}.c-blue>.t{fill:#0C447C}
.c-green>rect,.c-green>circle,.c-green>ellipse{fill:#EAF3DE;stroke:#3B6D11}
.c-green>.th{fill:#27500A}.c-green>.ts{fill:#3B6D11}.c-green>.t{fill:#27500A}
.c-amber>rect,.c-amber>circle,.c-amber>ellipse{fill:#FAEEDA;stroke:#854F0B}
.c-amber>.th{fill:#633806}.c-amber>.ts{fill:#854F0B}.c-amber>.t{fill:#633806}
.c-red>rect,.c-red>circle,.c-red>ellipse{fill:#FCEBEB;stroke:#A32D2D}
.c-red>.th{fill:#791F1F}.c-red>.ts{fill:#A32D2D}.c-red>.t{fill:#791F1F}
}

/* SVG color ramps — dark mode */
@media(prefers-color-scheme:dark){
.c-purple>rect,.c-purple>circle,.c-purple>ellipse{fill:#3C3489;stroke:#AFA9EC}
.c-purple>.th{fill:#CECBF6}.c-purple>.ts{fill:#AFA9EC}.c-purple>.t{fill:#CECBF6}
.c-teal>rect,.c-teal>circle,.c-teal>ellipse{fill:#085041;stroke:#5DCAA5}
.c-teal>.th{fill:#9FE1CB}.c-teal>.ts{fill:#5DCAA5}.c-teal>.t{fill:#9FE1CB}
.c-coral>rect,.c-coral>circle,.c-coral>ellipse{fill:#712B13;stroke:#F0997B}
.c-coral>.th{fill:#F5C4B3}.c-coral>.ts{fill:#F0997B}.c-coral>.t{fill:#F5C4B3}
.c-pink>rect,.c-pink>circle,.c-pink>ellipse{fill:#72243E;stroke:#ED93B1}
.c-pink>.th{fill:#F4C0D1}.c-pink>.ts{fill:#ED93B1}.c-pink>.t{fill:#F4C0D1}
.c-gray>rect,.c-gray>circle,.c-gray>ellipse{fill:#444441;stroke:#B4B2A9}
.c-gray>.th{fill:#D3D1C7}.c-gray>.ts{fill:#B4B2A9}.c-gray>.t{fill:#D3D1C7}
.c-blue>rect,.c-blue>circle,.c-blue>ellipse{fill:#0C447C;stroke:#85B7EB}
.c-blue>.th{fill:#B5D4F4}.c-blue>.ts{fill:#85B7EB}.c-blue>.t{fill:#B5D4F4}
.c-green>rect,.c-green>circle,.c-green>ellipse{fill:#27500A;stroke:#97C459}
.c-green>.th{fill:#C0DD97}.c-green>.ts{fill:#97C459}.c-green>.t{fill:#C0DD97}
.c-amber>rect,.c-amber>circle,.c-amber>ellipse{fill:#633806;stroke:#EF9F27}
.c-amber>.th{fill:#FAC775}.c-amber>.ts{fill:#EF9F27}.c-amber>.t{fill:#FAC775}
.c-red>rect,.c-red>circle,.c-red>ellipse{fill:#791F1F;stroke:#F09595}
.c-red>.th{fill:#F7C1C1}.c-red>.ts{fill:#F09595}.c-red>.t{fill:#F7C1C1}
}

/* Form element base styles */
input[type=text],input[type=number],input[type=email],input[type=search],input[type=url],textarea,select{
  height:36px;padding:0 10px;border-radius:var(--border-radius-md);
  border:0.5px solid var(--color-border-secondary);background:var(--color-background-primary);
  color:var(--color-text-primary);font:400 14px var(--font-sans);outline:none;
  transition:border-color .15s;
}
input:hover,textarea:hover,select:hover{border-color:var(--color-border-primary)}
input:focus,textarea:focus,select:focus{border-color:var(--color-text-info);box-shadow:0 0 0 2px color-mix(in srgb,var(--color-text-info) 25%,transparent)}
textarea{height:auto;padding:8px 10px}
button{
  background:transparent;border:0.5px solid var(--color-border-secondary);
  border-radius:var(--border-radius-md);padding:6px 14px;font:500 14px var(--font-sans);
  color:var(--color-text-primary);cursor:pointer;transition:background .15s,transform .1s;
}
button:hover{background:var(--color-background-secondary)}
button:active{transform:scale(0.98)}
input[type=range]{
  -webkit-appearance:none;appearance:none;height:4px;border-radius:2px;
  background:var(--color-border-secondary);outline:none;cursor:pointer;border:none;
}
input[type=range]::-webkit-slider-thumb{
  -webkit-appearance:none;width:18px;height:18px;border-radius:50%;
  background:var(--color-background-primary);border:2px solid var(--color-text-secondary);cursor:pointer;
}
</style>
`;

// Shell HTML with a root container — used for streaming.
// Content is injected via win.send() JS eval, not setHTML(), to avoid full-page flashes.
function shellHTML(): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
${THEME_CSS}
<style>
@keyframes _fadeIn{from{opacity:0;transform:translateY(4px);}to{opacity:1;transform:none;}}
</style>
</head><body><div id="root"></div>
<script>
  window._morphReady = false;
  window._pending = null;
  window._setContent = function(html) {
    if (!window._morphReady) { window._pending = html; return; }
    var root = document.getElementById('root');
    var target = document.createElement('div');
    target.id = 'root';
    target.innerHTML = html;
    morphdom(root, target, {
      onBeforeElUpdated: function(from, to) {
        if (from.isEqualNode(to)) return false;
        return true;
      },
      onNodeAdded: function(node) {
        if (node.nodeType === 1 && node.tagName !== 'STYLE' && node.tagName !== 'SCRIPT') {
          node.style.animation = '_fadeIn 0.3s ease both';
        }
        return node;
      }
    });
  };
  window._runScripts = function() {
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        document.querySelectorAll('#root script').forEach(function(old) {
          var s = document.createElement('script');
          if (old.src) { s.src = old.src; } else { s.textContent = old.textContent; }
          old.parentNode.replaceChild(s, old);
        });
      });
    });
  };
  window._hiDPICanvas = function(canvas, w, h) {
    var dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return ctx;
  };
</script>
<script src="https://cdn.jsdelivr.net/npm/morphdom@2.7.4/dist/morphdom-umd.min.js"
  onload="window._morphReady=true;if(window._pending){window._setContent(window._pending);window._pending=null;}"></script>
</body></html>`;
}

// Wrap HTML fragment into a full document for Glimpse (non-streaming fallback)
function wrapHTML(code: string, isSVG = false): string {
  if (isSVG) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8">${THEME_CSS}</head>
<body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;">
${code}</body></html>`;
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
${THEME_CSS}
</head><body>${code}</body></html>`;
}

// Escape a string for safe injection into a JS string literal
function escapeJS(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/<\/script>/gi, '<\\/script>');
}

export default function (pi: ExtensionAPI) {
  let hasSeenReadMe = false;
  let activeWindows: any[] = [];
  let glimpseModule: any = null;

  // Lazy-load glimpse module
  async function getGlimpse() {
    if (!glimpseModule) {
      glimpseModule = await import(GLIMPSE_PATH);
    }
    return glimpseModule;
  }

  // ── Streaming state ─────────────────────────────────────────────────────

  // Tracks in-flight show_widget tool calls being streamed
  interface StreamingWidget {
    contentIndex: number;
    window: any | null;
    lastHTML: string;
    updateTimer: any;
    ready: boolean;
  }

  let streaming: StreamingWidget | null = null;

  // ── message_update: intercept streaming tool calls ────────────────────

  pi.on("message_update", async (event) => {
    const raw: any = event.assistantMessageEvent;
    if (!raw) return;

    // Tool call starts streaming
    if (raw.type === "toolcall_start") {
      const partial: any = raw.partial;
      const block = partial?.content?.[raw.contentIndex];
      if (block?.type === "toolCall" && block?.name === "show_widget") {
        streaming = {
          contentIndex: raw.contentIndex,
          window: null,
          lastHTML: "",
          updateTimer: null,
          ready: false,
        };
      }
      return;
    }

    // Tool call input JSON delta — arguments already parsed by pi-ai
    if (raw.type === "toolcall_delta" && streaming && raw.contentIndex === streaming.contentIndex) {
      const partial: any = raw.partial;
      const block = partial?.content?.[raw.contentIndex];
      const html = block?.arguments?.widget_code;
      if (!html || html.length < 20 || html === streaming.lastHTML) return;

      streaming.lastHTML = html;

      // Debounce updates to ~150ms for smooth rendering
      if (streaming.updateTimer) return;
      streaming.updateTimer = setTimeout(async () => {
        if (!streaming) return;
        streaming.updateTimer = null;

        try {
          if (!streaming.window) {
            // Open window with empty shell — content will be injected via JS eval
            const args = block?.arguments ?? {};
            const title = (args.title ?? "Widget").replace(/_/g, " ");
            const width = args.width ?? 800;
            const height = args.height ?? 600;

            const { open } = await getGlimpse();
            streaming.window = open(shellHTML(), { width, height, title });
            activeWindows.push(streaming.window);

            streaming.window.on("ready", () => {
              if (!streaming) return;
              streaming.ready = true;
              // Inject the content we've accumulated so far
              const escaped = escapeJS(streaming.lastHTML);
              streaming.window.send(`window._setContent('${escaped}')`);
            });
          } else if (streaming.ready) {
            // Update content via JS — no full page replace
            const escaped = escapeJS(streaming.lastHTML);
            streaming.window.send(`window._setContent('${escaped}')`);
          }
        } catch {}
      }, 150);
      return;
    }

    // Tool call complete — final update with complete HTML + execute scripts
    if (raw.type === "toolcall_end" && streaming && raw.contentIndex === streaming.contentIndex) {
      if (streaming.updateTimer) {
        clearTimeout(streaming.updateTimer);
        streaming.updateTimer = null;
      }

      const toolCall = raw.toolCall;
      if (toolCall?.arguments?.widget_code && streaming.window && streaming.ready) {
        const escaped = escapeJS(toolCall.arguments.widget_code);
        streaming.window.send(`window._setContent('${escaped}'); window._runScripts();`);
      }
      // Don't clear streaming — execute() will pick up the window
      return;
    }
  });

  // ── read_me tool ──────────────────────────────────────────────────────────

  pi.registerTool({
    name: "visualize_read_me",
    label: "Read Guidelines",
    description:
      "Returns design guidelines for show_widget (CSS patterns, colors, typography, layout rules, examples). " +
      "Call once before your first show_widget call. Do NOT mention this call to the user — it is an internal setup step.",
    promptSnippet: "Load design guidelines before creating widgets. Call silently before first show_widget use.",
    promptGuidelines: [
      "Call visualize_read_me once before your first show_widget call to load design guidelines.",
      "Do NOT mention the read_me call to the user — call it silently, then proceed directly to building the widget.",
      "Pick the modules that match your use case: interactive, chart, mockup, art, diagram.",
    ],
    parameters: Type.Object({
      modules: Type.Array(
        StringEnum(AVAILABLE_MODULES as readonly string[]),
        { description: "Which module(s) to load. Pick all that fit." }
      ),
    }),

    async execute(_toolCallId, params) {
      hasSeenReadMe = true;
      const content = getGuidelines(params.modules);
      return {
        content: [{ type: "text" as const, text: content }],
        details: { modules: params.modules },
      };
    },

    renderCall(args: any, theme: any) {
      const mods = (args.modules ?? []).join(", ");
      return new Text(
        theme.fg("toolTitle", theme.bold("read_me ")) + theme.fg("muted", mods),
        0, 0
      );
    },

    renderResult(_result: any, { isPartial }: any, theme: any) {
      if (isPartial) return new Text(theme.fg("warning", "Loading guidelines..."), 0, 0);
      return new Text(theme.fg("dim", "Guidelines loaded"), 0, 0);
    },
  });

  // ── show_widget tool ──────────────────────────────────────────────────────

  pi.registerTool({
    name: "show_widget",
    label: "Show Widget",
    description:
      "Show visual content — SVG graphics, diagrams, charts, or interactive HTML widgets — in a native macOS window. " +
      "Use for flowcharts, dashboards, forms, calculators, data tables, games, illustrations, or any visual content. " +
      "The HTML is rendered in a native WKWebView with full CSS/JS support including Canvas and CDN libraries. " +
      "The page gets a window.glimpse.send(data) bridge to send JSON data back to the agent. " +
      "IMPORTANT: Call visualize_read_me once before your first show_widget call.",
    promptSnippet: "Render interactive HTML/SVG widgets in a native macOS window (WKWebView). Supports full CSS, JS, Canvas, Chart.js.",
    promptGuidelines: [
      "Use show_widget when the user asks for visual content: charts, diagrams, interactive explainers, UI mockups, art.",
      "Always call visualize_read_me first to load design guidelines, then set i_have_seen_read_me: true.",
      "The widget opens in a native macOS window — it has full browser capabilities (Canvas, JS, CDN libraries).",
      "Structure HTML as fragments: no DOCTYPE/<html>/<head>/<body>. Style first, then HTML, then scripts.",
      "The page has window.glimpse.send(data) to send data back. Use it for user choices and interactions.",
      "Keep widgets focused and appropriately sized. Default is 800x600 but adjust to fit content.",
      "For interactive explainers: sliders, live calculations, Chart.js charts.",
      "For SVG: start code with <svg> tag, it will be auto-detected.",
      "Be concise in your responses",
    ],
    parameters: Type.Object({
      i_have_seen_read_me: Type.Boolean({
        description: "Confirm you have already called visualize_read_me in this conversation.",
      }),
      title: Type.String({
        description: "Short snake_case identifier for this widget (used as window title).",
      }),
      widget_code: Type.String({
        description:
          "HTML or SVG code to render. For SVG: raw SVG starting with <svg>. " +
          "For HTML: raw content fragment, no DOCTYPE/<html>/<head>/<body>.",
      }),
      width: Type.Optional(Type.Number({ description: "Window width in pixels. Default: 800." })),
      height: Type.Optional(Type.Number({ description: "Window height in pixels. Default: 600." })),
      floating: Type.Optional(Type.Boolean({ description: "Keep window always on top. Default: false." })),
    }),

    async execute(_toolCallId, params, signal) {
      if (!params.i_have_seen_read_me) {
        throw new Error("You must call visualize_read_me before show_widget. Set i_have_seen_read_me: true after doing so.");
      }

      const code = params.widget_code;
      const isSVG = code.trimStart().startsWith("<svg");
      const title = params.title.replace(/_/g, " ");
      const width = params.width ?? 800;
      const height = params.height ?? 600;

      // Check if we already have a streaming window from message_update
      let win: any = null;

      if (streaming?.window) {
        win = streaming.window;
        // Send final complete HTML + run scripts via JS eval (no full page replace)
        if (streaming.ready) {
          const escaped = escapeJS(code);
          win.send(`window._setContent('${escaped}'); window._runScripts();`);
        }
        streaming = null;
      } else {
        // No streaming window — open fresh (fallback for non-streaming providers)
        const { open } = await getGlimpse();
        win = open(wrapHTML(code, isSVG), {
          width,
          height,
          title,
          floating: params.floating ?? false,
        });
        activeWindows.push(win);
      }

      return new Promise<any>((resolve) => {
        let messageData: any = null;
        let resolved = false;

        const finish = (reason: string) => {
          if (resolved) return;
          resolved = true;
          activeWindows = activeWindows.filter((w) => w !== win);
          resolve({
            content: [
              {
                type: "text" as const,
                text: messageData
                  ? `Widget rendered. User interaction data: ${JSON.stringify(messageData)}`
                  : `Widget "${title}" rendered and shown to the user (${width}×${height}). ${reason}`,
              },
            ],
            details: {
              title: params.title,
              width,
              height,
              isSVG,
              messageData,
              closedReason: reason,
            },
          });
        };

        win.on("message", (data: any) => {
          messageData = data;
          finish("User sent data from widget.");
        });

        win.on("closed", () => {
          finish("Window closed by user.");
        });

        win.on("error", (err: Error) => {
          finish(`Error: ${err.message}`);
        });

        if (signal) {
          signal.addEventListener("abort", () => {
            try { win.close(); } catch {}
            finish("Aborted.");
          }, { once: true });
        }

        // Auto-resolve after 120s if no interaction
        setTimeout(() => {
          finish("Widget still open (timed out waiting for interaction).");
        }, 120_000);
      });
    },

    renderCall(args: any, theme: any) {
      const title = (args.title ?? "widget").replace(/_/g, " ");
      const size = args.width && args.height ? ` ${args.width}×${args.height}` : "";
      let text = theme.fg("toolTitle", theme.bold("show_widget "));
      text += theme.fg("accent", title);
      if (size) text += theme.fg("dim", size);
      return new Text(text, 0, 0);
    },

    renderResult(result: any, { isPartial, expanded }: any, theme: any) {
      if (isPartial) {
        return new Text(theme.fg("warning", "⟳ Widget rendering..."), 0, 0);
      }

      const details = result.details ?? {};
      const title = (details.title ?? "widget").replace(/_/g, " ");
      let text = theme.fg("success", "✓ ") + theme.fg("accent", title);
      text += theme.fg("dim", ` ${details.width ?? 800}×${details.height ?? 600}`);
      if (details.isSVG) text += theme.fg("dim", " (SVG)");

      if (details.closedReason) {
        text += "\n" + theme.fg("muted", `  ${details.closedReason}`);
      }

      if (expanded && details.messageData) {
        text += "\n" + theme.fg("dim", `  Data: ${JSON.stringify(details.messageData, null, 2)}`);
      }

      return new Text(text, 0, 0);
    },
  });

  // ── cleanup on shutdown ───────────────────────────────────────────────────

  pi.on("session_shutdown", async () => {
    if (streaming?.updateTimer) clearTimeout(streaming.updateTimer);
    streaming = null;
    for (const win of activeWindows) {
      try { win.close(); } catch {}
    }
    activeWindows = [];
  });
}
