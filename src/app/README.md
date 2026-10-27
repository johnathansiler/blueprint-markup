# app.js modules

`app.js` is built from these files by `node tools/build.js` (file-name order). See `CODEMAP.md` at the top of the repo for what each file holds and for the other built files (dlg.js, ui.js, app.css).

Edit a module, run `node tools/build.js`, and commit both. `node test/v135-split.js` fails if `app.js` was edited directly or not rebuilt.

Why a build and not separate script tags: the modules share globals and call each other while the page loads. Loaded as separate files, the browser can run timers and events between files (seen under load: `tedPos is not defined`, `renderList is not defined`). One built file keeps start-up order fixed.
