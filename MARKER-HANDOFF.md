# Marker: handoff to continue where we left off

Written Wed Oct 28, 2026, about 4:45 AM ET (America/New_York, UTC-4) by Grok Bot. It replaces the "Resume here" notes in earlier copies. Older detail (v50–v134 history, architecture notes, the Oct 17 rule list) is in the earlier handoff kept in the private test-data repo and test kit (`handoffs/MARKER-HANDOFF.md`).

> **State at writing:** **bpm-v144 is live** (main `520d739`, PR #22). **bpm-v145 is built and tested on branch `v145-wip`, pushed, not merged** (no PR opened yet). See "Resume here" at the end.

## 1. Project
- **Marker** (internal name "Blueprint Markup", cache prefix `bpm-`) is a static, offline phone app (PWA) for fire alarm plan markup and inspection: open a plan PDF, Detect or add device markers, draw markups, run a walk test, track deficiencies, export reports, split and merge work between two techs, and look up Siemens Desigo parts.
- **Live:** https://johnathansiler.github.io/blueprint-markup/ (GitHub Pages, deploys on every push to `main`).
- **Repos:**
  - `johnathansiler/blueprint-markup`: app code. **Public**, code only.
  - `johnathansiler/marker-testdata`: test data and plans. **Private.**
  - `johnathansiler/Marker-tester`: the test kit (scripts, expected numbers, plans). **Private.**
- **Version** is `const C='bpm-vNNN'` on line 3 of `sw.js`. Raise it on every release. After each release the user must **close and reopen the app**, and every release message says so.
- **Devices:** the user mainly uses an Android phone (test size 412×915). Also a Galaxy Fold: closed 344×882, open 920×1000. Tablets are tested too.

## 2. Standing rules (how to work)
1. **Change exactly what was asked. Fixes only, no redesign.** Pin geometry stays locked (never change pin position, size, rotation, outset or de-overlap).
2. **Finish everything in one build. No leftovers.** If a related bit of wording or behavior is clearly part of the same ask, fix it in the same build instead of asking afterwards. The user called asking about leftovers "scamming". Ship ONE complete build with nothing pending.
3. **Visual or layout changes get a preview first** (screenshots, wait for a yes). Small UI fixes don't.
4. **Plain language** in every message. No internal step names, hashes or jargon in anything the user sees.
5. **Always give an ETA in ET.**
6. **Every button has a full plain-word label** (visible text; aria-label/title at least).
7. **Siemens Desigo parts only** (models, catalogs, trouble codes, install sheets).
8. **Check 3 random plans** with the new test before shipping. **Match tests to the change** (each build adds a kit test that fails on the old build and passes on the new one).

## 3. Product rules (what the app must look like and do)
- **No loops anywhere, and no signatures** (both removed).
- **Never pin gray devices** (existing/gray-ink devices). **Detect pins only main floor plans** (riser, wiring, detail and schedule sheets are skipped).
- **No spinning wheels.** Every picker is a plain list like the Menu. Opacity stays a slider.
- **The Detect pop-up has Cancel at the top.**
- **Theme greys (dark):** background `#222222`, panels `#2e2e2e`, buttons `#3d3d3d`, borders `#555555`, secondary text `#b0b0b0`.
- **Button style A, subtle bevel:** dark theme only, 8px corners.
- **Top row (phone), in this order:** Menu, Previous, Next, Rotate, Undo, Redo, Pages, Layers, Pins. No "Page 2/5" button. Menu is always first. Delete sits inside the pin card.
- **Bottom row:** Detect and Sheets (double width), Marker (formerly "Place"), Walk test, Draw, More. No visible word "Place" anywhere for the Marker button or its list.
- **Pages bar (phone):** Rename and Close are stacked vertically. Page jumping is by tapping a thumbnail, or Previous/Next.
- **Even 4px gaps everywhere.**
- **Stacking (approved v143, all screen sizes):**
  - Everything stacks and **never overlaps**.
  - Menus and lists open **next to their own button**: dropping down from the top bar, stacking up from the bottom bar, and above the Pages bar when it is open.
  - Each one **sizes to its content** and doesn't stretch. Width stays small. Lists shrink and scroll **only when too tall**.
  - Compact lists next to their buttons on Fold open and desktop too.
  - **v145:** opening or closing a bar (the Pages bar) **never closes an open list, the Draw panel or the Width row**. They stay and re-stack into the space.
- Code for stacking: `src/ui/45-stack.js` (placement), `src/ui/15-toolbar-wheels.js` (the list itself, `wheelOpen`), `src/ui/30-task-bar.js` (bottom row, Draw panel).

## 4. Build and ship process
1. **Fresh clone** of `blueprint-markup` into a new folder (e.g. `/workspace/vNNN`), branch `vNNN-wip` from current `main`. Status log `/workspace/vNNN-status.txt`, one line per step with an ET time.
2. Edit **only `src/`** (plus `sw.js` line 3). Run `node tools/build.js`, then `node tools/build.js --check` (must say the built files match `src/`). See `CODEMAP.md` for where things live.
3. Bump `sw.js` to `const C='bpm-vNNN'`.
4. Add a kit test `test/v113/vNNN.py` in the test kit and wire it into `run-all.sh` and `tools/test-ui.sh`. Show it **fails on the old build and passes on the new one**.
5. Gates (below), screenshots to `/workspace/shots/vNNN/`.
6. Check the app repo is still **public, code only** (`gh repo view johnathansiler/blueprint-markup --json visibility`) and the diff has no plan IDs, plan images or test data. **Push the branch normally** (never force).
7. Open the PR and merge it (approval cards when blocked), then confirm live: `curl -s https://johnathansiler.github.io/blueprint-markup/sw.js | grep -o "const C='[^']*'"` shows the new version. Tell the user it's live and to close and reopen the app.

## 5. Tests and gates (test kit)
Run from the kit folder:
- **Quick gate:** `./run-all.sh --quick /workspace/vNNN` (about 4 min). Must show:
  - `golden` 780/783 (3 wrong type, 0 missed, 0 extra, 0 moved)
  - `fl130` 255 pins, 0 phantoms, 0 baseline missed
  - `snapshot` identical to s126 (7 files), v97 pins unchanged
- **Screen suites:** `tools/test-ui.sh -j 5 /workspace/vNNN` (about 12–15 min). 19 suites as of v145: card120, gap119, walkbar, v113ui, v113anim, lists, v111walk, v132, v133, v134, v135, v136, v138, gray134, v142, v143, v143s, v144, v145. Each must be PASS (PASS* = failed under load, passed on its own rerun).
- **One suite:** `python3 test/v113/vNNN.py PORT` against `python3 -m http.server PORT -d /workspace/vNNN`. Ends with `ALLOK` or `FAIL n`.
- **Detect changes only:** also full Detect on the top 3 plans (`./run-all.sh --only top3-detect,detect-timing`).
- Ports: run-all uses 8100/8102 by default; `MARKER_PORT` / `MARKER_REF_PORT` change them. Don't start two runs on the same ports.

## 6. Security rules
- **Plans must never be public.** No plan PDFs, plan IDs, plan images or plan-derived screenshots in the public app repo. User screenshots and plan shots stay on the box.
- **Never print or store the test-data token.** Don't echo it, log it or write it to a file.
- **Verify the app repo's visibility before every push.**
- **No force pushes** without the user's explicit approval. Merges and pushes go through approval cards when blocked.
- **Never push from old pre-purge clones** (folders from before v137, the scrub and dry-run folders). Always build from a fresh clone.
- **Test kit commits are local and unpushed, pending the user's approval:** everything through `5ee598c` (v144 suite), plus `0236407` (v145 suite).

## 7. Release history v135–v145
| Ver | PR / merge | What changed |
|---|---|---|
| v135 | #13 `85ed943` | Daily backup reminder and storage protection; merge brings back edits field by field (newest wins); separate Smoke and Heat model lists; firefighter phone jack type; screen pinch zoom with Reset screen zoom; app code split into `src/app` modules. |
| v136 | #14 `8cf0d7e` | Signatures removed; spoken pass/fail asks to confirm; Start next inspection saves all-or-nothing with a Last visit record; re-merging a file doesn't duplicate; plan-derived images removed from the public code. |
| v137 | #15 `359fadb` | App chrome from blue to neutral greys, grey accent, grey legend banner border. |
| v138 | #16 `1227b23` | One-tap Detect (remembers types and pages); quick fail reasons per device type; Menu rows with icons and keyboard; legend banner folds into More during Detect, walk or pin card. |
| v139 | #17 `b84c1a7` | One build for all hand-edited code (`src/` to `dlg.js`, `app.js`, `ui.js`, `app.css`), `CODEMAP.md`. No behavior change. |
| v140 | #18 `e6f36f1` | Fixes: Pins list Open card after a filter, legend scan reliability, notices no longer hidden, Fold-open Pins rows wrap. |
| v141 | #19 `4eba284` | Every wheel replaced by a Menu-style plain list; Cancel at the top of the Detect pop-up; dark theme lighter; stale-cache fix (app heals itself after an update). |
| v142 | #20 `a4a28ef` | Address sweep (Menu › Plan), Finish inspection (Menu › Job), button style A bevel (dark only). |
| v143 | #21 `8a71cc4` | Even 4px phone spacing; Pages Rename/Close stacked; new top row; Place renamed Marker; Delete in the pin card; stacking layout (`45-stack.js`); Reset screen zoom fixed in Chromium. |
| v144 | #22 `520d739` | Remaining "Place" wording now says Marker (list title, empty-plan hint, no-pins alerts). |
| v145 | branch `v145-wip`, not merged | Closing or opening the Pages bar no longer closes an open Marker, More or Draw list, the Draw panel or the Width row; the list re-stacks into the space. |

## 8. Open items
- **v145:** open the PR from `v145-wip`, merge, confirm live `bpm-v145`, tell the user (close and reopen the app).
- **Test kit commits** through `5ee598c` and `0236407` are unpushed; push only with the user's approval.
- **Not yet offered:** adding v135-onward items to the checklist Page.
- **Older backlog** (from the v121 review and the Detect backlog in the earlier handoff) may be partly done; check against the current app before working on any of it, and only when the user asks.

## 9. Resume here (Oct 28, 2026, about 4:45 AM ET)
1. Read this file, then the latest status log (`/workspace/v145-status.txt`) on the box.
2. Check what's live: `curl -s https://johnathansiler.github.io/blueprint-markup/sw.js | grep -o "const C='[^']*'"` (bpm-v144 until v145 is merged).
3. If v145 is not merged yet: open the PR from `v145-wip` into `main`, merge it, confirm the live `sw.js` says `bpm-v145`, and tell the user it's live (close and reopen the app).
4. For the next request: fresh clone, branch `vNNN-wip` (next is **v146**), follow §4 and §5, give an ETA in ET, and finish everything in one build.
