# simranchopra.com: UX Researcher portfolio

A static multi-page site. Every page is a real URL (e.g. `/work/samsung/`), so links preview properly when shared and search engines can index the content.

Case studies are written in **Markdown** and built into HTML by a small Node script. Every other page is plain hand-written HTML. GitHub Actions runs the build on every push and deploys to GitHub Pages at simranchopra.com.

## Structure

| Path | What it is |
|---|---|
| `content/work/<slug>.md` | **Case-study content (edit these).** One file per case study |
| `content/beyond/<slug>.md` | **Beyond research projects (edit these).** One file per project |
| `templates/case-study.html`, `templates/project.html` | The page shells case studies and Beyond projects are built into |
| `templates/beyond-index.html` | The Beyond page. The build fills in its project cards |
| `build.js` | Builds `work/<slug>/`, `beyond/<slug>/` and `beyond/index.html` (`npm run build`) |
| `work/`, `beyond/` output | Generated and gitignored, so don't edit it |
| `index.html` | Home: hero, case-study cards, "What I bring", beyond research |
| `about/`, `cv/` | Hand-written HTML pages. `cv/` also has `simran-chopra-cv.pdf` |
| `images/work/`, `images/beyond/<slug>/` | Images for case studies and for each Beyond project |
| `css/site.css` | The only stylesheet. Colour tokens are at the top; dark mode is automatic |
| `js/nav.js`, `js/carousel.js` | Mobile menu toggle; image carousel controls |
| `.github/workflows/pages.yml` | On every push to `main`, builds and deploys the site |
| `404.html`, `CNAME` | For GitHub Pages |

## Editing a case study

1. Open `content/work/<slug>.md` and edit the text. You can do this directly in GitHub's web editor.
2. Commit and push to `main`. The site rebuilds and goes live in about a minute (check the repo's **Actions** tab).

To preview locally first:

```sh
cd simran_profile_ux
npm install          # first time only
npm run build        # regenerates work/*/index.html
python3 -m http.server 8000   # then open http://localhost:8000/work/inito/
```

If something is wrong, for example a missing image or a required field, the build stops and names the file and the problem.

### The Markdown format

Each file has a **front-matter** block between `---` lines for the page header, then the body sections:

```md
---
order: 2                          # position in the Previous/Next chain
page_title: Inito Fertility Monitor     # browser tab: "… | Simran Chopra"
short_name: Inito Fertility Monitor     # used in link previews and Previous/Next links
description: "Case study: …"            # search and link-preview description
og_description: …                       # optional, a different link-preview line
eyebrow: Inito Health Inc., via Samplytics · 2014–17   # small line above the title
title: Redesigning onboarding … to 89% task completion
lede: End-to-end research for …
types: [Evaluative]               # the "Type" chips
meta:                             # the row of facts under the lede
  - label: My role
    value: Design Research Consultant …
  - label: Result
    value: "**89%** task completion on the redesigned onboarding"
hero_quote:                       # one quote, or a list of two shown side by side
  - Can someone set up a medical diagnostics device at home …?
  - Where exactly does onboarding break down …?
images:                           # optional: 1 image = full-width photo, 2+ = carousel
  - src: rfl-3.jpg                # file in images/work/
    alt: Describe the photo for screen readers
    caption: Shown under the photo   # optional
  - src: rfl-1.jpg
    alt: Second photo
# A page needs hero_quote, images, or both (the quote box shows above the images).
methods: [In-home usability testing, Task analysis]   # chips in the Methods section
---

## The question
Plain Markdown paragraphs, **bold**, [links](https://example.com) and lists all work.

## Key insights
> A line starting with ">" becomes the large highlighted insight.

## Artifacts
![Alt text describing the photo](rfl-1.jpg "Caption shown under the photo")
![Second photo, on the very next line, sits beside the first](rfl-b1.jpg "Caption")
```

Rules:
- **Sections:** every `## Heading` becomes a section, in file order. You can rename, reorder or add headings freely; MoSaIC uses `## Stakeholders & influence`.
- **Methods:** the `methods` chips appear at the top of the `## Methods` section, and any text under that heading follows them.
- **TODOs:** `[TODO]` or `[TODO: note]` anywhere becomes a yellow chip.
- **Images:** a bare file name like `rfl-1.jpg` means `images/work/rfl-1.jpg`. Images on consecutive lines form a two-across gallery, and the quoted text becomes the caption.
- **Quoting:** wrap a YAML value in quotes if it contains a colon (`:`) or starts with `[` or `*`, e.g. `value: "C&C 2025 [TODO: paper title]"`.

### Adding a new case study

1. Copy an existing `.md` in `content/work/` to `content/work/<new-slug>.md` and give it an `order`. Previous/Next links update automatically.
2. While you write it, keep `draft: true` at the top of the front matter. Draft pages aren't published or linked, so pushing them is safe. Preview drafts locally with `npm run build:drafts`. `content/work/exchangeopoly-2.md` is a draft copy of Exchangeopoly, ready to rewrite.
3. Add any images to `images/work/`, resized with `sips -Z 1600 file.jpg`.
4. When it's ready, delete the `draft: true` line and add its card to the "Selected case studies" grid in `index.html`. The cards are hand-written.

## Beyond research projects

Each project on the Beyond page is a file in `content/beyond/` (imported from the old site), and each one gets its own page at `/beyond/<slug>/`. The Beyond page's cards are generated, grouped by `group`, in `order`. Front matter:

```yaml
order: 1                                  # position on the Beyond page and in Previous/Next
group: "Food & public engagement"         # the heading it's listed under
title: "Appetite: A Board Game on Food, with Food"
short_name: "Appetite"                    # used in Previous/Next and the browser tab
description: "…"                          # search and link-preview text
summary: "…"                              # optional, the card text (otherwise a shortened description)
images:                                   # optional, files in images/beyond/<slug>/; 2+ become a carousel
  - src: 1.jpg
    alt: Describe the photo
videos: ["https://player.vimeo.com/video/135540900"]   # optional Vimeo embeds
audio: ["https://w.soundcloud.com/player/?url=…"]      # optional SoundCloud embeds
exhibited: ["…"]                          # optional lists, shown as sections
papers: ["…"]
awards: ["…"]
links:                                    # optional
  - label: "Report (Scribd)"
    url: "https://www.scribd.com/…"
```

The body below the front matter is the project description in plain Markdown. To add a project, copy a file, give it a new `order` and put its images in `images/beyond/<slug>/`. It appears on the Beyond page automatically.

## TODOs before launch

Anything Simran still needs to supply or verify is marked `[TODO…]` in the Markdown, or `<span class="todo">` in the HTML pages, and shows as a yellow chip. To list them:

```sh
grep -rn 'TODO' content/work/*.md
grep -rno 'class="todo">[^<]*' index.html about cv beyond
```

The main gaps:
- **Key insights** on every case study: one plain-language finding each.
- **Soil Stories** isn't on the CV. Confirm which project it belongs to, the C&C 2025 paper, role, methods and one image.
- **Team size and participant numbers** (CookUp).
- **CookUp** Beta numbers.
- **Images** for Exchangeopoly and Soil Stories.

To hide every chip without removing them, uncomment the `.todo { display: none }` line at the top of `css/site.css`.

## Exporting the CV PDF

Edit `cv/index.html`, serve locally, then regenerate the PDF:

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --no-pdf-header-footer \
  --print-to-pdf=cv/simran-chopra-cv.pdf http://localhost:8000/cv/
```

Or open `/cv/` in a browser, choose Print, then Save as PDF. The print styles hide the site chrome and lay the CV out on A4.

## Deploy

Pushing to `main` deploys automatically through `.github/workflows/pages.yml`. The repo's Pages source is set to **GitHub Actions**, and the custom domain `simranchopra.com` is set in the repo's Pages settings.
