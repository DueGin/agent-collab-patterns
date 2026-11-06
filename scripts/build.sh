#!/usr/bin/env bash
# Re-render every diagram in docs/ from its JSON spec, rebuild docs/index.html,
# and export one PNG per diagram.
#
# Usage:  scripts/build.sh            # render + PNG
#         scripts/build.sh --no-png   # render only (fast)
#
# Needs Node >= 20. PNG export needs a Chromium-family browser (Chrome / Edge).
# SeeCode is fetched once into .seecode/ at the pinned commit below.
set -euo pipefail

SEECODE_REPO="https://github.com/Aryanutkarsh/SeeCode.git"
SEECODE_REV="9967db28e86e0e212d4ddf5a60f90fe62f3436c0"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CACHE="$ROOT/.seecode"
SC="$CACHE/skills/seecode/scripts/seecode.mjs"

if [ ! -f "$SC" ] || [ "$(git -C "$CACHE" rev-parse HEAD 2>/dev/null)" != "$SEECODE_REV" ]; then
  rm -rf "$CACHE"
  git clone --quiet "$SEECODE_REPO" "$CACHE"
  git -C "$CACHE" checkout --quiet "$SEECODE_REV"
fi

# Render every spec and write docs/index.html.
node "$SC" render "$ROOT/docs"

# SeeCode names the index after the folder ("docs") in English; give it a real title.
node - "$ROOT/docs/index.html" <<'JS'
const fs = require('fs');
const p = process.argv[2];
const title = '多 Agent 协作模式图解';
const lead = '10 种常见的多 Agent 协作模式，每种一张可交互的动画图：拓扑、主路径、同一任务的实测成本，'
  + '以及市面上遵循该模式的代表工具（2026-10）。点开任意一张：悬停追踪、点击聚焦、◀ ▶ 单步播放。'
  + ' 源文件与说明见 <a href="https://github.com/DueGin/agent-collab-patterns">GitHub</a>。';
let h = fs.readFileSync(p, 'utf8');
h = h.replace('<html lang="en">', '<html lang="zh-CN">')
  .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
  .replace(/<h1>[^<]*<\/h1>/, `<h1>${title}</h1>`)
  .replace(/<p class="lead">[\s\S]*?<\/p>/, `<p class="lead">${lead}</p>`);
fs.writeFileSync(p, h);
JS

if [ "${1:-}" != "--no-png" ]; then
  for html in "$ROOT"/docs/ma-*.html; do
    node "$SC" export "$html" --formats png
  done
fi
