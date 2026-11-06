# 多 Agent 协作模式图解

10 种常见的多 Agent 协作模式，每种一张可交互的动画图。在线浏览：**https://duegin.github.io/agent-collab-patterns/**

站点有三类页面：

- **首页**：10 张卡片，每张有拓扑缩略图、实测成本、一条优势、一条劣势和代表工具。
- **模式页**：每种模式一张可交互的动画图，只画协作拓扑，主路径用蓝线和小圆点动画标出。图下方依次是"优势与劣势"（含适合 / 不适合的场景和 6 项评分），以及"市面上遵循此模式的工具"。页面顶部和底部都有导航：返回全部、上一个、下一个、纵向对比。
- **[纵向对比](https://duegin.github.io/agent-collab-patterns/compare.html)**：包括四块：
  - 实测成本：耗时和 token 两张条形图。
  - 定性评估矩阵：省钱、速度、质量把关、多视角、可审计、易搭建。
  - 按场景选。
  - 优劣速查。

图是交互式 HTML。悬停或点击节点能看详情，可以切换亮色和暗色，也可以重放动画。每张图另有一份 PNG（只有图），可以直接放进文档。

| # | 模式 | 拓扑 | 模型调用 | 实测（相对单 Agent） | 市面上的代表工具 |
|---|---|---|---|---|---|
| [MA-00](https://duegin.github.io/agent-collab-patterns/ma-00-single.html) | 单 Agent 基线 | 一次完成 | 1 | 24s · 2.5k tokens（×1.0） | Claude Code / Codex 单会话、Cursor / Copilot、ChatGPT / Claude 对话 |
| [MA-01](https://duegin.github.io/agent-collab-patterns/ma-01-pipeline.html) | 顺序流水线 | 研究员 → 撰稿人 → 编辑 | 3 | 72s · 10.2k（×4.1） | MetaGPT、ChatDev、CrewAI sequential、Archon、Dify / Coze / n8n |
| [MA-02](https://duegin.github.io/agent-collab-patterns/ma-02-router.html) | 路由分诊 | 分类器 → 1 位专家 | 2 | 27s · 3.9k（×1.5） | OpenAI Agents SDK handoff、Claude Code 自动选 subagent、Multica Squad、Dify / Coze 意图识别 |
| [MA-03](https://duegin.github.io/agent-collab-patterns/ma-03-parallel.html) | 并行分工 | 3 个固定视角并行 → 汇总 | 4 | 41s · 8.8k（×3.5） | Google ADK ParallelAgent、MS Agent Framework Concurrent、LangGraph Send、Dify / n8n 并行分支 |
| [MA-04](https://duegin.github.io/agent-collab-patterns/ma-04-orchestrator.html) | 委派式编排 | 编排者动态拆分 → N 个子 Agent → 汇总 | 2+N | 59s · 12.1k（×4.8） | Claude Code subagent、Codex spawn_agent、Kimi Agent Swarm、Hermes delegate_task、AWS CAO / Paseo |
| [MA-05](https://duegin.github.io/agent-collab-patterns/ma-05-critic-loop.html) | 生成-评审循环 | 写 → 评 → 改（最多 2 轮） | 2~5 | 99s · 20.0k（×8.0） | codex-plugin-cc 评审闸门、Claude Code Stop hook、Orchestrator.inc、Google ADK LoopAgent |
| [MA-06](https://duegin.github.io/agent-collab-patterns/ma-06-debate.html) | 多 Agent 辩论 | 主持人 → 正反立论 → 交叉反驳 → 裁判 | 6 | 54s · 11.3k（×4.5） | MS Agent Framework GroupChat、Maestro Group Chat、CAMEL、Multi-Agent Debate（论文） |
| [MA-07](https://duegin.github.io/agent-collab-patterns/ma-07-voting.html) | 投票集成 | 3 份独立答卷 → 评委择优融合 | 4 | 42s · 14.1k（×5.6） | Cursor /best-of-n、Codex Cloud `--attempts`、GitHub Agent HQ、llm-council |
| [MA-08](https://duegin.github.io/agent-collab-patterns/ma-08-blackboard.html) | 团队协作 · 共享黑板 | 组长 → 3 人发帖 → 互看回应 → 整合 | 8 | 54s · 19.6k（×7.8） | Claude Code Agent Teams、Codex multi-agent V2、Hermes Kanban、DeepSeek Harness Teams、hcom、Paperclip / Multica |
| [MA-09](https://duegin.github.io/agent-collab-patterns/ma-09-contract-gate.html) | 契约编排 + 闸门验证（推荐） | 规划 → 计划校验 → 任务卡 → 隔离并行 → 规则闸门 → 交叉评审 → 定向返工 → 单写者整合 | 约 6+2N | 208s · 68.4k（×27.3） | Kimi Code Tower、Orchestrator.inc、Gas Town Refinery、Bernstein、Cursor planner/worker/judge |

## 说明

- **实测数据**：2026-11-06 在 Dify 1.17.1 上用同一个任务各跑 1 次，执行模型是 `deepseek-v4.1-flash`，评审模型是 `claude-sonnet-5-5`。只跑了 1 次，看量级，不要看小数点。
- **代表工具**：是 2026-10 调研时的状态。多数工具只是"部分对应"：它的核心机制属于这种模式，不代表完整实现了图上每个节点。很多产品同时支持好几种模式，比如 Claude Code 同时有 subagent（MA-04）和 Agent Teams（MA-08）。这里按它最有代表性的那项能力归类。
- **评分**：纵向对比里的 1–5 分是作者的定性判断，不是测量结果。
- **MA-09 的设计思路**：中心化编排 + 写操作单线程 + 明确边界 + 独立验证。事前靠契约和不相交的写集合，事中靠隔离执行，事后靠规则闸门、交叉评审、定向返工和单写者整合。

## 修改和重新生成

源文件有两类：
- `docs/ma-*.json`：每张图的 SeeCode spec，图页面和图片都由它生成。
- `data/patterns.json`：其余的展示内容，包括实测数据、优势、劣势、适合 / 不适合、评分、按场景选、代表工具。`scripts/site.mjs` 用它生成首页和纵向对比页，并把导航、优劣和工具区块插到每张图页面上。

改完任意一类后运行：

```bash
scripts/build.sh            # 渲染图 → 导出缩略图和 PNG → 生成站点页面
scripts/build.sh --no-png   # 不重新导出图片（快）。只改了 patterns.json 时用这个
```

`build.sh` 会把图片导出到这两个位置：
- `docs/thumbs/`：首页用的缩略图，只有图，分亮色和暗色两份。
- `docs/ma-*.png`：带标题和图注的完整图。

需要 Node ≥ 20。导出 PNG 需要本机装有 Chrome 或 Edge。脚本第一次运行时会把 SeeCode 拉到 `.seecode/`，并固定在一个指定的 commit。

## 致谢

图由 [SeeCode](https://github.com/Aryanutkarsh/SeeCode)（MIT License, © 2026 Aryanutkarsh）渲染。生成的 HTML 内嵌了 SeeCode 的查看器代码，许可证全文见 [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)。
