#!/usr/bin/env bash
# Rebuild the whole site in docs/:
#   1. render every diagram from its JSON spec (docs/ma-*.json -> .html);
#   2. export diagram-only thumbnails (light + dark) and the full-figure PNGs;
#   3. scripts/site.mjs: index, compare page, nav + pros/cons + tools on each
#      diagram page, all from data/patterns.json.
#
# Usage:  scripts/build.sh            # everything
#         scripts/build.sh --no-png   # skip step 2 (fast; reuses existing images)
#
# Needs Node >= 20. Image export needs a Chromium-family browser (Chrome / Edge).
# SeeCode is fetched once into .seecode/ at the pinned commit below.
set -euo pipefail

SEECODE_REPO="https://github.com/Aryanutkarsh/SeeCode.git"
SEECODE_REV="9967db28e86e0e212d4ddf5a60f90fe62f3436c0"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOCS="$ROOT/docs"
CACHE="$ROOT/.seecode"
SC="$CACHE/skills/seecode/scripts/seecode.mjs"

if [ ! -f "$SC" ] || [ "$(git -C "$CACHE" rev-parse HEAD 2>/dev/null)" != "$SEECODE_REV" ]; then
  rm -rf "$CACHE"
  git clone --quiet "$SEECODE_REPO" "$CACHE"
  git -C "$CACHE" checkout --quiet "$SEECODE_REV"
fi

# Export <html> to <html minus .html>.png and make sure the file really changed:
# a long diagram occasionally reports ok without writing. Up to 3 tries.
export_png() {
  local html="$1"; shift
  local png="${html%.html}.png" mark
  mark="$(mktemp)"
  for attempt in 1 2 3; do
    node "$SC" export "$html" --formats png "$@" >/dev/null || true
    if [ -f "$png" ] && [ "$png" -nt "$mark" ]; then rm -f "$mark"; return 0; fi
    echo "retry $attempt: $(basename "$png") not written" >&2
  done
  rm -f "$mark"
  echo "FAILED: $(basename "$png")" >&2
  return 1
}

# 1. Render every spec (also writes SeeCode's own index.html; step 3 replaces it).
node "$SC" render "$DOCS" >/dev/null

# 2. Images come from the plain pages, so they show only the diagram.
if [ "${1:-}" != "--no-png" ]; then
  mkdir -p "$DOCS/thumbs"
  for html in "$DOCS"/ma-*.html; do
    slug="$(basename "$html" .html)"
    # Thumbnails first: export writes to the same <slug>.png path each time.
    export_png "$html" --crop diagram --scale 2 && mv "$DOCS/$slug.png" "$DOCS/thumbs/$slug-light.png"
    export_png "$html" --crop diagram --scale 2 --theme dark && mv "$DOCS/$slug.png" "$DOCS/thumbs/$slug-dark.png"
    export_png "$html"
    echo "images: $slug"
  done
fi

# 3. Site pages.
node "$ROOT/scripts/site.mjs" "$DOCS"
