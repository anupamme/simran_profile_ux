# simranchopra.com — UX Researcher portfolio

A static multi-page site with no framework and no build step. Every page is a real URL (e.g. `/work/samsung/`), so links preview properly when shared and search engines can index the content. It replaces the AngularJS hash-routed site in `../simran_profile/`, which is left untouched.

## Structure

| Path | Page |
|---|---|
| `index.html` | Home: hero, proof bar, case-study cards, "What I bring", beyond-research teaser |
| `work/<slug>/index.html` | Case studies, in this order: `samsung`, `inito`, `gates-records-for-life`, `cookup`, `exchangeopoly`, `mosaic`, `soil-stories` |
| `about/` | About, written for an industry audience; theory appears here only |
| `cv/` | Industry CV (content from `SC_CV.pdf`), print-ready, plus `cv/simran-chopra-cv.pdf` |
| `beyond/` | Poems, community work, earlier art and food projects |
| `css/site.css` | The only stylesheet. Colour tokens are at the top; dark mode is automatic |
| `js/nav.js` | Mobile menu toggle, the only script |
| `404.html`, `CNAME` | For GitHub Pages |

Every case study uses the same section order: **The question → My role → Methods → Who I worked with → Key insights → Impact → Artifacts**. To add a case study, copy a folder in `work/` and update the "Previous/Next" links at the bottom of the neighbouring pages and the card on the home page.

## Run locally

```sh
# from the parent folder (/Users/admin/code/sim)
python3 -m http.server -d simran_profile_ux 8000
# or from inside simran_profile_ux/
python3 -m http.server 8000
# then open http://localhost:8000
```

## TODOs before launch

Anything Simran still needs to supply or verify is marked with `<span class="todo">TODO…</span>`, which shows as a yellow chip. To list them all:

```sh
grep -rno 'TODO[^<"]*' --include='*.html' simran_profile_ux
```

The main gaps:
- **Key insights** on every case study: one plain-language finding each.
- **Soil Stories** isn't on the CV. Confirm which project it belongs to, the C&C 2025 paper, role, methods and one image.
- **Team sizes and participant numbers** (Inito, CookUp).
- **CookUp** Beta numbers; **Inito** onboarding baseline, if known.
- **Images** for Exchangeopoly and Soil Stories.

Before going live, either remove the markers or uncomment the `.todo { display: none }` line at the top of `css/site.css`.

## Exporting the CV PDF

Edit `cv/index.html`, then regenerate the PDF:

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --no-pdf-header-footer \
  --print-to-pdf=simran_profile_ux/cv/simran-chopra-cv.pdf http://localhost:8000/cv/
```

(Or open `/cv/` in a browser → Print → Save as PDF, with A4 and no margins.) The print styles hide the site chrome and fit the CV on one A4 page.

## Images

These are a subset of `../simran_profile/images/`, resized to at most 1600px. To add an image, put it in `images/work/` or `images/beyond/` and resize it with `sips -Z 1600 file.jpg`.

## Deploy

Push the contents of this folder to the GitHub Pages repo (or point Pages at it). The `CNAME` keeps `simranchopra.com`.
