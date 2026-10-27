# Code map (bpm-v139)

Where things live, so a change starts in the right file. Edit only files under `src/`, then run `node tools/build.js` and commit the built files with them.
`node tools/build.js --check` (also run by `node test/v135-split.js`) fails when a built file is out of date or was edited by hand.

## What the page loads (index.html)

| Built file | Made from | Notes |
|---|---|---|
| `app.css` | `src/css/*.css` | every style sheet, theme first |
| `vendor/*.js` | (third-party) | PDF reading and PDF writing libraries |
| `dlg.js` | `src/boot/*.js` | in-app alert / confirm / prompt; loads before app.js |
| `app.js` | `src/app/*.js` | the core, strict mode |
| `ui.js` | `src/ui/*.js` | feature files that build on the core (classic scripts, not strict, as before) |
| `detect.js` | (hand-edited, not built) | Detect worker: symbol matching runs off the main thread |
| `sw.js` | (hand-edited) | offline cache; `const C='bpm-vNNN'` is the version, raise it on every release |

Files in each `src` folder are joined in file-name order; the number in front sets the order. Order matters: later files wrap or replace functions from earlier ones while the page loads.

## src/app (core, app.js)

| File | What it holds |
|---|---|
| 01-core.js | device types, colors, checklists, IndexedDB storage, app state (`plan`, `pins`, `page`, `view`, `walk`, `ghosts`), plans |
| 02-draw.js | drawing the plan and pins, hit testing, pointer input, undo/redo |
| 03-card.js | pin card (`openPin`, with the Last visit row), photos (`addMedia` stores smaller photos), Pins list, deficiencies, export, projects, start-up, report |
| 04-detect.js | Detect (`runDetect`), suggestions bar (`renderGhostBar`), layers, multi-select, copy/paste, toast |
| 05-walk.js | walk mode, walk order (`nearestFrom`: nearest first or address order), voice commands, learned rules |
| 06-files.js | .bpm project file (see FORMAT.md), plan export, code references, job info, NFPA documents |
| 07-tools.js | measure, spellcheck, rotate, thumbnails, checklist templates, inline text, page cache |
| 08-models.js | device model catalog, install sheets, QR scan |

## src/ui (features, ui.js)

| File | Feature |
|---|---|
| 00-helpers.js | shared DOM helpers `by(id)`, `ce(tag, className, html)`, `ceA(tag, props, html)` |
| 10-field-ux.js | compact walk bar (`renderWalk`, `startWalk`/`exitWalk` wrappers), quick place, bulk pass, export menu |
| 11-pen-tool.js | pen / curve tool, node editing, extra shapes |
| 12-split-merge.js | two-tech split and merge by file (`mergePins` is pure) |
| 13-pin-transform.js | rotate / resize handles for the selected pin |
| 14-model-picker.js | pin card Model picker |
| 15-toolbar-wheels.js | grouped toolbar, wheel pickers (`wheelOpen`, `wheelAnchor`), Customize (accent, theme, density) |
| 16-guides.js | offline Guides panel |
| 17-symbol-legend.js | master symbol legend, legend scan on plan open (legend banner) |
| 18-text-tags.js | device text tags beside detected symbols (type only, never moves pins) |
| 19-pins-panel.js, 20-pins-header.js | Pins panel layout and header (Pins / Deficiencies, search, filters) |
| 21-stamp-tool.js | Stamp tool |
| 22-page-kind.js | page kind for Detect (only main floor plan pages get pins) |
| 23-type-layers.js | per-type show / hide |
| 24-top-bar.js | top bar (breadcrumb and buttons) |
| 25-layers-panel.js | docked Layers panel |
| 26-pin-delete.js | floating Delete beside the selected pin |
| 27-type-colors.js | per-type colors |
| 28-side-panels.js | layout manager for every side panel and the Pages strip |
| 29-deficiency-list.js | deficiency list and photo viewer |
| 30-task-bar.js | big task bar (Menu, Detect, Sheets, Place, Walk test, Draw, More) |
| 31-backup-reminder.js | Menu / More extra-item registry (`window.menuExtra`, `window.moreExtra`, `V135`), storage protection, daily backup reminder |
| 32-visit-times.js | Inspection and Testing Record start / finish times |
| 33-next-inspection.js | Start next inspection, Save backup and start, Last visit record (`prevTxt`, `lastVisitPhotos`) |
| 34-photos-sheets.js | smaller saved photos (`shrinkPhoto`), this job's install sheets offline |
| 35-screen-zoom.js | app-screen pinch zoom, Reset screen zoom |
| 36-detect-one-tap.js | one-tap Detect, `detectSettings` (Detect types and pages) |
| 37-walk-flow.js | Walk dialog ticks and order, quick fail reasons, Pages strip during a walk, legend banner folding (`foldLegend`) |
| 38-pins-open-card.js | Open card button on Pins list rows |
| 39-menu-list.js | Menu as a grouped list (`menuListClose`) |
| 40-empty-screen.js | empty first screen buttons |

Functions changed by more than one file (read all of them before changing one): `change` / `changeMulti` (11, 12, 31), `startWalk` / `exitWalk` / `renderWalk` / `walkPick` (10, 37), `loadProject` (31, 32), `renderList` (38), `wheelOpen` / `wheelAnchor` (15, 39).

## src/css (app.css)

| File | What it styles |
|---|---|
| 00-theme.css | theme variables (`--acc`, `--sf`, `--sf2`, `--tx`, `--mu2`, `--shd`, light theme values) and the gray palette (`--gray-0a` … `--gray-f4`) |
| 10-base.css | layout, dialogs, pin card, Pins panel, walk bar, Detect (layered by version, oldest first) |
| 20-toolbar.css | toolbar, wheels, top bar, side panels, task bar (layered by version) |
| 30-guides.css | Guides and symbol legend |
| 50-backup-merge.css | backup reminder bar, merge dialog |
| 51-status-readings.css | corrected status, measured readings, visit times, hands-free voice chip |
| 52-screen-zoom.css | page zoom setting |
| 53-last-visit.css | Last visit row and photos |
| 60-menu-list.css | Menu list |
| 61-walk-flow.css | quick fail reasons, no Delete during a walk, walk order, side panel during walk start / exit |
| 62-pins-open-card.css | Open card button |
| 63-empty-screen.css | empty first screen |

The light theme is `body.light` (set from Customize > Theme or the system setting). Most light-theme rules sit beside the dark rule they change. Later rules win over earlier ones of the same strength, so keep the file order.

## Tests (repo)

`node test/v126-rules.js`, `node test/v127-detect.js`, `node test/v128-pagekind.js`, `node test/v135-split.js`. Screen suites live in the separate test kit (`tools/test-ui.sh` there runs them in parallel).
