#!/usr/bin/env node
// Build the site around the SeeCode diagrams, from data/patterns.json:
//   - each flow diagram page (docs/<slug>.html) gets a top/bottom nav, its architecture
//     diagram (if any), pros & cons with structural facts, and the tools list;
//   - each architecture page (docs/<slug>-arch.html) gets a nav back to its pattern;
//   - docs/index.html: card grid with static thumbnails;
//   - docs/compare.html: all patterns compared on the same dimensions.
// Injected blocks are marker-delimited, so reruns are idempotent.
//
// Usage: node scripts/site.mjs [docsDir]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const docs = process.argv[2] || join(root, 'docs');
const data = JSON.parse(readFileSync(join(root, 'data', 'patterns.json'), 'utf8'));
const { patterns, scenarios, structure, notes } = data;
const { skinCss, FONTS_HREF } = await import(pathToFileURL(join(root, '.seecode/skills/seecode/scripts/lib/tokens.mjs')).href);

const REPO = 'https://github.com/DueGin/agent-collab-patterns';
const SITE_TITLE = '多 Agent 协作模式图解';
const COLS = structure.cols; // [[key, label], ...]
const byId = Object.fromEntries(patterns.map((p) => [p.id, p]));
const nArch = patterns.filter((p) => p.arch).length;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const strip = (h) => h.replace(/<!-- (tools|site):start -->[\s\S]*?<!-- (tools|site):end -->\n?/g, '');
const block = (html) => `<!-- site:start -->${html}<!-- site:end -->\n`;
const li = (xs) => xs.map((x) => `<li>${esc(x)}</li>`).join('');

// Same theme contract as the SeeCode pages: <html data-theme>, localStorage "seecode:theme".
const THEME_BOOT = `<script>(function(){try{var t=localStorage.getItem('seecode:theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();</script>`;
const THEME_TOGGLE_JS = `(function(){var b=document.getElementById('theme-btn');if(!b)return;var r=document.documentElement,m=matchMedia('(prefers-color-scheme: dark)');
function dark(){var t=r.getAttribute('data-theme');return t?t==='dark':m.matches;}function sync(){b.setAttribute('aria-checked',String(dark()));b.textContent=dark()?'浅色':'深色';}
b.addEventListener('click',function(){var t=dark()?'light':'dark';r.setAttribute('data-theme',t);try{localStorage.setItem('seecode:theme',t);}catch(e){}sync();});
m.addEventListener&&m.addEventListener('change',sync);sync();})();`;

// Light/dark thumbnail pair; CSS shows the one matching the theme.
const THEMED_IMG_CSS = `.th-dark{display:none}
[data-theme="dark"] .th-dark{display:block}[data-theme="dark"] .th-light{display:none}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .th-dark{display:block}:root:not([data-theme="light"]) .th-light{display:none}}`;
const themedImg = (slug, alt) => `<img class="th-light" src="thumbs/${slug}-light.png" alt="${esc(alt)}" loading="lazy"><img class="th-dark" src="thumbs/${slug}-dark.png" alt="" loading="lazy">`;

// ---------- CSS injected into SeeCode pages ----------
const NAV_CSS = `
.pn{display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px;margin:0 0 20px;font-size:13px}
.pn a{color:var(--sc-muted);text-decoration:none;border:1px solid var(--sc-rule);border-radius:6px;padding:4px 10px}
.pn a:hover,.pn a:focus-visible{color:var(--sc-ink);border-color:var(--sc-accent);outline:none}
.pn .sp{flex:1}.pn .here{font:12px var(--sc-font-mono);color:var(--sc-soft)}
.pn-foot{margin-top:28px}
.sc-full .pn{display:none}`;

const PAGE_CSS = `${NAV_CSS}
.sec{margin:32px 0 8px;padding-top:20px;border-top:1px solid var(--sc-rule)}
.sec h2{font-family:var(--sc-font-serif);font-weight:400;font-size:22px;margin:0 0 6px;color:var(--sc-ink)}
.sec .note{color:var(--sc-muted);font-size:13px;margin:0 0 14px}
.arch a.fig{display:block;border:1px solid var(--sc-rule);border-radius:10px;padding:16px;text-align:center}
.arch a.fig:hover,.arch a.fig:focus-visible{border-color:var(--sc-accent);outline:none}
.arch a.fig img{max-width:100%;max-height:720px;height:auto;margin:0 auto}
.arch .open{display:inline-block;margin-top:10px;font-size:13px;color:var(--sc-accent)}
.pc .g{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px}
.pc .c{border:1px solid var(--sc-rule);border-radius:8px;padding:14px 16px}
.pc h3{font-size:14px;font-weight:600;margin:0 0 8px;color:var(--sc-ink)}
.pc ul{margin:0;padding-left:18px;color:var(--sc-ink);font-size:14px;line-height:1.7}
.pc .when{margin:10px 0 0;font-size:13px;color:var(--sc-muted);line-height:1.6}.pc .when b{color:var(--sc-ink);font-weight:600}
.facts{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px 18px;margin:14px 0 0;padding:12px 14px;border:1px solid var(--sc-rule);border-radius:8px}
.facts div{display:flex;flex-direction:column}.facts dt{font-size:12px;color:var(--sc-soft)}.facts dd{margin:0;font-size:13px;color:var(--sc-ink)}
.pc .rt{margin:10px 0 0;font-size:13px}.pc .rt a{color:var(--sc-accent)}
.sc-tools ul{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}
.sc-tools li{border:1px solid var(--sc-rule);border-radius:8px;padding:10px 12px}
.sc-tools .k{display:inline-block;font:11px var(--sc-font-mono);color:var(--sc-soft);border:1px solid var(--sc-rule);border-radius:4px;padding:0 5px;margin-bottom:6px}
.sc-tools b{display:block;font-size:14px;font-weight:600;color:var(--sc-ink)}
.sc-tools .how{display:block;font:12px var(--sc-font-mono);color:var(--sc-muted);margin-top:2px}
.sc-full .sec{display:none}
${THEMED_IMG_CSS}`;

// ---------- 1. pattern pages and their architecture pages ----------
let pages = 0;
patterns.forEach((p, i) => {
  const file = join(docs, `${p.slug}.html`);
  if (!existsSync(file)) { console.error(`skip ${p.slug}: no ${file}`); return; }
  const prev = patterns[i - 1], next = patterns[i + 1];
  const nav = (cls) => `<nav class="pn ${cls}" aria-label="模式导航"><a href="./">← 全部模式</a>`
    + (prev ? `<a href="${prev.slug}.html" title="${esc(prev.name)}">‹ ${esc(prev.id)}</a>` : '')
    + `<span class="here">${esc(p.id)} / ${esc(patterns[patterns.length - 1].id)}</span>`
    + (next ? `<a href="${next.slug}.html" title="${esc(next.name)}">${esc(next.id)} ›</a>` : '')
    + `<span class="sp"></span>${p.arch ? `<a href="#arch-h">系统架构 ↓</a>` : ''}<a href="compare.html">纵向对比 →</a></nav>`;

  const arch = p.arch ? `<section class="sec arch" aria-labelledby="arch-h"><h2 id="arch-h">系统架构</h2>`
    + `<p class="note">上面的图是协作流程：谁把什么交给谁。这张图是把它真正跑起来需要的组件：共享状态、通信通道、隔离和闸门。</p>`
    + `<a class="fig" href="${p.arch}.html">${themedImg(p.arch, p.name + ' 系统架构图')}<span class="open">打开可交互的架构图 →</span></a></section>` : '';

  const facts = `<dl class="facts" aria-label="结构特征">${COLS.map(([k, l]) => `<div><dt>${esc(l)}</dt><dd>${esc(p[k])}</dd></div>`).join('')}</dl>`;
  const pc = `<section class="sec pc" aria-labelledby="pc-h"><h2 id="pc-h">优势与劣势</h2><div class="g">`
    + `<div class="c"><h3>＋ 优势</h3><ul>${li(p.pros)}</ul><p class="when"><b>适合：</b>${p.fit.map(esc).join('；')}</p></div>`
    + `<div class="c"><h3>－ 劣势</h3><ul>${li(p.cons)}</ul><p class="when"><b>不适合：</b>${p.unfit.map(esc).join('；')}</p></div></div>`
    + facts + `<p class="rt"><a href="compare.html#matrix">和其它模式对比 →</a></p></section>`;

  const tools = `<section class="sec sc-tools" aria-labelledby="tl-h"><h2 id="tl-h">市面上遵循此模式的工具</h2>`
    + `<p class="note">2026-11-06 对照官方文档和仓库核实。多数只是"部分对应"：核心机制属于这种模式，不代表实现了图上的每个节点；标"实验""预览"的是厂商尚未正式发布的功能。</p><ul>`
    + p.tools.map((t) => `<li><span class="k">${esc(t.kind)}</span><b>${esc(t.name)}</b><span class="how">${esc(t.how)}</span></li>`).join('')
    + `</ul></section>`;

  let h = strip(readFileSync(file, 'utf8'));
  h = h.replace('</head>', block(`<style id="site-css">${PAGE_CSS}\n</style>`) + '</head>')
    .replace('<main class="sc-page">', '<main class="sc-page">\n' + block(nav('pn-top')))
    .replace('</figure>', '</figure>\n' + block(arch + pc + tools + nav('pn-foot')));
  writeFileSync(file, h);
  pages++;

  if (p.arch) {
    const af = join(docs, `${p.arch}.html`);
    if (!existsSync(af)) { console.error(`skip ${p.arch}: no ${af}`); return; }
    const anav = (cls) => `<nav class="pn ${cls}" aria-label="架构图导航"><a href="${p.slug}.html">← ${esc(p.id)} ${esc(p.name)}</a>`
      + `<a href="./">全部模式</a><span class="sp"></span><a href="compare.html">纵向对比 →</a></nav>`;
    let a = strip(readFileSync(af, 'utf8'));
    a = a.replace('</head>', block(`<style id="site-css">${NAV_CSS}\n</style>`) + '</head>')
      .replace('<main class="sc-page">', '<main class="sc-page">\n' + block(anav('pn-top')))
      .replace('</figure>', '</figure>\n' + block(anav('pn-foot')));
    writeFileSync(af, a);
    pages++;
  }
});

// ---------- shared shell for index and compare ----------
const SITE_CSS = `
*{box-sizing:border-box}body{margin:0;background:var(--sc-paper);color:var(--sc-ink);font-family:var(--sc-font-sans);line-height:1.5}
main{max-width:1240px;margin:0 auto;padding:44px 24px 64px}
a{color:var(--sc-accent)}
.top{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px 20px}
.top h1{font-family:var(--sc-font-serif);font-weight:400;font-size:36px;margin:0;flex:1;min-width:260px}
.top nav{display:flex;gap:8px;align-items:center;font-size:13px}
.top nav a,.top nav button{color:var(--sc-muted);text-decoration:none;border:1px solid var(--sc-rule);border-radius:6px;padding:4px 10px;background:none;font:inherit;cursor:pointer}
.top nav a:hover,.top nav button:hover,.top nav a:focus-visible,.top nav button:focus-visible{color:var(--sc-ink);border-color:var(--sc-accent);outline:none}
.top nav a.cur{color:var(--sc-ink);border-color:var(--sc-ink)}
p.lead{color:var(--sc-muted);margin:10px 0 28px;max-width:860px}
h2{font-family:var(--sc-font-serif);font-weight:400;font-size:24px;margin:44px 0 6px}
p.sub{color:var(--sc-muted);font-size:13px;margin:0 0 16px}
footer{margin-top:48px;padding-top:16px;border-top:1px solid var(--sc-rule);color:var(--sc-soft);font-size:12px}
${THEMED_IMG_CSS}
@media (max-width:640px){main{padding:28px 16px 48px}.top h1{font-size:28px}}`;

const head = (title, extraCss) => `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>${THEME_BOOT}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${esc(FONTS_HREF)}">
<style>${skinCss({ skin: 'light' })}${SITE_CSS}${extraCss}</style></head><body><main>`;

const topBar = (title, current) => `<header class="top"><h1>${esc(title)}</h1><nav aria-label="站点导航">
<a href="./"${current === 'index' ? ' class="cur" aria-current="page"' : ''}>全部模式</a>
<a href="compare.html"${current === 'compare' ? ' class="cur" aria-current="page"' : ''}>纵向对比</a>
<a href="${REPO}">GitHub</a><button id="theme-btn" type="button" role="switch" aria-checked="false" aria-label="深色模式">深色</button></nav></header>`;

const footer = `<footer>结构特征按每种模式的典型实现归纳；优劣根据实现结构和公开研究整理，不是测量结果。代表工具 2026-11-06 对照官方文档核实，多数只是部分对应。图由 <a href="https://github.com/Aryanutkarsh/SeeCode">SeeCode</a> 渲染。</footer>`;
const tail = (js = '') => `${footer}</main><script>${THEME_TOGGLE_JS}${js}</script></body></html>\n`;

// ---------- 2. index ----------
const INDEX_CSS = `
.grid{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:18px}
.card{display:flex;flex-direction:column;height:100%;text-decoration:none;color:inherit;border:1px solid var(--sc-rule);border-radius:10px;overflow:hidden}
.card:hover,.card:focus-visible{border-color:var(--sc-accent);outline:none}
.thumb{aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;padding:12px;border-bottom:1px solid var(--sc-rule);overflow:hidden}
.thumb img{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain}
.body{padding:12px 14px 14px;display:flex;flex-direction:column;gap:6px;flex:1}
.idl{display:flex;align-items:center;gap:8px}.id{font:12px var(--sc-font-mono);color:var(--sc-soft)}
.badge{font-size:11px;color:var(--sc-accent);border:1px solid var(--sc-accent);border-radius:4px;padding:0 5px}
.body h3{margin:0;font-size:17px;font-weight:600}
.topo{margin:0;font-size:13px;color:var(--sc-muted)}
.st{display:flex;flex-wrap:wrap;gap:4px 14px;font:12px var(--sc-font-mono);color:var(--sc-muted);margin:2px 0}
.pm{margin:0;font-size:13px;line-height:1.6}.pm b{font-weight:600}
.tl{margin:auto 0 0;padding-top:8px;font-size:12px;color:var(--sc-soft);line-height:1.6}`;

const card = (p) => `<li><a class="card" href="${p.slug}.html">
<div class="thumb">${themedImg(p.slug, p.name + ' 协作流程图')}</div>
<div class="body"><div class="idl"><span class="id">${esc(p.id)}</span>${p.arch ? '<span class="badge">含架构图</span>' : ''}</div><h3>${esc(p.name)}</h3><p class="topo">${esc(p.topo)}</p>
<div class="st"><span>调用 ${esc(p.calls)}</span><span>串行 ${esc(p.rounds)} 轮</span><span>并行 ${esc(p.parallel)}</span></div>
<p class="pm"><b>＋</b> ${esc(p.pros[0])}</p><p class="pm"><b>－</b> ${esc(p.cons[0])}</p>
<p class="tl">${p.tools.map((t) => esc(t.name)).join(' · ')}</p></div></a></li>`;

writeFileSync(join(docs, 'index.html'), head(SITE_TITLE, INDEX_CSS)
  + topBar(SITE_TITLE, 'index')
  + `<p class="lead">10 种常见的多 Agent 协作模式。每种一张可交互的协作流程图（悬停追踪、点击聚焦、◀ ▶ 单步）；其中 ${nArch} 种需要额外基础设施的，另附系统架构图。`
  + `每张图下方列出优劣和市面上遵循该模式的工具；各模式之间的横向比较见 <a href="compare.html">纵向对比</a>。</p>`
  + `<ol class="grid">${patterns.map(card).join('')}</ol>` + tail());

// ---------- 3. compare ----------
const COMPARE_CSS = `
.tw{overflow-x:auto;border:1px solid var(--sc-rule);border-radius:10px}
table{border-collapse:collapse;width:100%;font-size:13px}
th,td{padding:9px 12px;text-align:left;border-bottom:1px solid var(--sc-rule);vertical-align:top}
tr:last-child td{border-bottom:none}
th{font-weight:600;color:var(--sc-muted);font-size:12px;white-space:nowrap;background:color-mix(in srgb,var(--sc-ink) 4%,var(--sc-paper))}
td.n{font-family:var(--sc-font-mono);font-variant-numeric:tabular-nums;white-space:nowrap}
td.p a{color:var(--sc-ink);text-decoration:none;font-weight:600;white-space:nowrap}td.p a:hover{color:var(--sc-accent)}
td.p span{display:block;font:11px var(--sc-font-mono);color:var(--sc-soft);font-weight:400}
td.p a.ar{display:inline-block;margin-top:4px;font-size:11px;font-weight:400;color:var(--sc-accent)}
td.w{min-width:160px}td.fit{color:var(--sc-muted);min-width:180px}
.matrix th:first-child,.matrix td:first-child{position:sticky;left:0;background:var(--sc-paper);z-index:1}
.matrix th:first-child{background:color-mix(in srgb,var(--sc-ink) 4%,var(--sc-paper))}
.pcg{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:14px}
.pcc{border:1px solid var(--sc-rule);border-radius:10px;padding:14px 16px}
.pcc h3{margin:0 0 8px;font-size:15px}.pcc h3 a{color:var(--sc-ink);text-decoration:none}.pcc h3 a:hover{color:var(--sc-accent)}.pcc h3 span{font:12px var(--sc-font-mono);color:var(--sc-soft);font-weight:400;margin-right:6px}
.pcc .two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.pcc h4{margin:0 0 4px;font-size:12px;color:var(--sc-muted);font-weight:600}
.pcc ul{margin:0;padding-left:16px;font-size:13px;line-height:1.6}
.src{font-size:13px;line-height:1.9;padding-left:18px;margin:0}.src a{color:var(--sc-muted)}.src a:hover{color:var(--sc-accent)}
@media (max-width:640px){.pcc .two{grid-template-columns:1fr}}`;

const patCell = (p) => `<td class="p"><a href="${p.slug}.html">${esc(p.name)}</a><span>${esc(p.id)}</span>${p.arch ? `<a class="ar" href="${p.arch}.html">架构图 →</a>` : ''}</td>`;

const matrix = `<div class="tw"><table class="matrix"><thead><tr><th>模式</th>${COLS.map(([, l]) => `<th>${esc(l)}</th>`).join('')}</tr></thead><tbody>`
  + patterns.map((p) => `<tr>${patCell(p)}`
    + COLS.map(([k]) => `<td class="${k === 'calls' || k === 'rounds' ? 'n' : 'w'}">${esc(p[k])}</td>`).join('') + `</tr>`).join('')
  + `</tbody></table></div>`;

const scen = `<div class="tw"><table><thead><tr><th>你的情况</th><th>推荐模式</th><th>为什么</th></tr></thead><tbody>`
  + scenarios.map((s) => { const p = byId[s.id]; return `<tr><td>${esc(s.need)}</td>${patCell(p)}<td class="fit">${esc(s.why)}</td></tr>`; }).join('')
  + `</tbody></table></div>`;

const pcg = `<div class="pcg">` + patterns.map((p) => `<div class="pcc"><h3><a href="${p.slug}.html"><span>${esc(p.id)}</span>${esc(p.name)}</a></h3><div class="two">`
  + `<div><h4>＋ 优势</h4><ul>${li(p.pros)}</ul></div><div><h4>－ 劣势</h4><ul>${li(p.cons)}</ul></div></div></div>`).join('') + `</div>`;

writeFileSync(join(docs, 'compare.html'), head(`纵向对比 · ${SITE_TITLE}`, COMPARE_CSS)
  + topBar('纵向对比', 'compare')
  + `<p class="lead">10 种模式放在同一组维度上比较：先看结构，再按场景选，最后是各自的优劣。点模式名跳到它的流程图；带"架构图"的可以直接看系统架构。</p>`
  + `<h2 id="matrix">结构对比</h2><p class="sub">${esc(structure._note)}串行轮数是关键路径上必须依次等待的模型调用次数，它和"耗时取决于"一起决定了这种模式快不快。表格可横向滚动。</p>`
  + matrix
  + `<h2 id="choose">按场景选</h2><p class="sub">每种情况下最先考虑的模式；实际可以组合，比如在 MA-04 的每个子任务里套一个 MA-05。</p>`
  + scen
  + `<h2 id="pros-cons">优劣速查</h2><p class="sub">每种模式的完整优劣、适用场景、架构图和代表工具，在它自己的页面里。</p>`
  + pcg
  + `<h2 id="sources">来源</h2><p class="sub">优劣里引用的公开资料；代表工具的出处是各自的官方文档和仓库。</p><ul class="src">`
  + notes.sources.map(([t, u]) => `<li><a href="${esc(u)}">${esc(t)}</a></li>`).join('') + `</ul>`
  + tail());

console.log(JSON.stringify({ ok: true, pages, index: true, compare: true }));
