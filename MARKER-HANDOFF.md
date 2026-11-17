# Marker: handoff to continue where we left off

Written Wed Oct 28, 2026, about 4:45 AM ET (America/New_York, UTC-4) by Grok Bot. It replaces the "Resume here" notes in earlier copies. Older detail (v50–v134 history, architecture notes, the Oct 17 rule list) is in the earlier handoff kept in the private test-data repo and test kit (`handoffs/MARKER-HANDOFF.md`). On the box the previous copy is `/workspace/MARKER-HANDOFF.pre-v145.md`.

> **State at writing (updated Tue Nov 17, 2026, 11:35 AM ET):** **bpm-v148 is live** (PR #26). Nothing is in progress. The kit copy on this computer is rebuilt from the v134 kit: the v135–v146 screen suites are missing (see §5 and §8). A new bot taking over should read §0 first, then "Resume here" at the end.

## 0. Access for a new bot taking over
This file contains **no passwords, tokens or keys**. The user grants access directly; never ask for a token in chat.
- **GitHub account:** `johnathansiler`. The new bot needs GitHub access to these three repos:
  - `johnathansiler/blueprint-markup` (public app code): read and write (push branches, open and merge PRs).
  - `johnathansiler/marker-testdata` (private plans and test data): read.
  - `johnathansiler/Marker-tester` (private test kit): read and write.
- **How to get it:** ask the user to connect GitHub for the new bot (the GitHub connector, or the `gh` CLI signed in as `johnathansiler`). If the new bot runs on the same Grok Bot computer, `gh` is already signed in there (`gh auth status`), and the kit lives at `/workspace/marker-tester`.
- **Test-data token:** the kit reads plans with the `MARKER_TESTDATA_TOKEN` environment variable. The user supplies it through a secure secret prompt; never print, log or store it.
- **Merging:** the user has a saved rule allowing PR merges in `johnathansiler/blueprint-markup`; anything else (force push, pushing kit commits, repo settings) needs the user's explicit yes.
- **Box files worth knowing:** status logs `/workspace/vNNN-status.txt`, screenshots `/workspace/shots/vNNN/`, older handoffs `/workspace/MARKER-HANDOFF.pre-*.md`, and in the kit `handoffs/` (older history v50–v134, `REVIEW-v121.md`, `FINDINGS.md`).
- **The user:** fire alarm tech who works on Siemens Desigo Fire Safety Modular systems, in America/New_York. Wants plain language, an ETA in ET with every start, screenshots with every result, and "close and reopen the app" on every release.

## 1. Project
- **Marker** (internal name "Blueprint Markup", cache prefix `bpm-`) is a static, offline phone app (PWA) for fire alarm plan markup and inspection: open a plan PDF, Detect or add device markers, draw markups, run a walk test, track deficiencies, export reports, split and merge work between two techs, and look up Siemens Desigo parts.
- **Live:** https://johnathansiler.github.io/blueprint-markup/ (GitHub Pages, deploys on every push to `main`).
- **Repos:**
  - `johnathansiler/blueprint-markup`: app code. **Public**, code only.
  - `johnathansiler/marker-testdata`: test data and plans. **Private.**
  - `johnathansiler/Marker-tester`: the test kit (scripts, expected numbers, plans). **Private.** Local copy `/workspace/marker-tester`.
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
- **Bottom row (v148, user's request):** phone and Fold closed: Detect and Sheets (double width), Walk test, Marker, **Shapes**, Draw, More. **Marker sits right next to Shapes**, and one tap on Shapes opens the Shapes list (user: "I don't wanna have to click two buttons to get to shapes"). Draw keeps Lines, Freehand, Stamp, Text, Snap, Color, Fill, Width (no Shapes inside). Wide (Fold open): Walk test, Marker, Shapes, Lines, Text, Stamp, Color, Fill, Width, More; there a tap on Shapes starts the last shape and ▾ opens the list. No visible word "Place" anywhere for the Marker button or its list.
- **Undo and Redo always side by side** in the top row, on every screen size (wide top row: Menu, Previous, Page, Next, Undo, Redo, Pages, Pins, Layers, Teach, QR code). Redo is not repeated in More.
- **Device shapes (v147):** every device picture in lists and buttons (Marker list and button, Pins list, walk bar, walk dialog, Detect types, Layers) shows the device's real pin shape (`pinIcon()` / `pinShpCls()` in `src/app/01-core.js`, from `pshOf`). Pins on the plan are unchanged (geometry locked); zoomed out they are tiny because they are real symbol size.
- **Shape Fill (v147):** Fill ▾ in the Draw tools opens No fill / Fill + a Fill opacity slider (default 40%), uses the shape's line color; applies to new shapes and the selected shape; the Shape added chip and the selection bar have Fill / No fill. Field `m.fill` (0.1–1) on markups. `src/ui/47-shape-fill.js`.
- **Drag to move a marker (v147):** normal view = hold about 0.4 s then drag (quick drag pans, tap opens the card); Marker mode = drag an existing marker at once (tap still places); a just-placed or selected marker drags by its body (corners resize, knob rotates). Position only, one Undo step, off during a walk. `src/ui/48-pin-move.js`.
- **Pages bar (phone):** Rename and Close are stacked vertically. Page jumping is by tapping a thumbnail, or Previous/Next.
- **Even 4px gaps everywhere.**
- **Stacking (approved v143, all screen sizes):**
  - Everything stacks and **never overlaps**.
  - Menus and lists open **next to their own button**: dropping down from the top bar, stacking up from the bottom bar, and above the Pages bar when it is open.
  - Each one **sizes to its content** and doesn't stretch. Width stays small. Lists shrink and scroll **only when too tall**.
  - Compact lists next to their buttons on Fold open and desktop too.
  - **v145:** opening or closing a bar (the Pages bar) **never closes an open list, the Draw panel or the Width row**. They stay and re-stack into the space.
- Code for stacking: `src/ui/45-stack.js` (placement; v147 adds the Fill row `#fillBar` to the chain), `src/ui/15-toolbar-wheels.js` (the list itself, `wheelOpen`), `src/ui/30-task-bar.js` (bottom row, Draw panel).

## 4. Build and ship process
1. **Fresh clone** of `blueprint-markup` into a new folder (e.g. `/workspace/vNNN`), branch `vNNN-wip` from current `main`. Status log `/workspace/vNNN-status.txt`, one line per step with an ET time.
2. Edit **only `src/`** (plus `sw.js` line 3). Run `node tools/build.js`, then `node tools/build.js --check` (must say the built files match `src/`). See `CODEMAP.md` for where things live.
3. Bump `sw.js` to `const C='bpm-vNNN'`.
4. Add a kit test `test/v113/vNNN.py` in the test kit and wire it into `run-all.sh` and `tools/test-ui.sh`. Show it **fails on the old build and passes on the new one**.
5. Gates (below), screenshots to `/workspace/shots/vNNN/`.
6. Check the app repo is still **public, code only** (`gh repo view johnathansiler/blueprint-markup --json visibility`) and the diff has no plan IDs, plan images or test data. **Push the branch normally** (never force).
7. Open the PR and merge it (approval cards when blocked), then confirm live: `curl -s https://johnathansiler.github.io/blueprint-markup/sw.js | grep -o "const C='[^']*'"` shows the new version. Tell the user it's live and to close and reopen the app.

## 5. Tests and gates (test kit)
Run from the kit folder (`/workspace/marker-tester`):
- **Quick gate:** `./run-all.sh --quick /workspace/vNNN` (about 4 min). Must show:
  - `golden` 780/783 (3 wrong type, 0 missed, 0 extra, 0 moved)
  - `fl130` a test plan 255 pins, 0 phantoms, 0 baseline missed
  - `snapshot` identical to s126 (7 files), v97 pins unchanged
- **Screen suites:** `tools/test-ui.sh -j 5 /workspace/vNNN` (about 12–15 min). Each must be PASS (PASS* = failed under load, passed on its own rerun).
  - **On this computer (since v147):** the kit was rebuilt from the pushed v134 kit, so only these 12 run: card120, gap119, walkbar, v113ui, v113anim, v111walk, v132, v133, v134, gray134, v147, v148. `tools/test-ui.sh` was recreated here.
  - **Missing (never pushed from the old computer):** lists, v135, v136, v138, v142, v143, v143s, v144, v145, v146. Restore them by pushing the old kit commits (through `e923d0d`) if that copy still exists; then add them back to `tools/test-ui.sh`.
  - **Stale here:** `v132` and `v111walk` fail the same way on live v146 and on v147 (they still expect the v134-era Menu Share row and the old rolling-wheel overlay). Their updated copies were in the missing commits; treat them as known-stale until restored.
  - **Load plan list:** `lib/autoload/sitecustomize.py` (on `PYTHONPATH` from run-all.sh and test-ui.sh) answers the v146 "Load plan" list with All sheets so older suites don't stall. `MARKER_NO_AUTOLOAD=1` turns it off.
  - Plans are Git LFS files: on a new computer install git-lfs and run `git lfs pull` in the kit (about 615 MB).
- **One suite:** `python3 test/v113/vNNN.py PORT` against `python3 -m http.server PORT -d /workspace/vNNN`. Ends with `ALLOK` or `FAIL n`.
- **Detect changes only:** also full Detect on the top 3 plans (a test plan, a test plan, a test plan) (`./run-all.sh --only top3-detect,detect-timing`).
- Ports: run-all uses 8100/8102 by default; `MARKER_PORT` / `MARKER_REF_PORT` change them. Don't start two runs on the same ports.

## 6. Security rules
- **Plans must never be public.** No plan PDFs, plan IDs, plan images or plan-derived screenshots in the public app repo. User screenshots and plan shots stay on the box.
- **Never print or store the test-data token.** Don't echo it, log it or write it to a file.
- **Verify the app repo's visibility before every push.**
- **No force pushes** without the user's explicit approval. Merges and pushes go through approval cards when blocked.
- **Never push from old pre-purge clones** (folders from before v137, the scrub and dry-run folders). Always build from a fresh clone.
- **Test kit commits are local and unpushed, pending the user's approval.** On the old computer: everything through `52d86b2`, plus `5ee598c` (v144), `0236407` (v145) and `e923d0d` (v146 suite). On this computer: the v147 kit commit `e54e8bc` and the v148 kit commit `369af97`, made on top of the pushed v134 kit.

## 7. Release history v135–v148
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
| v145 | #23 `4e03be6` | Closing or opening the Pages bar no longer closes an open Marker, More or Draw list, the Draw panel or the Width row; the list re-stacks into the space. |
| v146 | #24 `0cddf83` | Picking a new PDF shows a Load plan choice: All sheets, or Legend, renovation and new-work sheets only (`src/ui/46-load-sheets.js`); keeps the legend plus floor plans Detect would pin (a test plan keeps 15 of 55); exact on all 10 test plans. |
| v147 | #25 `a4ee891` | Bottom row Walk test, Marker, Draw (Marker beside Draw / Shapes); Redo beside Undo on wide screens too (no longer only in More); shape Fill (Fill ▾: No fill / Fill + Fill opacity); drag to move a marker (hold then drag, or drag in Marker mode / by its body); every device picture in lists and buttons shows its real shape instead of a circle. Kit: `test/v113/v147.py`, `tools/test-ui.sh` rebuilt, Load plan autoload. |
| v148 | #26 | Phone and Fold closed bottom row: Shapes button right next to Marker (one tap opens the Shapes list); Draw keeps the other tools. Box and Rounded box icons drawn as real shapes (Rounded box showed as a dot). Kit: `test/v113/v148.py`. |

## 8. Open items
- **Test kit commits** through `e923d0d` (v144, v145, v146 suites and earlier) are unpushed on the old computer; push only with the user's approval. A new bot on a different computer will not have them until they are pushed. **This computer is missing the v135–v146 suites**; the v147 and v148 kit commits here (`e54e8bc`, `369af97`) are local and unpushed too.
- **Not yet offered:** adding v135-onward items to the checklist Page.
- **Older backlog** (from the v121 review and the Detect backlog in the earlier handoff) may be partly done; check against the current app before working on any of it, and only when the user asks.

## 9. Resume here (Tue Nov 17, 2026, 11:35 AM ET)
1. Read §0 (access), then this whole file, then `/workspace/v148-status.txt` if you are on the same computer.
2. **bpm-v148 is live** (PR #26). Check: `curl -s https://johnathansiler.github.io/blueprint-markup/sw.js | grep -o "const C='[^']*'"`.
3. Nothing is in progress. Kit: v147 and v148 commits are local and unpushed (needs the user's yes); v135–v146 suites missing here (§5); v132 and v111walk are known-stale here.
4. For the next request: fresh clone, branch `v149-wip`, follow §4 and §5, give an ETA in ET, and finish everything in one build.
