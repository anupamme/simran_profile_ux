// Builds the generated pages:
//   content/work/<slug>.md   → work/<slug>/index.html     (case studies, templates/case-study.html)
//   content/beyond/<slug>.md → beyond/<slug>/index.html   (Beyond research projects, templates/project.html)
//   content/beyond/*.md      → beyond/index.html          (the Beyond page, templates/beyond-index.html)
// Usage: npm run build   (see README "Editing a case study" for the Markdown format)
'use strict';

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const ROOT = __dirname;
const template = (name) => fs.readFileSync(path.join(ROOT, 'templates', name), 'utf8');

const WORK_REQUIRED = ['order', 'title', 'page_title', 'short_name', 'description', 'eyebrow', 'lede', 'meta', 'types'];
const BEYOND_REQUIRED = ['order', 'group', 'title', 'short_name', 'description'];

let currentFile = '';
function fail(msg) {
  console.error(`\n✗ ${currentFile}: ${msg}\n`);
  process.exit(1);
}

const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// [TODO] and [TODO: note] → highlighted chip (hidden site-wide by one line in css/site.css)
const todos = (s) => s.replace(/\[TODO(?::\s*([^\]]*))?\]/g,
  (_, note) => `<span class="todo">TODO${note ? ': ' + note : ''}</span>`);

// Where bare image names resolve for the page being built: images/work/ for case studies,
// images/beyond/<slug>/ for Beyond projects. The file must exist.
let imageBase = { dir: 'images/work', url: '../../images/work' };
function imageSrc(src) {
  if (/^(https?:)?\/\//.test(src) || src.startsWith('../')) return src;
  if (!fs.existsSync(path.join(ROOT, imageBase.dir, src))) fail(`image not found: ${imageBase.dir}/${src}`);
  return `${imageBase.url}/${src}`;
}

// marked hands the renderer alt/title text that is already escaped
const unescapeHtml = (s) => String(s)
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

// Images render as figures with the Markdown title as caption; consecutive ones form a gallery.
marked.use({
  renderer: {
    image(href, title, text) {
      const alt = escapeHtml(unescapeHtml(text));
      return `<figure><img src="${escapeHtml(imageSrc(href))}" alt="${alt}" loading="lazy">` +
        (title ? `<figcaption>${escapeHtml(unescapeHtml(title))}</figcaption>` : '') + '</figure>';
    },
  },
});

const inline = (s) => marked.parseInline(todos(String(s))).trim();

function block(md) {
  return marked.parse(todos(md))
    // > quote → highlighted insight
    .replace(/<blockquote>\s*<p>([\s\S]*?)<\/p>\s*<\/blockquote>/g, '<p class="insight">$1</p>')
    // a paragraph holding only images → 2-up gallery
    .replace(/<p>((?:<figure>[\s\S]*?<\/figure>\s*)+)<\/p>/g, '<div class="gallery">$1</div>')
    .replace(/<\/div>\s*<div class="gallery">/g, '')
    .trim();
}

const chips = (items, cls = 'chip') =>
  `<ul class="chips">${items.map((t) => `<li class="${cls}">${inline(t)}</li>`).join('')}</ul>`;

const indent = (html, n) => html.split('\n').map((l) => (l ? ' '.repeat(n) + l : l)).join('\n');

function fillTemplate(tpl, fill) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (m, key) => {
    if (!(key in fill)) fail(`template placeholder {{${key}}} has no value`);
    return fill[key];
  });
}

function writePage(outDir, html) {
  fs.mkdirSync(path.join(ROOT, outDir), { recursive: true });
  fs.writeFileSync(path.join(ROOT, outDir, 'index.html'), html);
  console.log(`✓ ${outDir}/index.html`);
}

function renderMeta(d) {
  const rows = d.meta.map((m) => {
    if (!m || !m.label || m.value === undefined) fail('each meta entry needs a label and a value');
    return { label: m.label, html: inline(m.value) };
  });
  rows.splice(1, 0, { label: 'Type', html: chips(d.types, 'chip chip-type') });
  return rows.map((r) => `<div><dt>${escapeHtml(r.label)}</dt><dd>${r.html}</dd></div>`)
    .map((l) => ' '.repeat(8) + l).join('\n');
}

// `images:` list (older pages may still use a single `hero_image:`)
function heroImages(d) {
  const list = d.images ? [].concat(d.images) : d.hero_image ? [d.hero_image] : [];
  list.forEach((img, i) => {
    if (!img || !img.src || !img.alt) fail(`images entry ${i + 1} needs src and alt`);
  });
  return list;
}

const figcaption = (img) => (img.caption ? `<figcaption>${inline(img.caption)}</figcaption>` : '');

// one image → full-width figure; several → carousel (js/carousel.js adds the arrows and dots)
function renderImages(list) {
  if (list.length === 1) {
    const img = list[0];
    return `<figure class="cs-figure">
  <img src="${escapeHtml(imageSrc(img.src))}" alt="${escapeHtml(img.alt)}">
${img.caption ? `  ${figcaption(img)}\n` : ''}</figure>`;
  }
  const slides = list.map((img, i) =>
    `    <figure class="carousel-slide" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${list.length}">` +
    `<img src="${escapeHtml(imageSrc(img.src))}" alt="${escapeHtml(img.alt)}"${i ? ' loading="lazy"' : ''}>${figcaption(img)}</figure>`);
  return `<div class="carousel cs-figure" aria-roledescription="carousel" aria-label="Project images">
  <div class="carousel-track" tabindex="0">
${slides.join('\n')}
  </div>
</div>`;
}

// link previews use the first image, when it lives in this page's image folder
function ogImage(d) {
  const first = heroImages(d)[0];
  if (!first || /^(https?:)?\/\/|^\.\.\//.test(first.src)) return '';
  return `  <meta property="og:image" content="https://simranchopra.com/${imageBase.dir}/${escapeHtml(first.src)}">\n`;
}

// Reads every .md in content/<name>/, checks required fields, drops drafts (unless --drafts),
// and returns the pages sorted by `order`.
const INCLUDE_DRAFTS = process.argv.includes('--drafts');
function loadCollection(name, required) {
  const dir = path.join(ROOT, 'content', name);
  return fs.readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => {
    currentFile = `content/${name}/${f}`;
    let parsed;
    try {
      parsed = matter(fs.readFileSync(path.join(dir, f), 'utf8'));
    } catch (e) {
      // the YAML buffer starts with the newline after the opening ---, so its 0-based line + 1 is the file line
      const line = e.mark ? ` on line ${e.mark.line + 1}` : '';
      fail(`front matter isn't valid YAML${line}: ${e.reason || e.message}. ` +
        'Wrap a value in "quotes" if it contains a colon or starts with [ or *.');
    }
    const { data, content } = parsed;
    for (const k of required) if (data[k] === undefined || data[k] === '') fail(`missing front-matter field "${k}"`);
    return { file: currentFile, slug: path.basename(f, '.md'), data, body: content };
  }).filter((p) => {
    if (!p.data.draft || INCLUDE_DRAFTS) return true;
    // drop any page left over from an earlier --drafts build
    fs.rmSync(path.join(ROOT, name, p.slug), { recursive: true, force: true });
    console.log(`– skipped draft ${p.file}`);
    return false;
  }).sort((a, b) => a.data.order - b.data.order);
}

// Previous/next links; the first page links back to the collection's index instead.
function renderPager(pages, i, back, nextLabel) {
  const prev = pages[i - 1];
  const next = pages[(i + 1) % pages.length];
  const left = prev
    ? `<a href="../${prev.slug}/"><small>Previous</small><span>← ${escapeHtml(prev.data.short_name)}</span></a>`
    : `<a href="${back.href}"><small>Back</small><span>${back.label}</span></a>`;
  const right = `<a href="../${next.slug}/"><small>${i === pages.length - 1 ? 'Back to the start' : nextLabel}</small>` +
    `<span>${escapeHtml(next.data.short_name)} →</span></a>`;
  return `      ${left}\n      ${right}`;
}

// ---- case studies ----

function renderHero(d) {
  const parts = [];
  if (d.hero_quote) {
    // one quote, or a list of two shown side by side
    const quotes = [].concat(d.hero_quote);
    if (quotes.length > 2) fail('hero_quote takes one quote or a list of two');
    const cls = quotes.length === 2 ? 'cs-typo cs-typo-pair' : 'cs-typo';
    parts.push(`<div class="${cls}">${quotes.map((q) => `<p>${inline(q)}</p>`).join('')}</div>`);
  }
  const images = heroImages(d);
  if (images.length) parts.push(renderImages(images));
  if (!parts.length) fail('add images, hero_quote, or both');
  return indent(parts.join('\n'), 6);
}

function renderSections(d, body) {
  const parts = body.split(/^## +/m);
  if (parts[0].trim()) fail('text before the first "## " heading would be lost; move it under a heading');
  let methodsUsed = false;
  const sections = parts.slice(1).map((part) => {
    const nl = part.indexOf('\n');
    const heading = (nl === -1 ? part : part.slice(0, nl)).trim();
    let content = block(nl === -1 ? '' : part.slice(nl + 1));
    if (/^methods$/i.test(heading) && d.methods) {
      content = chips(d.methods) + (content ? '\n' + content : '');
      methodsUsed = true;
    }
    return section(heading, content);
  });
  if (d.methods && !methodsUsed) fail('front matter has "methods" but the body has no "## Methods" heading');
  return indent(sections.join('\n\n'), 4);
}

function section(heading, content) {
  return `<section class="cs-section">
  <h2>${escapeHtml(heading)}</h2>
  <div class="content">
${indent(content, 4)}
  </div>
</section>`;
}

function buildWork() {
  const tpl = template('case-study.html');
  const pages = loadCollection('work', WORK_REQUIRED);
  pages.forEach((p, i) => {
    currentFile = p.file;
    imageBase = { dir: 'images/work', url: '../../images/work' };
    const d = p.data;
    writePage(`work/${p.slug}`, fillTemplate(tpl, {
      slug: p.slug,
      page_title: escapeHtml(d.page_title),
      description: escapeHtml(d.description),
      og_title: escapeHtml(`${d.short_name} | Simran Chopra, UX Researcher`),
      og_description: escapeHtml(d.og_description || d.description),
      og_image: ogImage(d),
      eyebrow: inline(d.eyebrow),
      title: inline(d.title),
      lede: inline(d.lede),
      meta: renderMeta(d),
      hero: renderHero(d),
      sections: renderSections(d, p.body),
      pager: renderPager(pages, i, { href: '../../#work', label: 'All case studies' }, 'Next case study'),
    }));
  });
  return pages.length;
}

// ---- Beyond research projects ----

const list = (items) => `<ul>\n${items.map((t) => `  <li>${inline(t)}</li>`).join('\n')}\n</ul>`;

function renderMedia(d) {
  const parts = [];
  const images = heroImages(d);
  if (images.length) parts.push(renderImages(images));
  for (const url of [].concat(d.videos || [])) {
    parts.push(`<div class="video-embed cs-figure"><iframe src="${escapeHtml(url)}" title="${escapeHtml(d.short_name)} video" ` +
      'loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen></iframe></div>');
  }
  for (const url of [].concat(d.audio || [])) {
    parts.push(`<div class="audio-embed cs-figure"><iframe src="${escapeHtml(url)}" title="${escapeHtml(d.short_name)} audio" ` +
      'loading="lazy" allow="autoplay"></iframe></div>');
  }
  return indent(parts.join('\n'), 6);
}

function renderDetails(d) {
  const out = [];
  if (d.exhibited) out.push(section('Exhibited', list(d.exhibited)));
  if (d.papers) out.push(section('Papers', list(d.papers)));
  if (d.awards) out.push(section('Awards', list(d.awards)));
  if (d.links) {
    d.links.forEach((l, i) => { if (!l || !l.label || !l.url) fail(`links entry ${i + 1} needs label and url`); });
    out.push(section('Links', list(d.links.map((l) => `[${l.label}](${l.url})`))));
  }
  return out.length ? '\n' + indent(out.join('\n\n'), 4) : '';
}

const truncate = (s, n) => (s.length <= n ? s : s.slice(0, n).replace(/\s+\S*$/, '') + '…');

function renderBeyondCards(pages) {
  const groups = [];
  for (const p of pages) {
    let g = groups.find((x) => x.name === p.data.group);
    if (!g) groups.push((g = { name: p.data.group, pages: [] }));
    g.pages.push(p);
  }
  return groups.map((g) => {
    const cards = g.pages.map((p) => {
      const d = p.data;
      const first = heroImages(d)[0];
      const media = first
        ? `<div class="card-media"><img src="../images/beyond/${p.slug}/${escapeHtml(first.src)}" alt="${escapeHtml(first.alt)}" loading="lazy"></div>`
        : `<div class="card-media typo"><span>${escapeHtml(d.short_name)}</span></div>`;
      const summary = d.summary || truncate(d.description.replace(/…$/, ''), 120);
      return `        <a class="card" href="${p.slug}/">
          ${media}
          <div class="card-body"><h3>${inline(d.title)}</h3><p>${inline(summary)}</p></div>
        </a>`;
    }).join('\n');
    return `    <section class="block" style="padding-top:0">
      <div class="section-head"><h2>${escapeHtml(g.name)}</h2></div>
      <div class="mini-cards">
${cards}
      </div>
    </section>`;
  }).join('\n\n');
}

function buildBeyond() {
  const tpl = template('project.html');
  const pages = loadCollection('beyond', BEYOND_REQUIRED);
  pages.forEach((p, i) => {
    currentFile = p.file;
    imageBase = { dir: `images/beyond/${p.slug}`, url: `../../images/beyond/${p.slug}` };
    const d = p.data;
    writePage(`beyond/${p.slug}`, fillTemplate(tpl, {
      slug: p.slug,
      page_title: escapeHtml(d.short_name),
      description: escapeHtml(d.description),
      og_title: escapeHtml(`${d.short_name} | Simran Chopra`),
      og_image: ogImage(d),
      group: escapeHtml(d.group),
      title: inline(d.title),
      media: renderMedia(d),
      body: indent(block(p.body), 8),
      details: renderDetails(d),
      pager: renderPager(pages, i, { href: '../', label: 'Beyond research' }, 'Next project'),
    }));
  });
  currentFile = 'templates/beyond-index.html';
  writePage('beyond', fillTemplate(template('beyond-index.html'), { projects: renderBeyondCards(pages) }));
  return pages.length;
}

const works = buildWork();
const projects = buildBeyond();
console.log(`Built ${works} case studies, ${projects} Beyond research projects and the Beyond page.`);
