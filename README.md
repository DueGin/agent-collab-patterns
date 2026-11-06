# 多 Agent 协作模式图解

10 种常见的多 Agent 协作模式，每种一张可交互的协作流程图；其中 4 种需要额外基础设施的，另附系统架构图。在线浏览：**https://duegin.github.io/agent-collab-patterns/**

站点有三类页面：

- **首页**：10 张卡片，每张有流程缩略图、调用次数和串行轮数、一条优势、一条劣势和代表工具。
- **模式页**：
  - 一张可交互的协作流程图：谁把什么交给谁，主路径用蓝线和小圆点动画标出。
  - 有架构图的模式，接着是"系统架构"：把它跑起来需要的组件，包括共享状态、通信通道、隔离和闸门。
  - 然后是"优势与劣势"，含适合 / 不适合的场景和结构特征。
  - 最后是"市面上遵循此模式的工具"。
  - 页面顶部和底部都有导航。
- **[纵向对比](https://duegin.github.io/agent-collab-patterns/compare.html)**：10 种模式放在同一组维度上比较，包括四块：
  - 结构对比：模型调用、串行轮数、耗时取决于什么、并行、成员之间、质量检查、返工。
  - 按场景选。
  - 优劣速查。
  - 来源。

图都是交互式 HTML：悬停或点击节点能看详情，可以切换亮色和暗色，也可以重放动画。每张图另有一份 PNG，可以直接放进文档。

| # | 模式 | 拓扑 | 模型调用 | 串行轮数 | 架构图 | 市面上的代表工具 |
|---|---|---|---|---|---|---|
| [MA-00](https://duegin.github.io/agent-collab-patterns/ma-00-single.html) | 单 Agent 基线 | 一个 Agent 一次完成 | 1 | 1 | —（流程图即架构） | Claude Code / Codex、Cursor / Copilot、ChatGPT / Claude |
| [MA-01](https://duegin.github.io/agent-collab-patterns/ma-01-pipeline.html) | 顺序流水线 | 研究员 → 撰稿人 → 编辑 | K | K | —（流程图即架构） | MetaGPT、ChatDev、CrewAI、MS Agent Framework、Archon、Dify / Coze / n8n |
| [MA-02](https://duegin.github.io/agent-collab-patterns/ma-02-router.html) | 路由分诊 | 分类器 → 1 位专家 | 2 | 2 | —（流程图即架构） | OpenAI Agents SDK、Claude Code、Multica、Dify / Coze |
| [MA-03](https://duegin.github.io/agent-collab-patterns/ma-03-parallel.html) | 并行分工 | 3 个固定视角并行 → 汇总 | K + 1 | 2 | —（流程图即架构） | Google ADK、MS Agent Framework、LangGraph、Dify |
| [MA-04](https://duegin.github.io/agent-collab-patterns/ma-04-orchestrator.html) | 委派式编排 | 编排者动态拆分 → N 个子 Agent → 汇总 | N + 2 | 3 | [架构图](https://duegin.github.io/agent-collab-patterns/ma-04-orchestrator-arch.html) | Claude Code、Codex、Kimi Code、Hermes Agent、LangGraph、AWS CAO / Paseo |
| [MA-05](https://duegin.github.io/agent-collab-patterns/ma-05-critic-loop.html) | 生成-评审循环 | 写 → 评 → 改（最多 2 轮） | 2 ~ 2R + 1 | 2 ~ 2R + 1 | [架构图](https://duegin.github.io/agent-collab-patterns/ma-05-critic-loop-arch.html) | Claude Code + Codex、Claude Code、Orchestrator.inc、Google ADK、OpenAI Agents SDK |
| [MA-06](https://duegin.github.io/agent-collab-patterns/ma-06-debate.html) | 多 Agent 辩论 | 主持人 → 正反立论 → 交叉反驳 → 裁判 | 2R + 2 | R + 2 | —（流程图即架构） | MAD（Liang et al.）、Multi-Agent Debate（Du et al.）、MS Agent Framework、Maestro |
| [MA-07](https://duegin.github.io/agent-collab-patterns/ma-07-voting.html) | 投票集成 | 3 份独立答卷 → 评委择优融合 | N + 1 | 2 | —（流程图即架构） | Cursor、Codex Cloud、GitHub Agent HQ、llm-council、Self-Consistency |
| [MA-08](https://duegin.github.io/agent-collab-patterns/ma-08-blackboard.html) | 团队协作 · 共享黑板 | 组长 → 3 人发帖 → 互看回应 → 整合 | K × R + 2 | R + 2 | [架构图](https://duegin.github.io/agent-collab-patterns/ma-08-blackboard-arch.html) | Claude Code、Codex、Hermes Agent、DeepSeek Harness、hcom、Paperclip |
| [MA-09](https://duegin.github.io/agent-collab-patterns/ma-09-contract-gate.html) | 契约编排 + 闸门验证（推荐） | 规划 → 计划校验 → 任务卡 → 隔离并行 → 规则闸门 → 交叉评审 → 定向返工 → 单写者整合 | N + 3 ~ 2N + 4 | 4 ~ 6 | [架构图](https://duegin.github.io/agent-collab-patterns/ma-09-contract-gate-arch.html) | agentguild、Kimi Code、Orchestrator.inc、Gas Town、Bernstein |

## 说明

- **结构特征**：按每种模式的典型实现归纳。K 是成员或视角数，N 是子任务或候选数，R 是轮数。流程图里的示例取 K = 3、R = 2。
- **架构图**：只给需要额外基础设施的模式画，包括 MA-04、MA-05、MA-08、MA-09。其余模式是固定的几次模型调用，流程图就是它的架构。
- **优劣**：根据实现结构和公开研究归纳，出处列在纵向对比页的"来源"里。
- **代表工具**：2026-11-06 对照官方文档和仓库核实过。标了"实验"或"预览"的，是厂商尚未正式发布的功能。多数工具只是"部分对应"：核心机制属于这种模式，不代表实现了图上的每个节点。

## 修改和重新生成

源文件有两类：
- `docs/ma-*.json`：每张图的 SeeCode spec，包括流程图和 `*-arch.json` 架构图。图页面和图片都由它生成。
- `data/patterns.json`：其余的展示内容，包括结构属性、优势、劣势、适合 / 不适合、按场景选、代表工具、来源，以及哪种模式带架构图。`scripts/site.mjs` 用它生成首页和纵向对比页，并把导航、架构图、优劣和工具区块插到每张图页面上。

改完任意一类后运行：

```bash
scripts/build.sh            # 渲染图 → 导出缩略图和 PNG → 生成站点页面
scripts/build.sh --no-png   # 不重新导出图片（快）。只改了 patterns.json 时用这个
```

`build.sh` 会把图片导出到两个位置：
- `docs/thumbs/`：首页和模式页用的图，只有图本身，分亮色和暗色两份。
- `docs/ma-*.png`：带标题和图注的完整图。

需要 Node ≥ 20。导出图片需要本机装有 Chrome 或 Edge。脚本第一次运行时会把 SeeCode 拉到 `.seecode/`，并固定在一个指定的 commit。

## 致谢

图由 [SeeCode](https://github.com/Aryanutkarsh/SeeCode)（MIT License, © 2026 Aryanutkarsh）渲染。生成的 HTML 内嵌了 SeeCode 的查看器代码，许可证全文见 [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)。
