# My oh-my-pi config

一套面向 [oh-my-pi](https://github.com/nicepkg/oh-my-pi) 的个人配置，围绕多模型调度、专业子代理分工、MCP 工具集成和主题定制构建了一个高效的 AI 编码工作站。

## 模型配置 (`models.yml`)

通过 **AxonHub** 统一代理接入多家 LLM：

| 模型 | 用途 |
|---|---|
| Claude Sonnet 4.6 / Opus 4.6 | 深度推理（slow 角色） |
| GPT-5.4 / GPT-5.5 | 通用默认、规划、代码审查 |
| GPT-5 Mini | 轻量任务（smol 角色） |
| Gemini 3.1 Pro / 3 Flash | 设计、视觉分析 |
| DeepSeek V4 Pro | 免费备选 |
| GLM 5.1 | 中文场景补充 |

配合 `config.yml` 中的 `modelRoles` 自动按场景分配最合适的模型。

## 核心配置 (`config.yml`)

- **主题**：Everforest 暗色 + Nerd Font 符号
- **状态栏**：自定义布局，显示路径、Git、模型、上下文占用、Token 数、子代理数
- **上下文压缩**：70% 自动触发，策略 `context-full`
- **记忆系统**：本地后端，自动生成分支摘要
- **Mermaid 渲染** / **图片识别** / **计算器**：均已启用
- **异步执行**：长命令自动后台运行
- **Bash 拦截器**：核心工具调用优先走内置实现
- **任务隔离**：`rcopy` 模式，独立上下文不影响主会话
- **Todo 提醒**：最多 5 条，批量完成后统一清空
- **MCP 发现**：开启工具自动发现 + 通知
- **秘密管理**：启用，API Key 等敏感信息走 secrets 注入
- **GitHub 集成**：已启用
- **编辑模式**：hashline（行锚点编辑）
- **LSP 诊断**：编辑时实时反馈
- **重试策略**：最多 5 次
- **Checkpoint**：关闭（手动控制）
- **Web 搜索**：Exa 引擎

## 子代理体系 (`agents/`)

每个代理专注一个领域，按需调度：

| 代理 | 模型 | 职责 |
|---|---|---|
| **plan** | plan / slow | 软件架构师，只读分析复杂需求并产出实施计划 |
| **reviewer** | review + high thinking | 代码审查专家，结构化报告 Bug（P0-P3）和正确性判定 |
| **oracle** | slow + high thinking | 深度诊断顾问，处理死循环、架构权衡、微妙 Bug 的第二意见 |
| **designer** | Gemini Pro | UI/UX 专家，实现设计稿、审查界面质量、识别 AI 味设计 |
| **explore** | smol | 代码侦察兵，快速只读搜索并返回压缩上下文给其他代理 |
| **librarian** | smol | 库研究者，读源码验证 API 细节，拒绝凭训练数据猜测 |
| **task** | default | 通用执行者，全工具权限，承接委派的多步骤任务 |
| **quick_task** | smol + minimal | 机械性任务，最低推理开销完成简单操作 |

代理间的协作关系：`plan` → `explore`，`reviewer` → `explore` + `task`，`oracle` → `explore`，`designer` → `explore`。

## MCP 服务 (`mcp.json`)

- **Context7**：上下文感知的文档检索 API
- **grep.app**：跨 GitHub 仓库的代码搜索
- **Firefox DevTools**（默认禁用，按需通过 Skill 启用）：浏览器远程调试

## 技能 (`skills/`)

- **skill-execution-guardrails**：Skill 执行护栏——处理脚本/模板执行失败时的依赖补齐、路径边界确认、验证失败分流与回退策略
- **firefox-devtools**：按需加载 Firefox DevTools MCP，避免常驻后台进程；仅限 macOS + Zen Browser

## 扩展 (`extensions/`)

- **context-prune**：上下文修剪，自动摘要和裁剪历史工具调用结果以控制上下文窗口
- **axonhub-trace**：AxonHub 调用追踪
- **comment-checker**：注释检查器
- **skill-mcp**：Skill MCP 桥接
- **generative-ui**：生成式 UI 渲染
