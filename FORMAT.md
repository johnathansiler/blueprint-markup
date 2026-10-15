# Blueprint Markup project file (`.bpm`), format version 1

A `.bpm` file is an ordinary **ZIP archive** (entries stored uncompressed, UTF-8 names), so any unzip tool can open it.

| Entry | Contents |
|---|---|
| `project.json` | manifest (always the first entry) |
| `plans/<planId>.pdf` (or `.png`/`.jpeg`) | the original plan file bytes, unchanged |
| `media/<mediaId>` | photo / video / voice-note bytes, unchanged |
| `media/<mediaId>-annot` | annotated copy of a photo (when one exists) |

`project.json`:

```json
{ "format": "blueprint-markup-project", "version": 1, "app": "bpm-v10", "saved": "ISO-8601 UTC",
  "project": { "id", "name", "created" },
  "plans":   [ { ...plan record without blob, "file": "plans/…", "type": mime, "size": bytes } ],
  "markups": [ ...markup records (planId, page, type, x1,y1,x2,y2, color, w, text, fs…) ],
  "pins":    [ ...pin records (planId, page, x, y, type, address, loop, status, checks[], testedAt, tester, reason, severity, notes, fp…) ],
  "media":   [ ...media records without blobs (pinId, kind, name, created, annShapes…) + "file", "type", "size", optional "annotFile", "annotType" ],
  "layers":  { "<planId>": layer/filter settings },
  "meta":    { "last": "<planId last opened>" },
  "learned": null | [ learned detection rules {id, fp, g} ],
  "mycodes": null | [ personal code library entries {id, code, section, title, text, reasons, types} ] }
```

Coordinates are PDF points of the page as displayed (after /Rotate). Times are epoch milliseconds.

Opening rules: `format` must match and `version` must be 1…(the app's supported version); newer files are refused with a message to update the app.
Every entry's CRC-32 is checked before anything is written. All project, plan, markup, pin and media IDs get fresh IDs, so a file can be opened any number of times next to existing projects.
"Replace" writes the new data first and deletes the old plans only afterwards. Learned rules are merged (existing rules are kept).
Limits: under 4 GB in total (no ZIP64) and under 65,000 entries.

Personal `mycodes` are merged on open (existing ids kept). Built-in `codes.json` is app-static and not stored in the .bpm.

## v14 measurement
- `scales`: optional `{ [planId]: {def: ppf|null, pages: {[page]: ppf}} }` — ppf = plan points per real foot. Stored locally in `meta` as `scale:<planId>`.
- Markup types `dim` (x1,y1→x2,y2), `darea` (rect), `dpath` (bbox x1..y2 + `rp`: points relative to x1,y1). Labels are computed from the plan's scale at draw/export time. Older apps ignore these types.
