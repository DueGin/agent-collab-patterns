#!/usr/bin/env node
// Build the site around the SeeCode diagrams, from data/patterns.json:
//   - each docs/ma-*.html gets a top nav (all / prev / next / compare), a pros & cons
//     section and the tools list, injected after the diagram (idempotent, marker-delimited);
//   - docs/index.html is rewritten as a card grid with static thumbnails (no iframes);
//   - docs/compare.html is the side-by-side comparison of all patterns.
//
// Usage: node scripts/site.mjs [docsDir]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const docs = process.argv[2] || join(root, 'docs');
const data = JSON.parse(readFileSync(join(root, 'data', 'patterns.json'), 'utf8'));
const { patterns, ratings, scenarios, measured } = data;
const { skinCss, FONTS_HREF } = await import(pathToFileURL(join(root, '.seecode/skills/seecode/scripts/lib/tokens.mjs')).href);

const REPO = 'https://github.com/DueGin/agent-collab-patterns';
const SITE_TITLE = '多 Agent 协作模式图解';
const DIMS = ratings.dims; // [[key, label], ...]
const byId = Object.fromEntries(patterns.map((p) => [p.id, p]));

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const kTokens = (n) => `${(n / 1000).toFixed(1)}K`;
const fmtX = (x) => `×${x.toFixed(1)}`;
const strip = (h) => h.replace(/<!-- (tools|site):start -->[\s\S]*?<!-- (tools|site):end -->\n?/g, '');
const block = (html) => `<!-- site:start -->${html}<!-- site:end -->\n`;

// Same theme contract as the SeeCode pages: <html data-theme>, localStorage "seecode:theme".
const THEME_BOOT = `<script>(function(){try{var t=localStorage.getItem('seecode:theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();</script>`;
const THEME_TOGGLE_JS = `(function(){var b=document.getElementById('theme-btn');if(!b)return;var r=document.documentElement,m=matchMedia('(prefers-color-scheme: dark)');
function dark(){var t=r.getAttribute('data-theme');return t?t==='dark':m.matches;}function sync(){b.setAttribute('aria-checked',String(dark()));b.textContent=dark()?'浅色':'深色';}
b.addEventListener('click',function(){var t=dark()?'light':'dark';r.setAttribute('data-theme',t);try{localStorage.setItem('seecode:theme',t);}catch(e){}sync();});
m.addEventListener&&m.addEventListener('change',sync);sync();})();`;

const dots = (n, label) => `<span class="dots" role="img" aria-label="${esc(label)} ${n}/5">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;

// ---------- shared CSS ----------
const DOT_CSS = `.dots{display:inline-flex;gap:3px;vertical-align:middle}.dots i{width:8px;height:8px;border-radius:50%;border:1.5px solid var(--sc-soft);box-sizing:border-box}.dots i.on{background:var(--sc-ink);border-color:var(--sc-ink)}`;

const PAGE_CSS = `
.pn{display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px;margin:0 0 20px;font-size:13px}
.pn a{color:var(--sc-muted);text-decoration:none;border:1px solid var(--sc-rule);border-radius:6px;padding:4px 10px}
.pn a:hover,.pn a:focus-visible{color:var(--sc-ink);border-color:var(--sc-accent);outline:none}
.pn .sp{flex:1}.pn .here{font:12px var(--sc-font-mono);color:var(--sc-soft)}
.pc{margin:32px 0 8px;padding-top:20px;border-top:1px solid var(--sc-rule)}
.pc h2,.sc-tools h2{font-family:var(--sc-font-serif);font-weight:400;font-size:22px;margin:0 0 12px;color:var(--sc-ink)}
.pc .g{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px}
.pc .c{border:1px solid var(--sc-rule);border-radius:8px;padding:14px 16px}
.pc h3{font-size:14px;font-weight:600;margin:0 0 8px;color:var(--sc-ink)}
.pc ul{margin:0;padding-left:18px;color:var(--sc-ink);font-size:14px;line-height:1.7}
.pc .when{margin:10px 0 0;font-size:13px;color:var(--sc-muted);line-height:1.6}.pc .when b{color:var(--sc-ink);font-weight:600}
.pc .rt{display:flex;flex-wrap:wrap;gap:6px 18px;margin:14px 0 0;font-size:13px;color:var(--sc-muted);align-items:center}
.pc .rt a{color:var(--sc-accent)}
.sc-tools{margin:28px 0 8px;padding-top:20px;border-top:1px solid var(--sc-rule)}
.sc-tools .note{color:var(--sc-muted);font-size:13px;margin:-6px 0 14px}
.sc-tools ul{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}
.sc-tools li{border:1px solid var(--sc-rule);border-radius:8px;padding:10px 12px}
.sc-tools .k{display:inline-block;font:11px var(--sc-font-mono);color:var(--sc-soft);border:1px solid var(--sc-rule);border-radius:4px;padding:0 5px;margin-bottom:6px}
.sc-tools b{display:block;font-size:14px;font-weight:600;color:var(--sc-ink)}
.sc-tools .how{display:block;font:12px var(--sc-font-mono);color:var(--sc-muted);margin-top:2px}
.pn-foot{margin-top:28px}
.sc-full .pn,.sc-full .pc,.sc-full .sc-tools{display:none}
${DOT_CSS}`;

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
.th-dark{display:none}
[data-theme="dark"] .th-dark{display:block}[data-theme="dark"] .th-light{display:none}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .th-dark{display:block}:root:not([data-theme="light"]) .th-light{display:none}}
@media (max-width:640px){main{padding:28px 16px 48px}.top h1{font-size:28px}}
${DOT_CSS}`;

const head = (title, extraCss) => `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>${THEME_BOOT}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${esc(FONTS_HREF)}">
<style>${skinCss({ skin: 'light' })}${SITE_CSS}${extraCss}</style></head><body><main>`;

const topBar = (title, current) => `<header class="top"><h1>${esc(title)}</h1><nav aria-label="站点导航">
<a href="./"${current === 'index' ? ' class="cur" aria-current="page"' : ''}>全部模式</a>
<a href="compare.html"${current === 'compare' ? ' class="cur" aria-current="page"' : ''}>纵向对比</a>
<a href="${REPO}">GitHub</a><button id="theme-btn" type="button" role="switch" aria-checked="false" aria-label="深色模式">深色</button></nav></header>`;

const footer = `<footer>实测：${esc(measured.date)} 在 ${esc(measured.platform)} 上同一任务各跑 ${measured.runs} 次（执行 ${esc(measured.executor)}，评审 ${esc(measured.reviewer)}），看量级即可。
评分是作者的定性判断，不是测量结果。代表工具为 2026-10 调研时的状态，多数只是部分对应。图由 <a href="https://github.com/Aryanutkarsh/SeeCode">SeeCode</a> 渲染。</footer>`;

const tail = (js = '') => `${footer}</main><script>${THEME_TOGGLE_JS}${js}</script></body></html>\n`;

// ---------- 1. pattern pages ----------
let pages = 0;
patterns.forEach((p, i) => {
  const file = join(docs, `${p.slug}.html`);
  if (!existsSync(file)) { console.error(`skip ${p.slug}: no ${file}`); return; }
  const prev = patterns[i - 1], next = patterns[i + 1];
  const nav = (cls) => `<nav class="pn ${cls}" aria-label="模式导航"><a href="./">← 全部模式</a>`
    + (prev ? `<a href="${prev.slug}.html" title="${esc(prev.name)}">‹ ${esc(prev.id)}</a>` : '')
    + `<span class="here">${esc(p.id)} / ${esc(patterns[patterns.length - 1].id)}</span>`
    + (next ? `<a href="${next.slug}.html" title="${esc(next.name)}">${esc(next.id)} ›</a>` : '')
    + `<span class="sp"></span><a href="compare.html">纵向对比 →</a></nav>`;
  const li = (xs) => xs.map((x) => `<li>${esc(x)}</li>`).join('');
  const rt = DIMS.map(([k, label]) => `<span>${esc(label)} ${dots(p.scores[k], label)}</span>`).join('');
  const pc = `<section class="pc" aria-labelledby="pc-h"><h2 id="pc-h">优势与劣势</h2><div class="g">`
    + `<div class="c"><h3>＋ 优势</h3><ul>${li(p.pros)}</ul><p class="when"><b>适合：</b>${p.fit.map(esc).join('；')}</p></div>`
    + `<div class="c"><h3>－ 劣势</h3><ul>${li(p.cons)}</ul><p class="when"><b>不适合：</b>${p.unfit.map(esc).join('；')}</p></div></div>`
    + `<div class="rt">${rt}<a href="compare.html#matrix">与其它模式对比 →</a></div></section>`;
  const tools = `<section class="sc-tools" aria-labelledby="tl-h"><h2 id="tl-h">市面上遵循此模式的工具</h2>`
    + `<p class="note">2026-10 调研时的状态。多数只是"部分对应"：核心机制属于这种模式，不代表实现了图上的每个节点。</p><ul>`
    + p.tools.map((t) => `<li><span class="k">${esc(t.kind)}</span><b>${esc(t.name)}</b><span class="how">${esc(t.how)}</span></li>`).join('')
    + `</ul></section>`;
  let h = strip(readFileSync(file, 'utf8'));
  h = h.replace('</head>', block(`<style id="site-css">${PAGE_CSS}\n</style>`) + '</head>')
    .replace('<main class="sc-page">', '<main class="sc-page">\n' + block(nav('pn-top')))
    .replace('</figure>', '</figure>\n' + block(pc + tools + nav('pn-foot')));
  writeFileSync(file, h);
  pages++;
});

// ---------- 2. index ----------
const INDEX_CSS = `
.grid{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:18px}
.card{display:flex;flex-direction:column;height:100%;text-decoration:none;color:inherit;border:1px solid var(--sc-rule);border-radius:10px;overflow:hidden}
.card:hover,.card:focus-visible{border-color:var(--sc-accent);outline:none}
.thumb{aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;padding:12px;border-bottom:1px solid var(--sc-rule);overflow:hidden}
.thumb img{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain}
.body{padding:12px 14px 14px;display:flex;flex-direction:column;gap:6px;flex:1}
.id{font:12px var(--sc-font-mono);color:var(--sc-soft)}
.body h3{margin:0;font-size:17px;font-weight:600}
.topo{margin:0;font-size:13px;color:var(--sc-muted)}
.st{display:flex;gap:14px;font:12px var(--sc-font-mono);color:var(--sc-muted);margin:2px 0}
.pm{margin:0;font-size:13px;line-height:1.6}.pm b{font-weight:600}
.tl{margin:auto 0 0;padding-top:8px;font-size:12px;color:var(--sc-soft);line-height:1.6}`;

const card = (p) => `<li><a class="card" href="${p.slug}.html">
<div class="thumb"><img class="th-light" src="thumbs/${p.slug}-light.png" alt="${esc(p.name)} 拓扑图" loading="lazy"><img class="th-dark" src="thumbs/${p.slug}-dark.png" alt="" loading="lazy"></div>
<div class="body"><span class="id">${esc(p.id)}</span><h3>${esc(p.name)}</h3><p class="topo">${esc(p.topo)}</p>
<div class="st"><span>调用 ${esc(p.calls)}</span><span>${p.secs}s</span><span>${kTokens(p.tokens)} tokens ${fmtX(p.x)}</span></div>
<p class="pm"><b>＋</b> ${esc(p.pros[0])}</p><p class="pm"><b>－</b> ${esc(p.cons[0])}</p>
<p class="tl">${p.tools.map((t) => esc(t.name)).join(' · ')}</p></div></a></li>`;

writeFileSync(join(docs, 'index.html'), head(SITE_TITLE, INDEX_CSS)
  + topBar(SITE_TITLE, 'index')
  + `<p class="lead">10 种常见的多 Agent 协作模式，每种一张可交互的动画图（悬停追踪、点击聚焦、◀ ▶ 单步）。每张图下方列出优劣和市面上遵循该模式的工具；`
  + `想横向比较成本、速度、质量把关，看 <a href="compare.html">纵向对比</a>。</p>`
  + `<ol class="grid">${patterns.map(card).join('')}</ol>` + tail());

// ---------- 3. compare ----------
const AXES = { secs: { max: 240, ticks: [0, 60, 120, 180, 240], fmt: (v) => `${v}s` }, tokens: { max: 80000, ticks: [0, 20000, 40000, 60000, 80000], fmt: (v) => (v ? `${v / 1000}K` : '0') } };
const barChart = (key, title, sub) => {
  const ax = AXES[key];
  const rows = patterns.map((p) => {
    const v = p[key], w = (v / ax.max) * 100;
    const label = key === 'secs' ? `${v}s` : `${kTokens(v)} ${fmtX(p.x)}`;
    const tip = key === 'secs' ? `${v} 秒` : `${v.toLocaleString('en-US')} tokens（${fmtX(p.x)}）`;
    return `<div class="row"><a class="nm" href="${p.slug}.html"><span>${esc(p.id)}</span>${esc(p.short)}</a>`
      + `<div class="track"><span class="bar" tabindex="0" style="width:${w.toFixed(2)}%" data-v="${esc(tip)}" data-n="${esc(p.id + ' ' + p.name)}" aria-label="${esc(p.id + ' ' + p.name + '：' + tip)}"></span><span class="val">${esc(label)}</span></div></div>`;
  }).join('');
  const ticks = ax.ticks.map((t) => `<span style="left:${(t / ax.max) * 100}%">${ax.fmt(t)}</span>`).join('');
  return `<figure class="chart"><figcaption><b>${esc(title)}</b><span>${esc(sub)}</span></figcaption><div class="plot">${rows}<div class="axis"><div class="ticks">${ticks}</div></div></div></figure>`;
};

const COMPARE_CSS = `
.charts{display:grid;grid-template-columns:repeat(auto-fit,minmax(440px,1fr));gap:20px}
.chart{margin:0;border:1px solid var(--sc-rule);border-radius:10px;padding:16px 18px 10px}
.chart figcaption{display:flex;flex-direction:column;margin-bottom:12px}.chart figcaption b{font-size:15px}.chart figcaption span{font-size:12px;color:var(--sc-muted)}
.plot{position:relative}
.row{display:grid;grid-template-columns:132px 1fr;align-items:center;height:30px}
.nm{font-size:13px;color:var(--sc-ink);text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nm span{font:11px var(--sc-font-mono);color:var(--sc-soft);margin-right:6px}
.nm:hover{color:var(--sc-accent)}
.track{position:relative;height:100%;display:flex;align-items:center;border-left:1px solid var(--sc-soft);
  background-image:linear-gradient(to right,var(--sc-rule) 1px,transparent 1px);background-size:25% 100%;background-position:-1px 0}
.bar{display:block;height:18px;min-width:2px;background:var(--bar);border-radius:0 4px 4px 0;cursor:default;outline:none}
.bar:hover,.bar:focus-visible{background:var(--bar-hi)}
.bar:focus-visible{box-shadow:0 0 0 2px var(--sc-paper),0 0 0 4px var(--sc-ink)}
.val{margin-left:6px;font:12px var(--sc-font-mono);color:var(--sc-ink);font-variant-numeric:tabular-nums;white-space:nowrap}
.axis{margin-left:132px;position:relative;height:22px}.ticks span{position:absolute;top:4px;transform:translateX(-50%);font:11px var(--sc-font-mono);color:var(--sc-soft);font-variant-numeric:tabular-nums}
.ticks span:first-child{transform:none}.ticks span:last-child{transform:translateX(-100%)}
:root{--bar:#2f54eb;--bar-hi:#4a6bf0}
[data-theme="dark"]{--bar:#7b93ff;--bar-hi:#98abff}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bar:#7b93ff;--bar-hi:#98abff}}
#tip{position:fixed;z-index:10;pointer-events:none;background:var(--sc-paper);border:1px solid var(--sc-rule);border-radius:6px;padding:6px 10px;box-shadow:0 4px 14px rgba(0,0,0,.12);font-size:12px;display:none}
#tip b{display:block;font:600 14px var(--sc-font-mono);color:var(--sc-ink)}#tip span{display:flex;align-items:center;gap:6px;color:var(--sc-muted)}#tip span::before{content:"";width:12px;height:2px;background:var(--bar)}
.tw{overflow-x:auto;border:1px solid var(--sc-rule);border-radius:10px}
table{border-collapse:collapse;width:100%;font-size:13px}
th,td{padding:9px 12px;text-align:left;border-bottom:1px solid var(--sc-rule);vertical-align:middle}
tr:last-child td{border-bottom:none}
th{font-weight:600;color:var(--sc-muted);font-size:12px;white-space:nowrap;background:color-mix(in srgb,var(--sc-ink) 4%,var(--sc-paper))}
td.n{font-family:var(--sc-font-mono);font-variant-numeric:tabular-nums;white-space:nowrap;text-align:right}th.n{text-align:right}
td.p a{color:var(--sc-ink);text-decoration:none;font-weight:600;white-space:nowrap}td.p a:hover{color:var(--sc-accent)}td.p span{display:block;font:11px var(--sc-font-mono);color:var(--sc-soft);font-weight:400}
td.fit{color:var(--sc-muted);min-width:180px}
.matrix th:first-child,.matrix td:first-child{position:sticky;left:0;background:var(--sc-paper);z-index:1}
.matrix th:first-child{background:color-mix(in srgb,var(--sc-ink) 4%,var(--sc-paper))}
.pcg{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:14px}
.pcc{border:1px solid var(--sc-rule);border-radius:10px;padding:14px 16px}
.pcc h3{margin:0 0 8px;font-size:15px}.pcc h3 a{color:var(--sc-ink);text-decoration:none}.pcc h3 a:hover{color:var(--sc-accent)}.pcc h3 span{font:12px var(--sc-font-mono);color:var(--sc-soft);font-weight:400;margin-right:6px}
.pcc .two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.pcc h4{margin:0 0 4px;font-size:12px;color:var(--sc-muted);font-weight:600}
.pcc ul{margin:0;padding-left:16px;font-size:13px;line-height:1.6}
@media (max-width:640px){.charts{grid-template-columns:1fr}.row{grid-template-columns:96px 1fr}.axis{margin-left:96px}.pcc .two{grid-template-columns:1fr}}`;

const matrix = `<div class="tw"><table class="matrix"><thead><tr><th>模式</th><th class="n">调用</th><th class="n">耗时</th><th class="n">tokens</th>`
  + DIMS.map(([, l]) => `<th>${esc(l)}</th>`).join('') + `<th>最适合</th></tr></thead><tbody>`
  + patterns.map((p) => `<tr><td class="p"><a href="${p.slug}.html">${esc(p.name)}</a><span>${esc(p.id)}</span></td>`
    + `<td class="n">${esc(p.calls)}</td><td class="n">${p.secs}s</td><td class="n">${kTokens(p.tokens)} ${fmtX(p.x)}</td>`
    + DIMS.map(([k, l]) => `<td>${dots(p.scores[k], l)}</td>`).join('')
    + `<td class="fit">${esc(p.fit[0])}</td></tr>`).join('')
  + `</tbody></table></div>`;

const scen = `<div class="tw"><table><thead><tr><th>你的情况</th><th>推荐模式</th><th>为什么</th></tr></thead><tbody>`
  + scenarios.map((s) => { const p = byId[s.id]; return `<tr><td>${esc(s.need)}</td><td class="p"><a href="${p.slug}.html">${esc(p.name)}</a><span>${esc(p.id)}</span></td><td class="fit">${esc(s.why)}</td></tr>`; }).join('')
  + `</tbody></table></div>`;

const pcg = `<div class="pcg">` + patterns.map((p) => `<div class="pcc"><h3><a href="${p.slug}.html"><span>${esc(p.id)}</span>${esc(p.name)}</a></h3><div class="two">`
  + `<div><h4>＋ 优势</h4><ul>${p.pros.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`
  + `<div><h4>－ 劣势</h4><ul>${p.cons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></div></div>`).join('') + `</div>`;

const TIP_JS = `(function(){var tip=document.getElementById('tip'),v=tip.querySelector('b'),n=tip.querySelector('span');
function show(e){var b=e.currentTarget,r=b.getBoundingClientRect();v.textContent=b.dataset.v;n.textContent=b.dataset.n;tip.style.display='block';
var x=Math.min(r.right+10,innerWidth-tip.offsetWidth-8),y=r.top+r.height/2-tip.offsetHeight/2;tip.style.left=x+'px';tip.style.top=y+'px';}
function hide(){tip.style.display='none';}
document.querySelectorAll('.bar').forEach(function(b){b.addEventListener('pointerenter',show);b.addEventListener('focus',show);b.addEventListener('pointerleave',hide);b.addEventListener('blur',hide);});
addEventListener('scroll',hide,{passive:true});})();`;

writeFileSync(join(docs, 'compare.html'), head(`纵向对比 · ${SITE_TITLE}`, COMPARE_CSS)
  + topBar('纵向对比', 'compare')
  + `<p class="lead">把 10 种模式放在一起比：先看同一任务的实测成本，再看定性评估，最后按场景选。点模式名可以跳到它的图。</p>`
  + `<h2 id="cost">实测成本</h2><p class="sub">${esc(measured.date)}，${esc(measured.platform)}，同一任务各跑 ${measured.runs} 次。只跑一次，看量级，不看小数点。</p>`
  + `<div class="charts">${barChart('secs', '耗时（秒）', '墙钟时间，越短越好')}${barChart('tokens', 'Token 消耗', '×N 是相对单 Agent 基线的倍数，越少越好')}</div>`
  + `<h2 id="matrix">定性评估</h2><p class="sub">作者的定性判断，不是测量结果。1–5 个点，<b>点越多越好</b>（"省钱"点多 = 成本低，"易搭建"点多 = 实现简单）。表格可横向滚动。</p>`
  + matrix
  + `<h2 id="choose">按场景选</h2><p class="sub">每种情况下最先考虑的模式；实际可以组合，比如在 MA-04 的每个子任务里套一个 MA-05。</p>`
  + scen
  + `<h2 id="pros-cons">优劣速查</h2><p class="sub">每种模式的完整优劣、适用场景和代表工具，在它自己的页面里。</p>`
  + pcg
  + `<div id="tip" role="tooltip"><b></b><span></span></div>`
  + tail(TIP_JS));

console.log(JSON.stringify({ ok: true, pages, index: true, compare: true }));
