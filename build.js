// Builds the case-study pages: content/work/<slug>.md → work/<slug>/index.html
// Usage: npm run build   (see README "Editing a case study" for the Markdown format)
'use strict';

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const ROOT = __dirname;
const CONTENT_DIR = path.join(ROOT, 'content', 'work');
const IMAGE_DIR = path.join(ROOT, 'images', 'work');
const TEMPLATE = fs.readFileSync(path.join(ROOT, 'templates', 'case-study.html'), 'utf8');
const REQUIRED = ['order', 'title', 'page_title', 'short_name', 'description', 'eyebrow', 'lede', 'meta', 'types'];

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

// Bare image names resolve to images/work/; the file must exist.
function imageSrc(src) {
  if (/^(https?:)?\/\//.test(src) || src.startsWith('../')) return src;
  if (!fs.existsSync(path.join(IMAGE_DIR, src))) fail(`image not found: images/work/${src}`);
  return `../../images/work/${src}`;
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

// link previews use the first image, when it lives in images/work/
function ogImage(d) {
  const first = heroImages(d)[0];
  if (!first || /^(https?:)?\/\/|^\.\.\//.test(first.src)) return '';
  return `  <meta property="og:image" content="https://simranchopra.com/images/work/${escapeHtml(first.src)}">\n`;
}

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
    return `<section class="cs-section">
  <h2>${escapeHtml(heading)}</h2>
  <div class="content">
${indent(content, 4)}
  </div>
</section>`;
  });
  if (d.methods && !methodsUsed) fail('front matter has "methods" but the body has no "## Methods" heading');
  return indent(sections.join('\n\n'), 4);
}

function renderPager(pages, i) {
  const prev = pages[i - 1];
  const next = pages[(i + 1) % pages.length];
  const left = prev
    ? `<a href="../${prev.slug}/"><small>Previous</small><span>← ${escapeHtml(prev.data.short_name)}</span></a>`
    : '<a href="../../#work"><small>Back</small><span>All case studies</span></a>';
  const right = `<a href="../${next.slug}/"><small>${i === pages.length - 1 ? 'Back to the start' : 'Next case study'}</small>` +
    `<span>${escapeHtml(next.data.short_name)} →</span></a>`;
  return `      ${left}\n      ${right}`;
}

// ---- main ----
// `draft: true` pages are only built with --drafts (npm run build:drafts), so they never deploy.
const INCLUDE_DRAFTS = process.argv.includes('--drafts');

const pages = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md')).map((f) => {
  currentFile = `content/work/${f}`;
  let parsed;
  try {
    parsed = matter(fs.readFileSync(path.join(CONTENT_DIR, f), 'utf8'));
  } catch (e) {
    // the YAML buffer starts with the newline after the opening ---, so its 0-based line + 1 is the file line
    const line = e.mark ? ` on line ${e.mark.line + 1}` : '';
    fail(`front matter isn't valid YAML${line}: ${e.reason || e.message}. ` +
      'Wrap a value in "quotes" if it contains a colon or starts with [ or *.');
  }
  const { data, content } = parsed;
  for (const k of REQUIRED) if (data[k] === undefined || data[k] === '') fail(`missing front-matter field "${k}"`);
  return { file: currentFile, slug: path.basename(f, '.md'), data, body: content };
}).filter((p) => {
  if (!p.data.draft || INCLUDE_DRAFTS) return true;
  // drop any page left over from an earlier --drafts build
  fs.rmSync(path.join(ROOT, 'work', p.slug), { recursive: true, force: true });
  console.log(`– skipped draft content/work/${p.slug}.md`);
  return false;
}).sort((a, b) => a.data.order - b.data.order);

pages.forEach((p, i) => {
  currentFile = p.file;
  const d = p.data;
  const fill = {
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
    pager: renderPager(pages, i),
  };
  const html = TEMPLATE.replace(/\{\{(\w+)\}\}/g, (m, key) => {
    if (!(key in fill)) fail(`template placeholder {{${key}}} has no value`);
    return fill[key];
  });
  const outDir = path.join(ROOT, 'work', p.slug);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  console.log(`✓ work/${p.slug}/index.html`);
});
console.log(`Built ${pages.length} case studies.`);
