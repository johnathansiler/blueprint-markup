# app.js modules (bpm-v135)

`app.js` is built from these files, joined in the order listed in `ORDER`:

| File | What it holds |
|---|---|
| 01-core.js | device types, colors, checklists, IndexedDB, app state, plans |
| 02-draw.js | drawing, hit testing, pointer input, undo/redo |
| 03-card.js | pin card, list, deficiencies/counts, export, projects, start-up, photo annotation, report |
| 04-detect.js | Detect suggestions, layers, multi-select, copy/paste, toast |
| 05-walk.js | walk mode, voice commands, learned rules, multi-select tools |
| 06-files.js | project file, plan export, code references, job info, NFPA documents, clearing |
| 07-tools.js | measure, spellcheck, rotate, walk slide, thumbnails, checklist templates, inline text, de-overlap, page cache |
| 08-models.js | device models catalog, install sheets, QR scan |

Edit a module, then run `node tools/build-app.js` and commit both. `node test/v135-split.js` fails if `app.js` was edited directly or not rebuilt.

Why a build and not separate script tags: the modules share globals and call each other while the page loads. Loaded as separate files, the browser can run timers and events between files (seen under load: `tedPos is not defined`, `renderList is not defined`). One built file keeps start-up exactly as before.
