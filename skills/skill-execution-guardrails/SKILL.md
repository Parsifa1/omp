---
name: skill-execution-guardrails
description: Whenever you need to execute scripts, templates, helpers, or example commands from `skill://` resources, follow this process to safely validate and execute them, distinguish issues within the skill itself from environment or validator problems, and prioritize completing the delivery within a restricted environment.

# Skill Execution Guardrails

## 适用场景
- 任何 `skill://` 资源里的脚本、模板、helpers、示例命令执行失败
- 需要区分：是 skill 内资源问题、环境依赖问题，还是验证器/回退策略问题
- 需要在受限环境中安全执行 skill 提供的流程

## 核心原则
- 先查 skill 包内部，再查外部环境
- `skill://` 只表示“skill 包内部资源”，不等于当前工作区
- 优先在临时目录完成实验与恢复
- 不把验证器失败自动等同于内容失败

## 标准流程
1. 先读取 skill 包目录树
   - 找脚本、模板、helpers、示例命令所在的相对路径
2. 确认执行边界
   - 这个问题是否属于 skill 自己的资源/脚本/流程
   - 是否需要落到外部工作区或临时目录
3. 在临时目录创建隔离环境
   - Python 场景优先用 `/tmp/<name>` + `uv venv`
   - 只补齐实际报错提示的依赖
4. 先跑最小可复现命令
   - 先验证脚本可导入、可启动
   - 再验证完整流程
5. 区分故障类型
   - 缺包 / 缺命令
   - 路径或资源边界错误
   - schema / validator 失败
   - 产物可用但验证器误报
6. 选择回退策略
   - 如果 skill 明确允许回退参数，优先按 skill 规定回退
   - 如果校验失败是环境/验证器层，而内容已正确，允许使用非校验路径完成交付
7. 最终复核产物
   - 用最小验证确认最终结果真实可用

## 常见故障模式
### 1. 路径查错
症状：
- 在当前工作区找不到 skill 提到的脚本
- 误把当前仓库路径当成 skill 包路径

处理：
- 重新从 `skill://...` 读取对应目录树
- 只在 skill 包内部找配套资源

### 2. 缺少依赖
症状：
- `ModuleNotFoundError`
- `ImportError`
- 命令找不到

处理：
- 在 `/tmp` 建临时环境
- 只安装当前脚本明确需要的依赖


## 参考命令骨架
```bash
uv venv /tmp/skill-venv
uv pip install --python /tmp/skill-venv/bin/python <missing-packages>
/tmp/skill-venv/bin/python skill://<skill>/scripts/... 
```

## 记忆点
- skill 资源和工作区资源不是同一空间
- `skill://` 的脚本要在 skill 目录树里找
- 先补依赖，再谈修代码
- 验证失败不必然等于交付失败
- 需要时允许回退到不带验证的安全路径
