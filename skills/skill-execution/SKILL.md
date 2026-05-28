---
name: skill-execution
description: Whenever you need to execute scripts, templates, helpers, or example commands from `skill://` resources, follow this process to safely validate and execute them, distinguish issues within the skill itself from environment or validator problems, and prioritize completing the delivery within a restricted environment.
---

# Skill Execution 

skill里提到的任何脚本，资源，都在 skill 目录树里找，而不是在当前项目空间里找，如果对应脚本或者命令需要额外安装包的话可以手动创建临时虚拟环境

## 参考命令骨架
```bash
uv venv /tmp/skill-venv
uv pip install --python /tmp/skill-venv/bin/python <missing-packages>
/tmp/skill-venv/bin/python skill://<skill>/scripts/... 
```

## 记忆点
- skill 资源和工作区资源不是同一空间
- `skill://` 的脚本要在 skill 目录树里找
