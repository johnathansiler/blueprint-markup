#!/usr/bin/env node
'use strict';
// bpm-v126: number-only fixtures for the EOL short-side + O rule and the ER→horn status map.
// No plan PDFs. Measurements are the published fixture numbers (box sides, O extents, segment signatures).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const D = require('../detect.js');

const tagsSrc = fs.readFileSync(path.join(__dirname, '../src/ui/18-text-tags.js'), 'utf8');
const window = {};
vm.runInNewContext(tagsSrc, {window, console, Math, Set, Map}, {filename: 'tags.js'});

const lines = [];
let failed = 0;
function show(before, after, msg) {
  const ok = before === false && after === true;
  if (!ok) failed++;
  lines.push(`${ok ? 'PASS' : 'FAIL'}  before:${before ? 'accept' : 'reject'}  after:${after ? 'accept' : 'reject'}  ${msg}`);
}
function expect(cond, msg) {
  if (!cond) failed++;
  lines.push(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
}

// Frozen v125 predicates (the rules this change replaces).
function eolrSizeV125(mn, mx, k) {
  return mn >= 7 * k && mn < 10.5 * k && mx >= 14 * k && mx < 19 * k && mx / mn > 1.45 && mx / mn < 2.6;
}
function oRoundV125(w, h) {
  return Math.abs(w - h) < 0.35 * Math.max(w, h);
}
function hornV125(spec) {
  if (spec.legendOnly) return spec.legendOnly;
  if (spec.watt) return 'spk';
  if (spec.candela) return 'horn';
  if (spec.rowHorn) return 'horn';
  return 'spk';
}

// §6 EOL box: short 10.89 at k=1.0311 is 10.56k, over the old 10.5k cap.
const eol = {k: 1.0311, box: {long: 18.81, short: 10.89}, O: {segs: 20, w: 3.60, h: 7.56}};
const sizeBefore = eolrSizeV125(eol.box.short, eol.box.long, eol.k);
const sizeAfter = D.eolrSize(eol.box.short, eol.box.long, eol.k);
show(sizeBefore, sizeAfter, `EOL short ${eol.box.short} @ k=${eol.k} (${(eol.box.short / eol.k).toFixed(2)}k) under 11k`);

const roundBefore = oRoundV125(eol.O.w, eol.O.h);
const roundAfter = D.oLetterOk(eol.O.w, eol.O.h);
show(roundBefore, roundAfter, `O extents ${eol.O.w} x ${eol.O.h} (page AABB fails roundness; letter ratio passes)`);

// Legend box ~27.33 x 13.68. At a scale where the k-window alone would allow it, the absolute cap must reject it.
const legK = 1.6;
const legSize = {long: 27.33, short: 13.68};
const widenedOnly = legSize.short >= 7 * legK && legSize.short < 11 * legK && legSize.long >= 14 * legK && legSize.long < 19 * legK && legSize.long / legSize.short > 1.45 && legSize.long / legSize.short < 2.6;
expect(widenedOnly === true, `legend box ${legSize.long} x ${legSize.short} sits inside the k-window at k=${legK}`);
expect(D.eolrSize(legSize.short, legSize.long, legK) === false, 'legend-sized box is not an EOL (long side cap)');

function rot(x, y, a) { const c = Math.cos(a), s = Math.sin(a); return [x * c - y * s, x * s + y * c]; }
function ellipsePath(cx, cy, rx, ry, n, ang) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const [x, y] = rot(rx * Math.cos(t), ry * Math.sin(t), ang);
    pts.push([cx + x, cy + y]);
  }
  const segs = pts.map((p, i) => ({t: 'l', p: [p, pts[(i + 1) % n]]}));
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  return {segs, color: [0, 0, 0], fill: null, x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, k: 'l'.repeat(n)};
}
function rectPath(cx, cy, w, h, ang) {
  const hw = w / 2, hh = h / 2;
  const corners = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([x, y]) => { const p = rot(x, y, ang); return [cx + p[0], cy + p[1]]; });
  const segs = corners.map((p, i) => ({t: 'l', p: [p, corners[(i + 1) % 4]]}));
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of corners) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  return {segs, color: [0, 0, 0], fill: null, x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, k: 'llll'};
}

const k = eol.k;
for (const deg of [7.2, 40]) {
  const a = deg * Math.PI / 180;
  const box = rectPath(2000, 1860, eol.box.long, eol.box.short, a);
  const O = ellipsePath(2000, 1860, eol.O.w / 2, eol.O.h / 2, eol.O.segs, a);
  const oldRound = oRoundV125(O.w, O.h);
  const neu = D.oIsEolLetter(O, box, k);
  const ex = D.frameExt(O, box, k);
  expect(neu === true, `O at ${deg}° is an EOL letter in the box frame (extents ${ex.w.toFixed(2)} x ${ex.h.toFixed(2)})`);
  if (deg === 7.2) expect(oldRound === false, `O page AABB at ${deg}° (${O.w.toFixed(2)} x ${O.h.toFixed(2)}) fails the v125 roundness test`);
  expect(Math.abs(Math.max(ex.w, ex.h) - eol.O.h) < 0.05 && Math.abs(Math.min(ex.w, ex.h) - eol.O.w) < 0.05, `box-frame extents stay ${eol.O.w} x ${eol.O.h} at ${deg}°`);
}
expect(D.oLetterOk(7.56, 0.4) === false, 'a hairline closed path is not an O');
expect(D.oIsEolLetter(ellipsePath(0, 0, 1.8, 3.78, 14, 0), rectPath(0, 0, 18.81, 10.89, 0), k) === false, '14-seg closed path is not the EOL O');

// §6 status signatures. ER is the horn-row status; E is not.
const SIG = {'1,1,2': 'E', '1,1,1,2,10': 'ER', '1,1,1,1,2,3': 'ETN', '3': 'N'};
for (const [sig, st] of Object.entries(SIG)) expect(D.statusFromSig(sig) === st, `signature ${sig} → ${st}`);

function stroke(n, x, y, w, h) {
  const segs = [];
  for (let i = 0; i < n; i++) segs.push({t: 'l', p: [[x, y], [x + Math.max(w, 0.2), y]]});
  return {segs, color: [0, 0, 0], fill: null, x0: x, y0: y, x1: x + w, y1: y + h, w, h, cx: x + w / 2, cy: y + h / 2, k: 'l'.repeat(n)};
}
function labelPaths(sig, x, h) {
  const counts = sig.split(',').map(Number);
  const L = stroke(9, x, 0, 1.6, h), parts = [L];
  counts.forEach((n, i) => parts.push(stroke(n, x + 3 + i * 2.2, h * 0.1, 1.2, h * 0.8)));
  const R = stroke(9, x + 4 + counts.length * 2.2, 0, 1.6, h);
  parts.push(R);
  return parts;
}
for (const [sig, st] of Object.entries(SIG)) {
  const got = D.statusLabels(labelPaths(sig, 0, sig === '1,1,1,2,10' ? 4.86 : 7));
  expect(got.length === 1 && got[0].status === st && got[0].sig === sig, `vector reader ${sig} → ${st} (h=${sig === '1,1,1,2,10' ? 4.86 : 7})`);
}
expect(D.statusLabels(labelPaths('1,2,19', 0, 7)).length === 0, 'an unmatched segment sequence is not a status label');

const hornOnly = new Set(['ER']);
const er = {both: true, status: 'ER', hornOnly};
const falseHorn = {both: true, status: 'E', hornOnly, candela: true};
expect(hornV125(er) === 'spk', 'v125 leaves an ER device as speaker (no candela/wattage)');
expect(window.hornAssign(er) === 'horn', 'v126 types ER as horn when ER is only on the horn row');
show(hornV125(er) === 'horn', window.hornAssign(er) === 'horn', 'ER status unique to the horn row → horn');
expect(hornV125(falseHorn) === 'horn', 'v125 types a candela-only tag as horn');
expect(window.hornAssign(falseHorn) === 'spk', 'v126 keeps an E device as speaker when the legend lists both');
show(hornV125(falseHorn) === 'spk', window.hornAssign(falseHorn) === 'spk', 'candela-only tag is not a horn when both types are listed');
expect(window.hornAssign({both: true, hornOnly, candela: true}) === 'spk', 'candela with no status label stays speaker when both types are listed');
expect(window.hornAssign({candela: true}) === 'horn', 'candela still types a horn when the legend does not list both');
expect(window.hornAssign({legendOnly: 'spk'}) === 'spk', 'a speaker-only legend stays speaker');
expect(window.nearestStatus([{status: 'E', x: 0, y: 30}, {status: 'ER', x: 0, y: 10}], 0, 0, 30).status === 'ER', 'nearest status within 30 pt wins');
expect(window.nearestStatus([{status: 'ER', x: 0, y: 30.01}], 0, 0, 30) === null, 'a status past 30 pt is ignored');

// Pin placement math is untouched.
const detSrc = fs.readFileSync(path.join(__dirname, '../detect.js'), 'utf8');
const geomAt = detSrc.indexOf('function geom(');
const geom = detSrc.slice(geomAt, detSrc.indexOf('function shape('));
expect(detSrc.slice(geomAt - 80, geomAt).includes('pin center = OBB center of outline') && geom.includes('return{bw,bh,ang:a,cx,cy}'), 'geom() still returns the v50 outline center');
expect(!/outset|de-?overlap/.test(geom), 'geom() has no outset or de-overlap edit');
const sw = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8');
expect(/const C='bpm-v(12[6-9]|1[3-9]\d|[2-9]\d\d)'/.test(sw) && sw.includes("O='bpm-ocr'"), 'cache ids are bpm-v126+ and bpm-ocr'); // bpm-v127: any release from v126 on
for (const f of ['detect.js', 'ui.js', 'app.js', 'dlg.js']) expect(sw.includes(`'${f}'`), `service worker still precaches ${f}`);

console.log(lines.join('\n'));
console.log(failed ? `\n${failed} FAILED` : `\nALLOK ${lines.length}`);
process.exit(failed ? 1 : 0);
