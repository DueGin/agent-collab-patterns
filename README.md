# 多 Agent 协作模式图解

10 种常见的多 Agent 协作模式，每种一张可交互的动画图。在线浏览：**https://duegin.github.io/agent-collab-patterns/**

站点有三类页面：

- **首页**：10 张卡片，每张有拓扑缩略图、实测成本、一条优势、一条劣势和代表工具。
- **模式页**：每种模式一张可交互的动画图，只画协作拓扑，主路径用蓝线和小圆点动画标出。图下方依次是"优势与劣势"（含适合 / 不适合的场景和结构特征），以及"市面上遵循此模式的工具"。页面顶部和底部都有导航：返回全部、上一个、下一个、纵向对比。
- **[纵向对比](https://duegin.github.io/agent-collab-patterns/compare.html)**：包括四块：
  - 实测成本：耗时、token、最终答案长度三张条形图，外加"单 Agent 真的最快吗"的说明。
  - 结构对比：串行轮数、并行、成员之间能否看见、质量检查、返工。
  - 按场景选。
  - 优劣速查。

图是交互式 HTML。悬停或点击节点能看详情，可以切换亮色和暗色，也可以重放动画。每张图另有一份 PNG（只有图），可以直接放进文档。

| # | 模式 | 拓扑 | 模型调用 | 串行轮数 | 实测（相对单 Agent） | 市面上的代表工具 |
|---|---|---|---|---|---|---|
| [MA-00](https://duegin.github.io/agent-collab-patterns/ma-00-single.html) | 单 Agent 基线 | 一个 Agent 一次完成 | 1 | 1 | 24s · 2.5k tokens（×1.0） | Claude Code / Codex、Cursor / Copilot、ChatGPT / Claude |
| [MA-01](https://duegin.github.io/agent-collab-patterns/ma-01-pipeline.html) | 顺序流水线 | 研究员 → 撰稿人 → 编辑 | 3 | 3 | 72s · 10.2k tokens（×4.1） | MetaGPT、ChatDev、CrewAI、MS Agent Framework、Archon、Dify / Coze / n8n |
| [MA-02](https://duegin.github.io/agent-collab-patterns/ma-02-router.html) | 路由分诊 | 分类器 → 1 位专家 | 2 | 2 | 27s · 3.9k tokens（×1.5） | OpenAI Agents SDK、Claude Code、Multica、Dify / Coze |
| [MA-03](https://duegin.github.io/agent-collab-patterns/ma-03-parallel.html) | 并行分工 | 3 个固定视角并行 → 汇总 | 4 | 2 | 41s · 8.8k tokens（×3.5） | Google ADK、MS Agent Framework、LangGraph、Dify |
| [MA-04](https://duegin.github.io/agent-collab-patterns/ma-04-orchestrator.html) | 委派式编排 | 编排者动态拆分 → N 个子 Agent → 汇总 | 2+N（本次 7） | 3 | 59s · 12.1k tokens（×4.8） | Claude Code、Codex、Kimi Code、Hermes Agent、LangGraph、AWS CAO / Paseo |
| [MA-05](https://duegin.github.io/agent-collab-patterns/ma-05-critic-loop.html) | 生成-评审循环 | 写 → 评 → 改（最多 2 轮） | 2~5（本次 5） | 2~5 | 99s · 20.0k tokens（×8.0） | Claude Code + Codex、Claude Code、Orchestrator.inc、Google ADK、OpenAI Agents SDK |
| [MA-06](https://duegin.github.io/agent-collab-patterns/ma-06-debate.html) | 多 Agent 辩论 | 主持人 → 正反立论 → 交叉反驳 → 裁判 | 6 | 4 | 54s · 11.3k tokens（×4.5） | MAD（Liang et al.） 正反方 + 裁判（论文）、Multi-Agent Debate（Du et al.） 多实例多轮互辩、趋共识、MS Agent Framework、Maestro |
| [MA-07](https://duegin.github.io/agent-collab-patterns/ma-07-voting.html) | 投票集成 | 3 份独立答卷 → 评委择优融合 | 4 | 2 | 42s · 14.1k tokens（×5.6） | Cursor、Codex Cloud、GitHub Agent HQ、llm-council、Self-Consistency 多次采样、多数投票（论文） |
| [MA-08](https://duegin.github.io/agent-collab-patterns/ma-08-blackboard.html) | 团队协作 · 共享黑板 | 组长 → 3 人发帖 → 互看回应 → 整合 | 8 | 4 | 54s · 19.6k tokens（×7.8） | Claude Code、Codex、Hermes Agent、DeepSeek Harness、hcom、Paperclip |
| [MA-09](https://duegin.github.io/agent-collab-patterns/ma-09-contract-gate.html) | 契约编排 + 闸门验证（推荐） | 规划 → 计划校验 → 任务卡 → 隔离并行 → 规则闸门 → 交叉评审 → 定向返工 → 单写者整合 | 3+N ~ 4+2N（本次 10） | 4~6 | 208s · 68.4k tokens（×27.3） | agentguild、Kimi Code、Orchestrator.inc、Gas Town、Bernstein |

## 说明

- **实测数据**：2026-11-06 在 Dify 1.17.1 上，同一个任务各跑 1 次。执行模型是 `deepseek-v4.1-flash`，评审模型是 `claude-sonnet-5-5`。只跑了 1 次，看量级，不要看小数点。
- **单 Agent 不是"天然最快"**：这次它最快，是因为任务小，它写得也最少。耗时主要由关键路径上的串行轮数决定。任务大、能拆成独立子任务时，并行扇出反而更快，但更费 token。详见[纵向对比 · 单 Agent 真的最快吗](https://duegin.github.io/agent-collab-patterns/compare.html#speed)。
- **结构对比**：纵向对比页里的串行轮数、并行度、成员之间能否看见、质量检查、返工，都是按 Dify 演示的实现核对的结构属性，不是主观评分。
- **优劣**：根据实现结构和公开研究归纳，出处列在纵向对比页的"来源"。
- **代表工具**：2026-11-06 对照官方文档和仓库重新核实过。标了"实验"或"预览"的，是厂商尚未正式发布的功能。多数工具只是"部分对应"：它的核心机制属于这种模式，不代表实现了图上每个节点。
- **MA-09 的设计思路**：中心化编排 + 写操作单线程 + 明确边界 + 独立验证。

## 修改和重新生成

源文件有两类：
- `docs/ma-*.json`：每张图的 SeeCode spec，图页面和图片都由它生成。
- `data/patterns.json`：其余的展示内容，包括实测数据、结构属性、优势、劣势、适合 / 不适合、按场景选、代表工具、来源。`scripts/site.mjs` 用它生成首页和纵向对比页，并把导航、优劣和工具区块插到每张图页面上。

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
