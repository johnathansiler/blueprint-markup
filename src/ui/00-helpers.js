// @shared-globals: small DOM helpers shared by every file in src/ui (bpm-v139). They are script-level constants, not window properties.
// by(id): element by id · ce(tag, className, html): new element · ceA(tag, props, html): new element with properties copied in
const by=id=>document.getElementById(id);
const ce=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e};
const ceA=(t,a={},h='')=>{const e=document.createElement(t);Object.assign(e,a);if(h)e.innerHTML=h;return e};
