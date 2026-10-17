// bpm-v90: offline Guides panel. Every figure below carries its source link; no other numbers are stated.
(()=>{const ce=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e};
const S={
 iec:['IEC 60062 (resistor colour code)','https://webstore.iec.ch/publication/24233'],
 xtri:['Siemens XTRI-S/D/R Installation Instructions A6V101055479','https://sid.siemens.com/r/A6V101055479/32659825931___en-US_32659819403'],
 tri:['Siemens TRI-S/D/R Installation Instructions (copy)','https://firealarmresources.com/siemens-cerberus-pyrotronics/siemens-tri-s-tri-d-tri-r-addressable-interface-modules-installation-instruction/'],
 htri:['Siemens HTRI-M Installation Instructions','https://sid.siemens.com/api/khub/documents/f1d3yj5RteO5FSi6D2loIQ/content'],
 pad3:['Siemens FACP Accessories data sheet (PAD-3)','https://sid.siemens.com/api/khub/documents/u7u0PW161R6RzwZinvnBdA/content'],
 tm:['Siemens Desigo Fire Safety Modular Operation Manual A6V11231620 – Trouble Messages','https://sid.siemens.com/r/A6V11231620/21774530443_31188591243__en-US_25271540491']};
window.gCite=h=>h.replace(/\[(\w+)\]/g,(m,x)=>S[x]?`<sup><a href="${S[x][1]}" target="_blank" rel="noopener" title="${esc(S[x][0])}">[${x}]</a></sup>`:m);
const src=(...k)=>`<div class="gSrc">Sources: ${k.map(x=>`<a href="${S[x][1]}" target="_blank" rel="noopener">${esc(S[x][0])}</a>`).join(' · ')}</div>`;
const CC=[['black',0,1],['brown',1,10,'1%'],['red',2,100,'2%'],['orange',3,1e3],['yellow',4,1e4],['green',5,1e5,'0.5%'],['blue',6,1e6,'0.25%'],['violet',7,1e7,'0.1%'],['grey',8,1e8,'0.05%'],['white',9,1e9],['gold',null,.1,'5%'],['silver',null,.01,'10%']];
const TCR={brown:'100 ppm/K',red:'50 ppm/K',orange:'15 ppm/K',yellow:'25 ppm/K',blue:'10 ppm/K',violet:'5 ppm/K'};
const HEX={black:'#000',brown:'#7c3f00',red:'#dc2626',orange:'#f97316',yellow:'#facc15',green:'#16a34a',blue:'#2563eb',violet:'#7c3aed',grey:'#9ca3af',white:'#fff',gold:'#c9a227',silver:'#c0c0c0'};
const fmtR=v=>v>=1e6?+(v/1e6).toPrecision(4)+' MΩ':v>=1e3?+(v/1e3).toPrecision(4)+' kΩ':+v.toPrecision(4)+' Ω';
function resistor(){const st={n:4,b:['brown','black','red','gold','brown','brown']};
 const el=ce('div','gBody');const draw=()=>{const n=st.n,dig=n===4?2:3,b=st.b;
  const sel=(i,opts)=>`<select data-b="${i}">${opts.map(c=>`<option${b[i]===c?' selected':''}>${c}</option>`).join('')}</select>`;
  const D=CC.filter(c=>c[1]!=null).map(c=>c[0]),M=CC.map(c=>c[0]),T=CC.filter(c=>c[3]).map(c=>c[0]);
  const parts=[];for(let i=0;i<dig;i++)parts.push(sel(i,D));parts.push(sel(dig,M));parts.push(sel(dig+1,T));if(n===6)parts.push(sel(dig+2,Object.keys(TCR)));
  let v=0;for(let i=0;i<dig;i++)v=v*10+CC.find(c=>c[0]===b[i])[1];v*=CC.find(c=>c[0]===b[dig])[2];const tol=CC.find(c=>c[0]===b[dig+1])?.[3]||'?';
  el.innerHTML=gCite(`<div class="row">${[4,5,6].map(k=>`<button type="button" class="btn${k===n?' pri':''}" data-n="${k}">${k} bands</button>`).join('')}</div>
  <svg viewBox="0 0 300 70" class="gRes"><line x1="0" y1="35" x2="300" y2="35" stroke="#94a3b8" stroke-width="4"/><rect x="60" y="12" width="180" height="46" rx="20" fill="#e7d3a8"/>${b.slice(0,n).map((c,i)=>`<rect x="${78+i*(140/(n))}" y="12" width="12" height="46" fill="${HEX[c]}" stroke="#0003"/>`).join('')}</svg>
  <div class="row gSel">${parts.join('')}</div><div class="gBig">${fmtR(v)} ±${tol}${n===6?' · '+TCR[b[dig+2]]:''}</div>
  <h4>Value → bands</h4><div class="row"><input id="gRv" placeholder="e.g. 470, 4.7k, 24k" style="max-width:160px"><button type="button" class="btn" id="gRgo">Show bands</button></div><div id="gRo"></div>
  <h4>Siemens EOL / supervision resistors (from Siemens docs)</h4><table class="gT"><tr><th>Device</th><th>EOL</th><th>Note</th></tr>
  <tr><td>XTRI-S / XTRI-D / XTRI-R inputs</td><td>470 Ω, 1%, ½ W (P/N A5Q00073045)</td><td>At last switch; TB-EOL S54322-F4-A2 [xtri]</td></tr>
  <tr><td>TRI-S / TRI-D / TRI-R inputs</td><td>470 Ω, ¼ W (P/N 140-820164)</td><td>At last switch; EL-30/31 plate [tri]</td></tr>
  <tr><td>HTRI-M</td><td>470 Ω, ¼ W (P/N 140-820164)</td><td>Ground fault detected &lt;25 kΩ on orange terminals [htri]</td></tr>
  <tr><td>PAD-3 NAC outputs</td><td>24 kΩ on each Class B circuit</td><td>[pad3]</td></tr></table>
  <small>Desigo FC20xx panel NAC EOL value: not stated in the documents reviewed; check the panel's installation manual. Always use the EOL value printed in the specific device's install sheet.</small>
  ${src('iec','xtri','tri','htri','pad3')}`);
  el.querySelectorAll('[data-n]').forEach(x=>x.onclick=()=>{st.n=+x.dataset.n;draw()});el.querySelectorAll('[data-b]').forEach(s=>s.onchange=()=>{st.b[+s.dataset.b]=s.value;draw()});
  el.querySelector('#gRgo').onclick=()=>{const m=String(el.querySelector('#gRv').value).trim().toLowerCase().match(/^([\d.]+)\s*([kmr]?)/);if(!m)return;let v=parseFloat(m[1])*(m[2]==='k'?1e3:m[2]==='m'?1e6:1);const out=[];
   for(const d of [2,3]){const e=Math.floor(Math.log10(v))-(d-1);const sig=Math.round(v/10**e);if(sig>=10**d)continue;const mult=CC.find(c=>Math.abs(c[2]-10**e)<1e-9*10**e);if(!mult)continue;const ds=String(sig).padStart(d,'0').split('').map(x=>CC[+x][0]);
    out.push(`<div><b>${d+2}-band:</b> ${[...ds,mult[0],'gold (±5%) / brown (±1%)'].map(c=>`<span class="gChip" style="--c:${HEX[c.split(' ')[0]]||'#555'}">${c}</span>`).join(' ')}</div>`)}
   el.querySelector('#gRo').innerHTML=out.join('')||'No exact band code for that value.'}};draw();return el}
// bpm-v100: Ohm's law power wheel. Enter any 2 of V/I/R/P (with units); the other 2 show instantly, and the formula used lights up on the wheel.
function ohm(){const el=ce('div','gBody ohmW');
 const Q={V:{n:'Voltage',u:[['mV',1e-3],['V',1]],d:1},I:{n:'Current',u:[['mA',1e-3],['A',1]],d:0},R:{n:'Resistance',u:[['Ω',1],['kΩ',1e3],['MΩ',1e6]],d:0},P:{n:'Power',u:[['mW',1e-3],['W',1]],d:1}};
 // formula for each unknown from each known pair (key = sorted pair)
 const F={V:{IR:['I × R',(v)=>v.I*v.R],IP:['P ÷ I',v=>v.P/v.I],PR:['√(P × R)',v=>Math.sqrt(v.P*v.R)]},I:{RV:['V ÷ R',v=>v.V/v.R],PV:['P ÷ V',v=>v.P/v.V],PR:['√(P ÷ R)',v=>Math.sqrt(v.P/v.R)]},
  R:{IV:['V ÷ I',v=>v.V/v.I],PV:['V² ÷ P',v=>v.V*v.V/v.P],IP:['P ÷ I²',v=>v.P/(v.I*v.I)]},P:{IV:['V × I',v=>v.V*v.I],RV:['V² ÷ R',v=>v.V*v.V/v.R],IR:['I² × R',v=>v.I*v.I*v.R]}};
 const POS={V:[0,'top'],I:[90,'right'],R:[180,'bottom'],P:[270,'left']};
 const arc=(a0,a1,r0,r1)=>{const p=(a,r)=>[200+r*Math.sin(a*Math.PI/180),200-r*Math.cos(a*Math.PI/180)].map(x=>x.toFixed(1)).join(',');return`M${p(a0,r1)}A${r1},${r1} 0 0 1 ${p(a1,r1)}L${p(a1,r0)}A${r0},${r0} 0 0 0 ${p(a0,r0)}Z`};
 el.innerHTML=`<svg viewBox="0 0 400 400" class="ohmSvg" role="group" aria-label="Ohm's law wheel">${Object.entries(POS).map(([k,[a]])=>`<path class="ohmQ" data-q="${k}" d="${arc(a-44,a+44,62,196)}"/>`).join('')}
  <circle cx="200" cy="200" r="58" class="ohmHub"/><text x="200" y="210" class="ohmHubT" text-anchor="middle">V·I·R·P</text>
  ${Object.entries(POS).map(([k,[a]])=>{const r=128,x=200+r*Math.sin(a*Math.PI/180),y=200-r*Math.cos(a*Math.PI/180);return`<g class="ohmL" data-q="${k}"><text x="${x}" y="${y-22}" text-anchor="middle" class="ohmK">${k}</text><text x="${x}" y="${y+10}" text-anchor="middle" class="ohmV" data-v="${k}">—</text><text x="${x}" y="${y+36}" text-anchor="middle" class="ohmF" data-f="${k}"></text></g>`}).join('')}</svg>
  <div class="ohmMsg" id="ohmMsg">Tap a quadrant or a box and enter any 2 values.</div>
  <div class="ohmIn">${Object.entries(Q).map(([k,q])=>`<label class="ohmRow" data-r="${k}"><span class="ohmLab"><b>${k}</b> ${q.n}</span><input data-k="${k}" inputmode="decimal" enterkeyhint="next" autocomplete="off" aria-label="${q.n}"><select data-u="${k}" aria-label="${q.n} unit">${q.u.map(([u],i)=>`<option value="${i}"${i===q.d?' selected':''}>${u}</option>`).join('')}</select></label>`).join('')}</div>
  <div class="row ohmBtns"><button type="button" class="btn" id="gOx">✕<span class="tl">Clear</span></button></div>
  <h4>Fire alarm presets</h4><div class="ohmPre">
   <button type="button" class="btn" data-p="V:24:1">24 V<span class="tl">24 V NAC (nominal)</span></button>
   <button type="button" class="btn" data-p="V:12:1">12 V<span class="tl">12 V (nominal)</span></button>
   <button type="button" class="btn" data-p="R:470:0">470 Ω<span class="tl">XTRI/TRI input EOL [xtri][tri]</span></button>
   <button type="button" class="btn" data-p="R:24:1">24 kΩ<span class="tl">PAD-3 Class B NAC EOL [pad3]</span></button></div>
  <small>Always use the EOL value printed in the specific device's install sheet. Ohm's law V = I·R; power P = V·I.</small>${src('xtri','tri','pad3')}`;
 const inp=k=>el.querySelector(`[data-k=${k}]`),uni=k=>el.querySelector(`[data-u=${k}]`),mul=k=>Q[k].u[+uni(k).value][1];
 let order=[];// last two keys the user typed
 const fmt=(k,v)=>{if(!isFinite(v))return'—';const us=Q[k].u;let u=us[0];for(const x of us)if(Math.abs(v)>=x[1]*.9999)u=x;const n=v/u[1],a=Math.abs(n),s=a>=100?n.toFixed(1):a>=10?n.toFixed(2):n.toFixed(3);return(+s).toString()+' '+u[0]};
 const val=k=>{const t=inp(k).value.trim().replace(',','.');if(!t)return null;const v=parseFloat(t);return isFinite(v)&&v>0?v*mul(k):NaN};
 const calc=()=>{const kn=order.filter(k=>val(k)!=null).slice(-2),v={};el.querySelectorAll('.ohmQ,.ohmL,.ohmRow').forEach(x=>x.classList.remove('known','calc'));el.querySelectorAll('[data-f]').forEach(x=>x.textContent='');
  for(const k of 'VIRP'){const x=val(k);if(kn.includes(k)){v[k]=x;el.querySelector(`[data-v=${k}]`).textContent=isFinite(x)?fmt(k,x):'?';el.querySelectorAll(`[data-q=${k}],[data-r=${k}]`).forEach(e=>e.classList.add('known'))}}
  const msg=el.querySelector('#ohmMsg');if(kn.length<2||kn.some(k=>!isFinite(v[k]))){for(const k of 'VIRP')if(!kn.includes(k)){el.querySelector(`[data-v=${k}]`).textContent='—';if(order.length<2||!kn.includes(k))inp(k).placeholder=''}msg.textContent=kn.some(k=>!isFinite(v[k]))?'Enter a number above 0.':kn.length?'Enter one more value.':'Tap a quadrant or a box and enter any 2 values.';return}
  const key=kn.slice().sort().join('');const used=[];for(const k of 'VIRP'){if(kn.includes(k))continue;const [f,fn]=F[k][key];const r=fn(v);el.querySelector(`[data-v=${k}]`).textContent=fmt(k,r);el.querySelector(`[data-f=${k}]`).textContent=k+' = '+f;inp(k).value='';inp(k).placeholder=fmt(k,r);el.querySelectorAll(`[data-q=${k}],[data-r=${k}]`).forEach(e=>e.classList.add('calc'));used.push(k+' = '+f)}
  msg.textContent='From '+kn.join(' and ')+': '+used.join(' · ')};
 for(const k of 'VIRP'){inp(k).oninput=()=>{order=order.filter(x=>x!==k);if(inp(k).value.trim())order.push(k);calc()};uni(k).onchange=calc}
 el.querySelectorAll('.ohmQ,.ohmL').forEach(q=>q.onclick=()=>{const k=q.dataset.q;if(!order.includes(k)&&order.length>=2){const drop=order.shift();inp(drop).value=''}inp(k).focus()});
 el.querySelector('#gOx').onclick=()=>{order=[];for(const k of 'VIRP'){inp(k).value='';inp(k).placeholder='';uni(k).value=Q[k].d}calc()};
 el.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{const [k,n,u]=b.dataset.p.split(':');inp(k).value=n;uni(k).value=u;order=order.filter(x=>x!==k);order.push(k);if(order.length>2){const drop=order.shift();inp(drop).value=''}calc()});
 calc();return el}
const H=(h)=>()=>ce('div','gBody',h);
function trouble(){const el=ce('div','gBody');el.innerHTML=`<input id="gTq" type="search" placeholder="Search trouble message…" style="width:100%"><div id="gTl">Loading…</div>${src('tm')}<small>Messages and descriptions are quoted from the Siemens manual above (Desigo Fire Safety Modular). FC-series (FC2025/FC2050) message texts are not included yet.</small>`;
 // bpm-v102: same sourced entries, regrouped by kind of trouble (keyword rules on the quoted text; nothing added).
 const TC=[['gf','⏚','Ground fault',/\bground/i],['oth','⚙','Configuration / other',/printer|tamper|reset operation|expansion card|invalid parameter|config(uration)? (fault|error|mismatch)|cfg mismatch|mismatch/i],['sup','🟨','Supervisory / disabled',/supervisory|^disarmed|^disabled: manual|^disabled: invalid/i],['pwr','🔋','Power / AC / battery',/\bac\b|battery|charger|supply|power|voltage|brownout|overcurrent|fuse/i],
  ['com','📡','Communication / network / dialer',/comm|network|dialer|dnet|hnet|xnet|can bus|asi|voip|media adapter|ring|not responding|responding|mdact/i],['wir','〰','Open / short / wiring (SLC / NAC)',/\bopen|short|class a|isolator|wiring|\bnac\b|\bline\b/i],
  ['dev','🧩','Device / module trouble',/dev\.|device|detector|det\.|module|base|board|ram|rom|fpga|led|iec|input|ntc|mic|signal|software|supervision|hw fail/i],['oth2','⚙','Configuration / other',/./]];
 const cat=([a,b])=>{const k=(TC.find(c=>c[0]!=='oth2'&&c[3].test(a))||TC.find(c=>c[3].test(b)))[0];return k==='oth2'?'oth':k};
 fetch('guides-trouble.json').then(r=>r.json()).then(L=>{const G=['gf','wir','pwr','com','dev','sup','oth'].map(k=>TC.find(c=>c[0]===k)).map(c=>[c,L.filter(e=>cat(e)===c[0])]).filter(g=>g[1].length);const shut=new Set();
  const r=()=>{const q=el.querySelector('#gTq').value.toLowerCase(),M=G.map(([c,l])=>[c,l.filter(([a,b])=>!q||(a+' '+b).toLowerCase().includes(q))]).filter(g=>g[1].length);
   el.querySelector('#gTl').innerHTML=`<div class="gTJ">${M.map(([c,l])=>`<button type="button" class="btn gTC" data-j="${c[0]}">${c[1]} ${esc(c[2])} <b>${l.length}</b></button>`).join('')}</div>`+(M.map(([c,l])=>`<details class="gTS" id="gts-${c[0]}"${q||!shut.has(c[0])?' open':''}><summary><h4>${c[1]} ${esc(c[2])} <small>(${l.length})</small></h4></summary><table class="gT"><tr><th>Message</th><th>Meaning (Siemens)</th></tr>${l.map(([a,b])=>`<tr><td><b>${esc(a)}</b></td><td>${esc(b)}</td></tr>`).join('')}</table></details>`).join('')||'<p>No match.</p>');
   el.querySelectorAll('.gTS').forEach(d=>d.ontoggle=()=>{if(!q){const k=d.id.slice(4);d.open?shut.delete(k):shut.add(k)}});
   el.querySelectorAll('[data-j]').forEach(b=>b.onclick=()=>{const d=el.querySelector('#gts-'+b.dataset.j);d.open=true;d.scrollIntoView({block:'start',behavior:'smooth'})})};
  el.querySelector('#gTq').oninput=r;r()}).catch(()=>el.querySelector('#gTl').textContent='Not available offline yet — open once while online.');return el}
const GUIDES=[['res','🎨','Resistor codes',resistor],['trb','⚠','Trouble codes',trouble],['ohm','Ω','Ohm\'s law',ohm],['sym','🔣','Symbols',()=>window.symbolGuide?window.symbolGuide():ce('div','gBody','Loading…')]];
const d=ce('dialog');d.id='gDlg';d.innerHTML=`<div class="gHead"><b>📘 Guides</b><span class="sp"></span><button type="button" class="btn" id="gX">✕ Close</button></div><div class="gTabs">${GUIDES.map(([k,i,n])=>`<button type="button" class="btn" data-g="${k}">${i}<span class="tl">${esc(n)}</span></button>`).join('')}</div><div id="gC"></div>`;document.body.append(d);
const show=k=>{const g=GUIDES.find(x=>x[0]===k)||GUIDES[0];d.querySelectorAll('[data-g]').forEach(b=>b.classList.toggle('pri',b.dataset.g===g[0]));const c=$('#gC');c.innerHTML='';const b=g[3]();b.innerHTML=b.innerHTML.replace(/\[(\w+)\]/g,(m,x)=>S[x]?`<sup><a href="${S[x][1]}" target="_blank" rel="noopener" title="${esc(S[x][0])}">[${x}]</a></sup>`:m);c.append(b);localStorage.setItem('bpm-guide',g[0])};
// re-run interactive builders after the citation rewrite keeps listeners only for string guides; interactive ones attach listeners on elements, so rebind by rebuilding:
const showI=k=>{const g=GUIDES.find(x=>x[0]===k)||GUIDES[0];if(['res','ohm','trb','sym'].includes(g[0])){d.querySelectorAll('[data-g]').forEach(b=>b.classList.toggle('pri',b.dataset.g===g[0]));const c=$('#gC');c.innerHTML='';const el=g[3]();if(g[0]==='ohm')el.querySelectorAll('.tl,small').forEach(x=>x.innerHTML=window.gCite(x.innerHTML));c.append(el);localStorage.setItem('bpm-guide',g[0])}else show(k)};
d.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>showI(b.dataset.g));d.querySelector('#gX').onclick=()=>d.close();
window.openGuides=k=>{showI(k||localStorage.getItem('bpm-guide')||'res');d.showModal()};
// own button on the main toolbar (separate HELP group)
const b=ce('button','tool','📘<span class="tl">Guides</span>');b.type='button';b.id='guidesBtn';b.title='Field guides (offline)';b.onclick=()=>openGuides();
const g=ce('div','tbG');g.dataset.g='help';g.append(ce('i','tbN','HELP'),b);(window.TB_EXTRA??=[]).push(g);if(window.tbLayout)tbLayout();else $('#tools').append(g);
})();
