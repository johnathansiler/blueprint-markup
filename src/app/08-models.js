// ---------- bpm-v72: device model numbers per type (seeded + remembered custom entries) ----------
// bpm-v75: smoke/heat/module/relay/pull lists supplied by the user (authoritative); others from bpm-v74: Siemens Fire Safety models only (each verified on a Siemens datasheet / Siemens doc portal / distributor page); other makes via "Custom…"
const MODELS={
 // bpm-v135: separate lists. Smoke = optical and multi-criteria smoke detectors; Heat = thermal-only detectors (FPT-11, HFPT-11, FDT421; the catalog adds HI921 and SFPT-11). A model saved on an older pin still shows under "Saved on this pin".
 smoke:['FP-11','FPO-11','HFP-11','HFPO-11','OP921','OOT941','OOH941','FDO421','FDOT421','FDOOT441'],
 heat:['FPT-11','HFPT-11','FDT421'],
 duct:['FDBZ492','FDBZ492-HR','FDBZ492-R','FDBZ492-PR','AD2-P','AD2-PR'],
 pull:['MSI-10B','MSI-20B','HMS-S','HMS-D','HMS-M','XMS-51','XMS-52','XMS-M'],
 module:['TRI-S','TRI-D','TRI-R','HTRI-S','HTRI-D','HTRI-R','XTRI-S','XTRI-D','XTRI-M','XTRI-R','HLIM','SBGA-34'],
 relay:['TRI-S','TRI-D','TRI-R','HTRI-S','HTRI-D','HTRI-R','XTRI-S','XTRI-D','XTRI-M','XTRI-R','HLIM','SBGA-34'],
 horn:['SC-HS-WR-F','SC-HS-WW-F','SC-HN-WR-N','SC-HN-WW-N'],
 strobe:['SC-ST-WR-F','SC-ST-WW-F'],
 spkstrobe:['SC-SS-WW-F','SC-SS-CW-F','SC-SP-WW-F','SC-SP-CW-F','SL24XSPS-FW'],
 panel:['FireFinder XLS','MXL','FC2025','FC2050','FC922','FC924','FC901','FC2005']};
// bpm-v106: Siemens parts with a stored install sheet (INSTALL below); others via "Custom…"
Object.assign(MODELS,{speaker:['SC-SP-WW-F','SC-SP-CW-F','SC-SP-WR-F'],pad:['PAD5-6A','PAD5-6A-R','PAD5-9A','PAD5-9A-R','PAD-5-MB','PAD-5-CDC','PAD-5-CLSA'],
 multi:['OOH941','OOHC941','FDOOT441','FDOOTC441','FDOT421'],vnet:['VESDA-HLI-KIT','VPM'],farp:['FC2025','FC2050','FireFinder XLS'],pullbox:[],damper:[],ffphone:['FJ-303','FJ-303SS','FJ-304','FJ-304SS','MTE-2','PFT','PFT-P']});
let MODELS_C=null;async function customModels(){if(!MODELS_C)MODELS_C=(await get('meta','models:custom'))||{};return MODELS_C}
async function rememberModel(t,m){m=String(m||'').trim();if(!m||(MODELS[t]||[]).some(x=>x===m||x.endsWith(' '+m)))return;const c=await customModels();if((c[t]||[]).includes(m))return;c[t]=[...(c[t]||[]),m];await put('meta',c,'models:custom')}
async function modelOpts(t){const c=await customModels(),S=MODELS[t]||[],C=(c[t]||[]).filter(m=>!S.includes(m)),v=form.elements.model.value,sel=$('#dModelSel');
 const op=(m,l)=>`<option value="${esc(m)}"${m===v?' selected':''}>${esc(l||(MODEL_DESC[m]?m+' — '+MODEL_DESC[m]:m))}</option>`;
 sel.innerHTML=op('','— none —')+(S.length?`<optgroup label="Siemens">${S.map(m=>op(m)).join('')}</optgroup>`:'')+(C.length?`<optgroup label="My models">${C.map(m=>op(m)).join('')}</optgroup>`:'')+(v&&!S.includes(v)&&!C.includes(v)?`<optgroup label="Saved on this pin">${op(v)}</optgroup>`:'')+'<option value="__custom">Custom…</option>';
 $('#dModelCL').hidden=true;$('#dModelC').value='';if(typeof dsBtnSync==='function')dsBtnSync();return[...S,...C]}
$('#dModelSel').addEventListener('change',e=>{const c=e.target.value==='__custom';$('#dModelCL').hidden=!c;if(c){$('#dModelC').value='';form.elements.model.value='';$('#dModelC').focus()}else form.elements.model.value=e.target.value});
$('#dModelC').addEventListener('input',e=>{form.elements.model.value=e.target.value.trim()});
// Datasheet links: only URLs fetched and confirmed (v76). Anything else -> Siemens SID search.
const DS_SID='https://sid.siemens.com/v/u/',DS_KH='https://sid.siemens.com/api/khub/documents/',DS_AC='https://assets.new.siemens.com/siemens/assets/api/uuid:';
// bpm-v84: install instructions (English, with wiring; mounting sheets for enclosures/backboxes) mirrored in docs/ so they open in-app and offline. [local file, Siemens source]
const INSTALL={"ABHW-4B":["docs/h_7bfxwMh3nyPbzNa_K1HA.html","https://sid.siemens.com/r/A6V10405587"],"ABHW-4S":["docs/rh24N7YCmSAAXImdl7KBJg.html","https://sid.siemens.com/r/A6V10405588"],"ABHW-4SZ":["docs/3djAvFSqwpM6NO4UxcXK0Q.html","https://sid.siemens.com/r/A6V10806900"],"AC-ADPT":["docs/hmOta_Br1CF_23eTzX31_Q.pdf","https://sid.siemens.com/api/khub/documents/hmOta~Br1CF_23eTzX31_Q/content"],"AD-11P":["docs/resW1Mm0dxQANA9eglw6Ow.pdf","https://sid.siemens.com/api/khub/documents/resW1Mm0dxQANA9eglw6Ow/content"],"AD-HR":["docs/fnmKq7PYoBuO2yHJ7rTzxA.pdf","https://sid.siemens.com/api/khub/documents/fnmKq7PYoBuO2yHJ7rTzxA/content",{"cov":"FireFinder-XLS Control Panel Installation, Operation and Maintenance Manual","p":27}],"AD2-P":["docs/7RUUh1H0nje4wIHbIKKTDA.pdf","https://sid.siemens.com/api/khub/documents/7RUUh1H0nje4wIHbIKKTDA/content"],"AD2-PR":["docs/7RUUh1H0nje4wIHbIKKTDA.pdf","https://sid.siemens.com/api/khub/documents/7RUUh1H0nje4wIHbIKKTDA/content"],"ADBH-11":["docs/nGLyg8Dv_l7hz__Im3dasA.pdf","https://sid.siemens.com/api/khub/documents/nGLyg8Dv~l7hz~_Im3dasA/content"],"AIC":["docs/Y5anHjfmpTpKf_VwZ7s89w.html","https://sid.siemens.com/r/A6V10239138"],"ALCC":["docs/inSidbkkXNE54K8KC3Sc7A.html","https://sid.siemens.com/r/A6V10248630"],"AS-HMC-CR-WP":["docs/fB_YmSSTslE4u9fZ6j8hXQ.pdf","https://sid.siemens.com/api/khub/documents/fB_YmSSTslE4u9fZ6j8hXQ/content",{"cov":"AH / AS Horn and Horn Strobe Appliances, Data Sheet 2578","p":5}],"AS-HMC-CW-WP":["docs/fB_YmSSTslE4u9fZ6j8hXQ.pdf","https://sid.siemens.com/api/khub/documents/fB_YmSSTslE4u9fZ6j8hXQ/content",{"cov":"AH / AS Horn and Horn Strobe Appliances, Data Sheet 2578","p":5}],"AS-HMC-R-WP":["docs/fB_YmSSTslE4u9fZ6j8hXQ.pdf","https://sid.siemens.com/api/khub/documents/fB_YmSSTslE4u9fZ6j8hXQ/content",{"cov":"AH / AS Horn and Horn Strobe Appliances, Data Sheet 2578","p":5}],"AS-MC-R":["docs/asmc.pdf","https://parcelsfolder.portlandmaine.gov/Files/048/048%20%20D010/54%20Grant%20St/AS-MC%20P83947-007B.pdf"],"AS-MC-W":["docs/asmc.pdf","https://parcelsfolder.portlandmaine.gov/Files/048/048%20%20D010/54%20Grant%20St/AS-MC%20P83947-007B.pdf"],"BCM":["docs/66aflG7mRgvdkfZ38Qr_pA.html","https://sid.siemens.com/r/A6V10431793"],"CAB-100-BRKT":["docs/0VcLDzw4wWEE9XsxpyWyOw.pdf","https://sid.siemens.com/api/khub/documents/0VcLDzw4wWEE9XsxpyWyOw/content"],"CAB-55-BRKT":["docs/0VcLDzw4wWEE9XsxpyWyOw.pdf","https://sid.siemens.com/api/khub/documents/0VcLDzw4wWEE9XsxpyWyOw/content"],"CAB-BATT":["docs/0VcLDzw4wWEE9XsxpyWyOw.pdf","https://sid.siemens.com/api/khub/documents/0VcLDzw4wWEE9XsxpyWyOw/content"],"CAB-BATT-R":["docs/XgD23qwmwVwvddavGApIsw.pdf","https://sid.siemens.com/api/khub/documents/XgD23qwmwVwvddavGApIsw/content"],"CAB-MP":["docs/7czfOdooMLUQKKW5wgvyyQ.pdf","https://sid.siemens.com/api/khub/documents/7czfOdooMLUQKKW5wgvyyQ/content"],"CAB1":["docs/x8jjMYn3JCipOxWnMq7ZEQ.pdf","https://sid.siemens.com/api/khub/documents/x8jjMYn3JCipOxWnMq7ZEQ/content"],"CAB1-TK":["docs/EtQT8_2YBIVNMfGafC0Fag.pdf","https://sid.siemens.com/api/khub/documents/EtQT8~2YBIVNMfGafC0Fag/content"],"CAB1R":["docs/x8jjMYn3JCipOxWnMq7ZEQ.pdf","https://sid.siemens.com/api/khub/documents/x8jjMYn3JCipOxWnMq7ZEQ/content"],"CAB1R-TK":["docs/EtQT8_2YBIVNMfGafC0Fag.pdf","https://sid.siemens.com/api/khub/documents/EtQT8~2YBIVNMfGafC0Fag/content"],"CAB2-BB":["docs/AmBGsxvZWZp1YLEHOdH3lg.pdf","https://sid.siemens.com/api/khub/documents/AmBGsxvZWZp1YLEHOdH3lg/content"],"CAB2-BD":["docs/bzlV3tznrxW_dQqsdm6ZOg.pdf","https://sid.siemens.com/api/khub/documents/bzlV3tznrxW~dQqsdm6ZOg/content"],"CAB2-RB":["docs/AmBGsxvZWZp1YLEHOdH3lg.pdf","https://sid.siemens.com/api/khub/documents/AmBGsxvZWZp1YLEHOdH3lg/content"],"CAB2-RD":["docs/bzlV3tznrxW_dQqsdm6ZOg.pdf","https://sid.siemens.com/api/khub/documents/bzlV3tznrxW~dQqsdm6ZOg/content"],"CAB2-TK":["docs/EtQT8_2YBIVNMfGafC0Fag.pdf","https://sid.siemens.com/api/khub/documents/EtQT8~2YBIVNMfGafC0Fag/content"],"CAB2-X":["docs/3gWzGdVzEFFPSFflTNcg6g.pdf","https://sid.siemens.com/api/khub/documents/3gWzGdVzEFFPSFflTNcg6g/content",{"cov":"Desigo Fire Safety Modular system overview, Data Sheet","p":8}],"CAB2-XBD":["docs/sZBjeUiLy_cDLOi5tpSfvg.pdf","https://sid.siemens.com/api/khub/documents/sZBjeUiLy_cDLOi5tpSfvg/content"],"CAB2-XRD":["docs/sZBjeUiLy_cDLOi5tpSfvg.pdf","https://sid.siemens.com/api/khub/documents/sZBjeUiLy_cDLOi5tpSfvg/content"],"CAB2R-TK":["docs/EtQT8_2YBIVNMfGafC0Fag.pdf","https://sid.siemens.com/api/khub/documents/EtQT8~2YBIVNMfGafC0Fag/content"],"CAB3-BB":["docs/AmBGsxvZWZp1YLEHOdH3lg.pdf","https://sid.siemens.com/api/khub/documents/AmBGsxvZWZp1YLEHOdH3lg/content"],"CAB3-BD":["docs/bzlV3tznrxW_dQqsdm6ZOg.pdf","https://sid.siemens.com/api/khub/documents/bzlV3tznrxW~dQqsdm6ZOg/content"],"CAB3-RB":["docs/AmBGsxvZWZp1YLEHOdH3lg.pdf","https://sid.siemens.com/api/khub/documents/AmBGsxvZWZp1YLEHOdH3lg/content"],"CAB3-RD":["docs/bzlV3tznrxW_dQqsdm6ZOg.pdf","https://sid.siemens.com/api/khub/documents/bzlV3tznrxW~dQqsdm6ZOg/content"],"CAB3-TK":["docs/EtQT8_2YBIVNMfGafC0Fag.pdf","https://sid.siemens.com/api/khub/documents/EtQT8~2YBIVNMfGafC0Fag/content"],"CAB3-X":["docs/3gWzGdVzEFFPSFflTNcg6g.pdf","https://sid.siemens.com/api/khub/documents/3gWzGdVzEFFPSFflTNcg6g/content",{"cov":"Desigo Fire Safety Modular system overview, Data Sheet","p":8}],"CAB3-XBD":["docs/sZBjeUiLy_cDLOi5tpSfvg.pdf","https://sid.siemens.com/api/khub/documents/sZBjeUiLy_cDLOi5tpSfvg/content"],"CAB3-XRD":["docs/sZBjeUiLy_cDLOi5tpSfvg.pdf","https://sid.siemens.com/api/khub/documents/sZBjeUiLy_cDLOi5tpSfvg/content"],"CAB3R-TK":["docs/EtQT8_2YBIVNMfGafC0Fag.pdf","https://sid.siemens.com/api/khub/documents/EtQT8~2YBIVNMfGafC0Fag/content"],"CC-2":["docs/HQuoNUqMgBIOnpv4z2OR_g.pdf","https://sid.siemens.com/api/khub/documents/HQuoNUqMgBIOnpv4z2OR~g/content"],"CC-5":["docs/HQuoNUqMgBIOnpv4z2OR_g.pdf","https://sid.siemens.com/api/khub/documents/HQuoNUqMgBIOnpv4z2OR~g/content"],"CCL":["docs/HQuoNUqMgBIOnpv4z2OR_g.pdf","https://sid.siemens.com/api/khub/documents/HQuoNUqMgBIOnpv4z2OR~g/content",{"cov":"CC-5 / CC-2 System Cardcage, Installation Instructions","p":6}],"CDC-4":["docs/tDVggeir8kqMtHhJzqJ1Hg.html","https://sid.siemens.com/r/A6V10239127"],"COM-BRK":["docs/14hMvAYFE1rV05Y5L5pf9Q.html","https://sid.siemens.com/r/A6V10406085"],"CRC-6":["docs/XYniFL8ybDsAI_5brEY3gQ.html","https://sid.siemens.com/r/A6V10239114"],"CSB":["docs/fVjdUyd_o6_4vy50u4K_KQ.pdf","https://sid.siemens.com/api/khub/documents/fVjdUyd~o6_4vy50u4K_KQ/content"],"DAC-NET":["docs/Q0Ry4foSZ3cBf_Z2R5GrRg.pdf","https://sid.siemens.com/api/khub/documents/Q0Ry4foSZ3cBf~Z2R5GrRg/content"],"DB-11":["docs/8vAhv9X8MFLkIpWy7WHEkg.html","https://sid.siemens.com/r/A6V10323391"],"DB-11E":["docs/8vAhv9X8MFLkIpWy7WHEkg.html","https://sid.siemens.com/r/A6V10323391"],"DB-HR":["docs/pZ1qSWFHB5SbwT_unJWZDg.pdf","https://sid.siemens.com/api/khub/documents/pZ1qSWFHB5SbwT~unJWZDg/content"],"DB-X11RS":["docs/sjkrRx9r14JLQfuLEfJpkg.pdf","https://sid.siemens.com/api/khub/documents/sjkrRx9r14JLQfuLEfJpkg/content"],"DBBS":["docs/Uj9Gpr68fRc7Fi32l_oQsg.pdf","https://sid.siemens.com/api/khub/documents/Uj9Gpr68fRc7Fi32l_oQsg/content",{"cov":"Mounting Options for Notification Appliances, Data Sheet 2585","p":4}],"DFM":["docs/rHxDTWFi01qQOrSU67I8gw.html","https://sid.siemens.com/r/A6V10239120"],"DFM-BRK":["docs/rHxDTWFi01qQOrSU67I8gw.html","https://sid.siemens.com/r/A6V10239120"],"DPU":["docs/Y9Asyh2BGjSx_peGTg0Phw.html","https://sid.siemens.com/r/A6V10276604",{"cov":"Device Programming Unit (DPU) User Guide"}],"EBA2004-A1":["docs/dDmMGfd5ma7Nlemutr8Qyw.pdf","https://sid.siemens.com/api/khub/documents/dDmMGfd5ma7Nlemutr8Qyw/content"],"ENCL-01":["docs/jlzuFX5tQ3kATDMXS92Tww.pdf","https://sid.siemens.com/api/khub/documents/jlzuFX5tQ3kATDMXS92Tww/content"],"FB-300":["docs/AbgOybIbgTyYmBas53tjVQ.html","https://sid.siemens.com/r/A6V10308803"],"FB-301S":["docs/AbgOybIbgTyYmBas53tjVQ.html","https://sid.siemens.com/r/A6V10308803"],"FC-300S":["docs/AbgOybIbgTyYmBas53tjVQ.html","https://sid.siemens.com/r/A6V10308803"],"FC2005":["docs/b_f5hDsoePxHThENYu1QBw.pdf","https://sid.siemens.com/api/khub/documents/b~f5hDsoePxHThENYu1QBw/content"],"FC2025":["docs/rzBs_XcwbHW281Tn8jZbaA.pdf","https://sid.siemens.com/api/khub/documents/rzBs_XcwbHW281Tn8jZbaA/content"],"FC2050":["docs/rzBs_XcwbHW281Tn8jZbaA.pdf","https://sid.siemens.com/api/khub/documents/rzBs_XcwbHW281Tn8jZbaA/content"],"FC901":["docs/b_f5hDsoePxHThENYu1QBw.pdf","https://sid.siemens.com/api/khub/documents/b~f5hDsoePxHThENYu1QBw/content"],"FC922":["docs/yhkbr5vUYxCO0_zS8htYgQ.pdf","https://sid.siemens.com/api/khub/documents/yhkbr5vUYxCO0~zS8htYgQ/content"],"FC924":["docs/yhkbr5vUYxCO0_zS8htYgQ.pdf","https://sid.siemens.com/api/khub/documents/yhkbr5vUYxCO0~zS8htYgQ/content"],"FCA2015-U1":["docs/Kccde2WetBqi0AtmsNESqQ.html","https://sid.siemens.com/r/A6V10334254"],"FCM-6":["docs/8pcsNgifNhvpX9EeY596sA.html","https://sid.siemens.com/r/A6V10239103"],"FCM2041-U2":["docs/GoamzOYNk30lOJTrdQYsHA.pdf","https://sid.siemens.com/api/khub/documents/GoamzOYNk30lOJTrdQYsHA/content"],"FDBZ492":["docs/YqqdzjYkUue8NZa_cCl_BQ.pdf","https://sid.siemens.com/api/khub/documents/YqqdzjYkUue8NZa_cCl~BQ/content"],"FDBZ492-HR":["docs/YqqdzjYkUue8NZa_cCl_BQ.pdf","https://sid.siemens.com/api/khub/documents/YqqdzjYkUue8NZa_cCl~BQ/content"],"FDBZ492-PR":["docs/smKkmSUK7Y7KRmQh0bdrEQ.pdf","https://sid.siemens.com/api/khub/documents/smKkmSUK7Y7KRmQh0bdrEQ/content"],"FDBZ492-R":["docs/YqqdzjYkUue8NZa_cCl_BQ.pdf","https://sid.siemens.com/api/khub/documents/YqqdzjYkUue8NZa_cCl~BQ/content"],"FDCIO422":["docs/YRXYskbZ5PGKiFAkcM9MHg.html","https://sid.siemens.com/r/A6V10324662"],"FDO421":["docs/Ebwr1nF3jtaCyXQmac4yog.pdf","https://sid.siemens.com/api/khub/documents/Ebwr1nF3jtaCyXQmac4yog/content"],"FDOOT441":["docs/statWx0H1lyHNWFm9Hn0Rw.pdf","https://sid.siemens.com/api/khub/documents/statWx0H1lyHNWFm9Hn0Rw/content"],"FDOOTC441":["docs/vzCSoFtYNoQUxIY6Z_UCiw.pdf","https://sid.siemens.com/api/khub/documents/vzCSoFtYNoQUxIY6Z_UCiw/content"],"FDOT421":["docs/9PvLoRhefmFb2UQKUQyXDw.pdf","https://sid.siemens.com/api/khub/documents/9PvLoRhefmFb2UQKUQyXDw/content"],"FDT421":["docs/ZtGvN_uDYM4pvYgJQuYnyg.pdf","https://sid.siemens.com/api/khub/documents/ZtGvN~uDYM4pvYgJQuYnyg/content"],"FHA2043-R1":["docs/y4_dgJkuQjj3nns98C0y0Q.pdf","https://sid.siemens.com/api/khub/documents/y4~dgJkuQjj3nns98C0y0Q/content"],"FJ-303":["docs/XgWCN1Q11NP_rAu0G_VaGg.pdf","https://sid.siemens.com/api/khub/documents/XgWCN1Q11NP~rAu0G_VaGg/content"],"FJ-303SS":["docs/XgWCN1Q11NP_rAu0G_VaGg.pdf","https://sid.siemens.com/api/khub/documents/XgWCN1Q11NP~rAu0G_VaGg/content"],"FJ-304":["docs/Q8G2vfjToSXJhmLpAVPTmw.pdf","https://sid.siemens.com/api/khub/documents/Q8G2vfjToSXJhmLpAVPTmw/content"],"FJ-304SS":["docs/Q8G2vfjToSXJhmLpAVPTmw.pdf","https://sid.siemens.com/api/khub/documents/Q8G2vfjToSXJhmLpAVPTmw/content"],"FMT":["docs/n7Wco5LRa4g10_gfmsK_Mw.html","https://sid.siemens.com/r/A6V10239123"],"FMT-A-ADPT":["docs/Pgt_4Z8gy2jEz8Gc2TbsTg.html","https://sid.siemens.com/r/A6V10333236"],"FN2006-U1":["docs/f8M6j6RsWUefAA0KOtFkyw.pdf","https://sid.siemens.com/api/khub/documents/f8M6j6RsWUefAA0KOtFkyw/content"],"FN2007-U1":["docs/f8M6j6RsWUefAA0KOtFkyw.pdf","https://sid.siemens.com/api/khub/documents/f8M6j6RsWUefAA0KOtFkyw/content"],"FN2012-A1":["docs/W_7Mero1of3jzjlgw6QFTA.pdf","https://sid.siemens.com/api/khub/documents/W_7Mero1of3jzjlgw6QFTA/content"],"FN2013-U1":["docs/JgYZL2EQEgbT8zAxLlMcuQ.pdf","https://sid.siemens.com/api/khub/documents/JgYZL2EQEgbT8zAxLlMcuQ/content"],"FN2014-U1":["docs/JgYZL2EQEgbT8zAxLlMcuQ.pdf","https://sid.siemens.com/api/khub/documents/JgYZL2EQEgbT8zAxLlMcuQ/content"],"FN2016-U1":["docs/fVfsaDJMBc37jhU_HHUiag.html","https://sid.siemens.com/r/A6V13300924"],"FN2017-U1":["docs/Dzy_pmZakLi7_CstaoBkZQ.pdf","https://sid.siemens.com/api/khub/documents/Dzy~pmZakLi7~CstaoBkZQ/content"],"FN2018-U1":["docs/Dzy_pmZakLi7_CstaoBkZQ.pdf","https://sid.siemens.com/api/khub/documents/Dzy~pmZakLi7~CstaoBkZQ/content"],"FP-11":["docs/fr1lBCYYKMDMH4brAhtU4Q.pdf","https://sid.siemens.com/api/khub/documents/fr1lBCYYKMDMH4brAhtU4Q/content"],"FPT-11":["docs/fr1lBCYYKMDMH4brAhtU4Q.pdf","https://sid.siemens.com/api/khub/documents/fr1lBCYYKMDMH4brAhtU4Q/content"],"FT-GLS":["docs/t8p_tEhB3zs9JQPudepQew.pdf","https://sid.siemens.com/api/khub/documents/t8p_tEhB3zs9JQPudepQew/content"],"FTS":["docs/lwPyzPoy6nj9RF8Bqs75xw.pdf","https://sid.siemens.com/api/khub/documents/lwPyzPoy6nj9RF8Bqs75xw/content"],"FTS-C":["docs/gVGS1GhPyDUTRxY3gFz66Q.html","https://sid.siemens.com/r/A6V10239290"],"FTS-CL":["docs/gVGS1GhPyDUTRxY3gFz66Q.html","https://sid.siemens.com/r/A6V10239290"],"FTS-P":["docs/gVGS1GhPyDUTRxY3gFz66Q.html","https://sid.siemens.com/r/A6V10239290"],"FTS-PCL":["docs/gVGS1GhPyDUTRxY3gFz66Q.html","https://sid.siemens.com/r/A6V10239290"],"FireFinder XLS":["docs/fnmKq7PYoBuO2yHJ7rTzxA.pdf","https://sid.siemens.com/api/khub/documents/fnmKq7PYoBuO2yHJ7rTzxA/content"],"GPMI-3":["docs/3gWzGdVzEFFPSFflTNcg6g.pdf","https://sid.siemens.com/api/khub/documents/3gWzGdVzEFFPSFflTNcg6g/content",{"cov":"Desigo Fire Safety Modular system overview, Data Sheet","p":12}],"GPMI-HW-KEY":["docs/3gWzGdVzEFFPSFflTNcg6g.pdf","https://sid.siemens.com/api/khub/documents/3gWzGdVzEFFPSFflTNcg6g/content",{"cov":"Desigo Fire Safety Modular system overview, Data Sheet","p":12}],"HCP":["docs/np5V1RORxjmefAsV9Md07Q.pdf","https://sid.siemens.com/api/khub/documents/np5V1RORxjmefAsV9Md07Q/content"],"HFP-11":["docs/FUZ_rKuqUhOyftNpw_qFNg.pdf","https://sid.siemens.com/api/khub/documents/FUZ~rKuqUhOyftNpw_qFNg/content"],"HFPO-11":["docs/oqPqxj46BMk2yV1wD5Bxfg.pdf","https://sid.siemens.com/api/khub/documents/oqPqxj46BMk2yV1wD5Bxfg/content"],"HFPT-11":["docs/FUZ_rKuqUhOyftNpw_qFNg.pdf","https://sid.siemens.com/api/khub/documents/FUZ~rKuqUhOyftNpw_qFNg/content"],"HI921":["docs/SnJCljUOuAQDAk6_4Kp2Jg.html","https://sid.siemens.com/r/A6V10323932"],"HLIM":["docs/bqMFpBeDmRQpiePFV9V1_g.pdf","https://sid.siemens.com/api/khub/documents/bqMFpBeDmRQpiePFV9V1~g/content"],"HMS-2S":["docs/tsLNu_O9hufODJLyCgpuFg.pdf","https://sid.siemens.com/api/khub/documents/tsLNu~O9hufODJLyCgpuFg/content"],"HMS-D":["docs/BxfYH1zhimXwlZktfpZdyQ.pdf","https://sid.siemens.com/api/khub/documents/BxfYH1zhimXwlZktfpZdyQ/content"],"HMS-M":["docs/WVa0vJzVaHHJ7793T5gqbg.pdf","https://sid.siemens.com/api/khub/documents/WVa0vJzVaHHJ7793T5gqbg/content"],"HMS-S":["docs/BxfYH1zhimXwlZktfpZdyQ.pdf","https://sid.siemens.com/api/khub/documents/BxfYH1zhimXwlZktfpZdyQ/content"],"HMS-SA":["docs/tsLNu_O9hufODJLyCgpuFg.pdf","https://sid.siemens.com/api/khub/documents/tsLNu~O9hufODJLyCgpuFg/content"],"HMSFD":["docs/fnmKq7PYoBuO2yHJ7rTzxA.pdf","https://sid.siemens.com/api/khub/documents/fnmKq7PYoBuO2yHJ7rTzxA/content",{"cov":"FireFinder-XLS Control Panel Installation, Operation and Maintenance Manual","p":28}],"HS-HMC-R":["docs/xT12dkdCvpVUJLJw5Wmfqg.pdf","https://sid.siemens.com/api/khub/documents/xT12dkdCvpVUJLJw5Wmfqg/content",{"cov":"HS Horn and Horn Strobe Notification Appliances, Data Sheet","p":3}],"HS-MC-R":["docs/xT12dkdCvpVUJLJw5Wmfqg.pdf","https://sid.siemens.com/api/khub/documents/xT12dkdCvpVUJLJw5Wmfqg/content",{"cov":"HS Horn and Horn Strobe Notification Appliances, Data Sheet","p":3}],"HS-MC-W":["docs/xT12dkdCvpVUJLJw5Wmfqg.pdf","https://sid.siemens.com/api/khub/documents/xT12dkdCvpVUJLJw5Wmfqg/content",{"cov":"HS Horn and Horn Strobe Notification Appliances, Data Sheet","p":3}],"HTRI-D":["docs/tLkjWFZ2q_O85lSXW_Wstg.pdf","https://sid.siemens.com/api/khub/documents/tLkjWFZ2q~O85lSXW~Wstg/content"],"HTRI-DZ":["docs/DP2K07xOmk1unqxaCVhBNA.pdf","https://sid.siemens.com/api/khub/documents/DP2K07xOmk1unqxaCVhBNA/content"],"HTRI-R":["docs/tLkjWFZ2q_O85lSXW_Wstg.pdf","https://sid.siemens.com/api/khub/documents/tLkjWFZ2q~O85lSXW~Wstg/content"],"HTRI-RZ":["docs/DP2K07xOmk1unqxaCVhBNA.pdf","https://sid.siemens.com/api/khub/documents/DP2K07xOmk1unqxaCVhBNA/content"],"HTRI-S":["docs/tLkjWFZ2q_O85lSXW_Wstg.pdf","https://sid.siemens.com/api/khub/documents/tLkjWFZ2q~O85lSXW~Wstg/content"],"HTRI-SZ":["docs/DP2K07xOmk1unqxaCVhBNA.pdf","https://sid.siemens.com/api/khub/documents/DP2K07xOmk1unqxaCVhBNA/content"],"HZM":["docs/aXLrwo2t1jK6_QyCjsF1QQ.html","https://sid.siemens.com/r/A6V10233195"],"ID-MP":["docs/j12GW_2u_Ygi3ldun2hQCA.html","https://sid.siemens.com/r/A6V10320981"],"ID-SP":["docs/j12GW_2u_Ygi3ldun2hQCA.html","https://sid.siemens.com/r/A6V10320981"],"IIC":["docs/lli3OfNv0ojCWt5f9bRPqQ.pdf","https://sid.siemens.com/api/khub/documents/lli3OfNv0ojCWt5f9bRPqQ/content"],"ILED-XC":["docs/CmuBbkaA4xpDpOqehGCbJg.html","https://sid.siemens.com/r/A6V101055484"],"ILED-XW":["docs/CmuBbkaA4xpDpOqehGCbJg.html","https://sid.siemens.com/r/A6V101055484"],"K-CBL":["docs/JwGVFOaDJrbdwfl8eBzy5A.pdf","https://sid.siemens.com/api/khub/documents/JwGVFOaDJrbdwfl8eBzy5A/content"],"LCM-8":["docs/8pcsNgifNhvpX9EeY596sA.html","https://sid.siemens.com/r/A6V10239103"],"LDC":["docs/9CgjKPkEZ2GwXsGfBwzQ4A.html","https://sid.siemens.com/r/A6V12198164"],"LPB":["docs/LW2CIKIpoOWnLyDQ_gyOkQ.html","https://sid.siemens.com/r/A6V10372609"],"LVM":["docs/MCFZ_HLRde2jgjJmaEPrvw.html","https://sid.siemens.com/r/A6V10239122"],"MBR-2":["docs/6wriW9lgBNI_4fDjCALDTw.pdf","https://sid.siemens.com/api/khub/documents/6wriW9lgBNI~4fDjCALDTw/content"],"MBR-2R":["docs/6wriW9lgBNI_4fDjCALDTw.pdf","https://sid.siemens.com/api/khub/documents/6wriW9lgBNI~4fDjCALDTw/content"],"MLC":["docs/uCqx71clOF_MxdJnfvqBcw.html","https://sid.siemens.com/r/A6V10328217"],"MLE-6":["docs/3KuXIvcBZVlAD2Hc_U2Wfw.pdf","https://sid.siemens.com/api/khub/documents/3KuXIvcBZVlAD2Hc_U2Wfw/content"],"MLE-6R":["docs/3KuXIvcBZVlAD2Hc_U2Wfw.pdf","https://sid.siemens.com/api/khub/documents/3KuXIvcBZVlAD2Hc_U2Wfw/content"],"MME-3":["docs/bfSh_cqHcWrh6Za6GyRqJw.pdf","https://sid.siemens.com/api/khub/documents/bfSh_cqHcWrh6Za6GyRqJw/content"],"MME-3R":["docs/bfSh_cqHcWrh6Za6GyRqJw.pdf","https://sid.siemens.com/api/khub/documents/bfSh_cqHcWrh6Za6GyRqJw/content"],"MOM2-XMP":["docs/8glSNgawWix5roEcC_S6GA.pdf","https://sid.siemens.com/api/khub/documents/8glSNgawWix5roEcC_S6GA/content"],"MSE-2":["docs/7CCQ1qr2O67A_V4qdNRC8g.pdf","https://sid.siemens.com/api/khub/documents/7CCQ1qr2O67A~V4qdNRC8g/content",{"cov":"XLS-MSE2(R)-ADPT Adapter Kit, Installation Instructions","p":1}],"MSE-2R":["docs/7CCQ1qr2O67A_V4qdNRC8g.pdf","https://sid.siemens.com/api/khub/documents/7CCQ1qr2O67A~V4qdNRC8g/content",{"cov":"XLS-MSE2(R)-ADPT Adapter Kit, Installation Instructions","p":1}],"MSE-3":["docs/ZaHyq77583QB9LWNgC_Zog.pdf","https://sid.siemens.com/api/khub/documents/ZaHyq77583QB9LWNgC_Zog/content",{"cov":"XLS-MSE3(R)-ADPT Adapter Kit, Installation Instructions","p":1}],"MSE-3L":["docs/0rURXT_PSjS5AOVYD63jDQ.pdf","https://sid.siemens.com/api/khub/documents/0rURXT_PSjS5AOVYD63jDQ/content",{"cov":"MXL-IQ Control Panel Operation, Installation, and Maintenance Manual","p":32}],"MSE-3LR":["docs/ZaHyq77583QB9LWNgC_Zog.pdf","https://sid.siemens.com/api/khub/documents/ZaHyq77583QB9LWNgC_Zog/content",{"cov":"XLS-MSE3(R)-ADPT Adapter Kit, Installation Instructions","p":1}],"MSE-3M":["docs/ZaHyq77583QB9LWNgC_Zog.pdf","https://sid.siemens.com/api/khub/documents/ZaHyq77583QB9LWNgC_Zog/content",{"cov":"XLS-MSE3(R)-ADPT Adapter Kit, Installation Instructions","p":1}],"MSE-3MR":["docs/ZaHyq77583QB9LWNgC_Zog.pdf","https://sid.siemens.com/api/khub/documents/ZaHyq77583QB9LWNgC_Zog/content",{"cov":"XLS-MSE3(R)-ADPT Adapter Kit, Installation Instructions","p":1}],"MSE-3R":["docs/ZaHyq77583QB9LWNgC_Zog.pdf","https://sid.siemens.com/api/khub/documents/ZaHyq77583QB9LWNgC_Zog/content",{"cov":"XLS-MSE3(R)-ADPT Adapter Kit, Installation Instructions","p":1}],"MSI-10B":["docs/YQ3w7pVD6bTLgFWKQfwfWg.pdf","https://sid.siemens.com/api/khub/documents/YQ3w7pVD6bTLgFWKQfwfWg/content"],"MSI-20B":["docs/YQ3w7pVD6bTLgFWKQfwfWg.pdf","https://sid.siemens.com/api/khub/documents/YQ3w7pVD6bTLgFWKQfwfWg/content"],"MT-SUR-BOX-W":["docs/Uj9Gpr68fRc7Fi32l_oQsg.pdf","https://sid.siemens.com/api/khub/documents/Uj9Gpr68fRc7Fi32l_oQsg/content",{"cov":"Mounting Options for Notification Appliances, Data Sheet 2585","p":4}],"MTE-2":["docs/WvIYrV6zlfUsgVdjeYPWaA.pdf","https://sid.siemens.com/api/khub/documents/WvIYrV6zlfUsgVdjeYPWaA/content"],"MTH-HMC-CR-WP":["docs/gZME4S8vX4keCjU9I_jO9w.pdf","https://sid.siemens.com/api/khub/documents/gZME4S8vX4keCjU9I_jO9w/content",{"cov":"MTH Multi-tone Horn and Horn / Strobe Appliances, Data Sheet","p":4}],"MXL":["docs/0rURXT_PSjS5AOVYD63jDQ.pdf","https://sid.siemens.com/api/khub/documents/0rURXT_PSjS5AOVYD63jDQ/content"],"NIC-C":["docs/ntkfpxZyDbj4PmPnFSHzJA.pdf","https://sid.siemens.com/api/khub/documents/ntkfpxZyDbj4PmPnFSHzJA/content"],"NRC":["docs/eNNtc7hoV9lC5Y1JOpX9pA.html","https://sid.siemens.com/r/A6V10322639"],"OCM-16":["docs/d8iw1m3JIMqKe_96Y_ZyLQ.pdf","https://sid.siemens.com/api/khub/documents/d8iw1m3JIMqKe_96Y~ZyLQ/content"],"OD-BP":["docs/_8jbSr1BGX7nWeMX4QHIzg.pdf","https://sid.siemens.com/api/khub/documents/_8jbSr1BGX7nWeMX4QHIzg/content"],"OD-BP-R":["docs/_8jbSr1BGX7nWeMX4QHIzg.pdf","https://sid.siemens.com/api/khub/documents/_8jbSr1BGX7nWeMX4QHIzg/content"],"OD-GP":["docs/_8jbSr1BGX7nWeMX4QHIzg.pdf","https://sid.siemens.com/api/khub/documents/_8jbSr1BGX7nWeMX4QHIzg/content"],"OD-GP-R":["docs/_8jbSr1BGX7nWeMX4QHIzg.pdf","https://sid.siemens.com/api/khub/documents/_8jbSr1BGX7nWeMX4QHIzg/content"],"OD-LP":["docs/bzlV3tznrxW_dQqsdm6ZOg.pdf","https://sid.siemens.com/api/khub/documents/bzlV3tznrxW~dQqsdm6ZOg/content"],"OH921":["docs/tWXh9B_AwOPeBxPjGU5AHg.html","https://sid.siemens.com/r/A6V10323936"],"OOH941":["docs/nWUDrVFUM_xFElz7qGoXHA.html","https://sid.siemens.com/r/A6V10324659"],"OOHC941":["docs/anfa36cFxwvXlRnbwmsy7g.pdf","https://sid.siemens.com/api/khub/documents/anfa36cFxwvXlRnbwmsy7g/content"],"OP921":["docs/FwPA7t_tDtFLf8H9bDz75g.pdf","https://sid.siemens.com/api/khub/documents/FwPA7t_tDtFLf8H9bDz75g/content"],"PAD-5-CDC":["docs/wBw9h2WTYS8y6Jr_Ink5IA.html","https://sid.siemens.com/r/A6V101030366"],"PAD-5-CLSA":["docs/fny6UXbBPk54ShkOVrTToQ.html","https://sid.siemens.com/r/A6V101030359"],"PAD-5-MB":["docs/z4MU1RQgIEU_3_03RdT0aw.html","https://sid.siemens.com/r/A6V101030358"],"PAD5-6A":["docs/z4MU1RQgIEU_3_03RdT0aw.html","https://sid.siemens.com/r/A6V101030358"],"PAD5-6A-R":["docs/z4MU1RQgIEU_3_03RdT0aw.html","https://sid.siemens.com/r/A6V101030358"],"PAD5-9A":["docs/z4MU1RQgIEU_3_03RdT0aw.html","https://sid.siemens.com/r/A6V101030358"],"PAD5-9A-R":["docs/z4MU1RQgIEU_3_03RdT0aw.html","https://sid.siemens.com/r/A6V101030358"],"PFT":["docs/icRh4ANWT_RMaa9WvP9fPQ.pdf","https://sid.siemens.com/api/khub/documents/icRh4ANWT~RMaa9WvP9fPQ/content"],"PFT-P":["docs/icRh4ANWT_RMaa9WvP9fPQ.pdf","https://sid.siemens.com/api/khub/documents/icRh4ANWT~RMaa9WvP9fPQ/content"],"PMI-1 UPLD-CBL":["docs/fThMXGAgrPL4IOpLJXI36g.html","https://sid.siemens.com/r/A6V10525432"],"PS-5A":["docs/Pf4qDzsB3XpoBobpdywy9g.pdf","https://sid.siemens.com/api/khub/documents/Pf4qDzsB3XpoBobpdywy9g/content"],"PSC-12":["docs/P9mZCe2CAuHyE_lsSuf_ow.pdf","https://sid.siemens.com/api/khub/documents/P9mZCe2CAuHyE_lsSuf~ow/content"],"PSC-12M":["docs/_JVYXGoSDycovXWFmwWe4w.html","https://sid.siemens.com/r/A6V12021370"],"PSC-ISO-CBL":["docs/UrwGQM4swhIJEGr59uY2Kg.pdf","https://sid.siemens.com/api/khub/documents/UrwGQM4swhIJEGr59uY2Kg/content"],"PSFA":["docs/PxEws9rom2UZ_5sfBNGGJA.html","https://sid.siemens.com/r/A6V12057961"],"PSX-12":["docs/VvXfHgbijCnFWnckJt8_ZA.pdf","https://sid.siemens.com/api/khub/documents/VvXfHgbijCnFWnckJt8~ZA/content"],"PSX-12M":["docs/6Q_Fsyze_G2U1ilgyFUWgg.html","https://sid.siemens.com/r/A6V12021371"],"RCC-1":["docs/Gqz06DTFCcFzHHr459hroQ.pdf","https://sid.siemens.com/api/khub/documents/Gqz06DTFCcFzHHr459hroQ/content"],"RCC-1F":["docs/Gqz06DTFCcFzHHr459hroQ.pdf","https://sid.siemens.com/api/khub/documents/Gqz06DTFCcFzHHr459hroQ/content"],"RCC-1FR":["docs/fnmKq7PYoBuO2yHJ7rTzxA.pdf","https://sid.siemens.com/api/khub/documents/fnmKq7PYoBuO2yHJ7rTzxA/content",{"cov":"FireFinder-XLS Control Panel Installation, Operation and Maintenance Manual","p":32}],"RCC-3F":["docs/y6jGxxkOIdleTWk1LhFubg.pdf","https://sid.siemens.com/api/khub/documents/y6jGxxkOIdleTWk1LhFubg/content"],"RCC-3FR":["docs/y6jGxxkOIdleTWk1LhFubg.pdf","https://sid.siemens.com/api/khub/documents/y6jGxxkOIdleTWk1LhFubg/content"],"REMBOX2":["docs/j12GW_2u_Ygi3ldun2hQCA.html","https://sid.siemens.com/r/A6V10320981"],"REMBOX2-MP":["docs/e6qSmijpdHL0wjwCXtG_JA.html","https://sid.siemens.com/r/A6V10315220"],"REMBOX2R":["docs/j12GW_2u_Ygi3ldun2hQCA.html","https://sid.siemens.com/r/A6V10320981"],"REMBOX4":["docs/j12GW_2u_Ygi3ldun2hQCA.html","https://sid.siemens.com/r/A6V10320981"],"REMBOX4-MP":["docs/e6qSmijpdHL0wjwCXtG_JA.html","https://sid.siemens.com/r/A6V10315220"],"REMBOX4R":["docs/j12GW_2u_Ygi3ldun2hQCA.html","https://sid.siemens.com/r/A6V10320981"],"RL-HC":["docs/IYu3tLPxzE2H8LCSLOBgmw.html","https://sid.siemens.com/r/A6V10233192"],"RL-HW":["docs/IYu3tLPxzE2H8LCSLOBgmw.html","https://sid.siemens.com/r/A6V10233192"],"RNI":["docs/zuCaAByzmyaApIItpvikag.pdf","https://sid.siemens.com/api/khub/documents/zuCaAByzmyaApIItpvikag/content"],"RPM":["docs/v5B0We02XAExZSX04iCtzg.pdf","https://sid.siemens.com/api/khub/documents/v5B0We02XAExZSX04iCtzg/content"],"RPR-1":["docs/eQ__uy9ZnS_5fExFX3CTtg.pdf","https://sid.siemens.com/api/khub/documents/eQ__uy9ZnS_5fExFX3CTtg/content"],"SB-5R":["docs/BxfYH1zhimXwlZktfpZdyQ.pdf","https://sid.siemens.com/api/khub/documents/BxfYH1zhimXwlZktfpZdyQ/content",{"cov":"HMS-S / HMS-D Manual Pull Station, Installation Instructions","p":2}],"SBBS":["docs/Uj9Gpr68fRc7Fi32l_oQsg.pdf","https://sid.siemens.com/api/khub/documents/Uj9Gpr68fRc7Fi32l_oQsg/content",{"cov":"Mounting Options for Notification Appliances, Data Sheet 2585","p":4}],"SBGA-34":["docs/vvmO3ESLi28hpLDRrlFLyQ.pdf","https://sid.siemens.com/api/khub/documents/vvmO3ESLi28hpLDRrlFLyQ/content"],"SC-HN-WR-N":["docs/V33_kxv9WUMTinrTsQ6K0w.pdf","https://sid.siemens.com/api/khub/documents/V33_kxv9WUMTinrTsQ6K0w/content"],"SC-HN-WW-N":["docs/V33_kxv9WUMTinrTsQ6K0w.pdf","https://sid.siemens.com/api/khub/documents/V33_kxv9WUMTinrTsQ6K0w/content"],"SC-HS-WR-F":["docs/V33_kxv9WUMTinrTsQ6K0w.pdf","https://sid.siemens.com/api/khub/documents/V33_kxv9WUMTinrTsQ6K0w/content"],"SC-HS-WW-F":["docs/V33_kxv9WUMTinrTsQ6K0w.pdf","https://sid.siemens.com/api/khub/documents/V33_kxv9WUMTinrTsQ6K0w/content"],"SC-SP-CW-F":["docs/5IQd0hk4ENyLndsan_803w.pdf","https://sid.siemens.com/api/khub/documents/5IQd0hk4ENyLndsan~803w/content"],"SC-SP-WW-F":["docs/p6sGlAW5pizs_sbClODkPQ.pdf","https://sid.siemens.com/api/khub/documents/p6sGlAW5pizs~sbClODkPQ/content"],"SC-SS-CW-F":["docs/5IQd0hk4ENyLndsan_803w.pdf","https://sid.siemens.com/api/khub/documents/5IQd0hk4ENyLndsan~803w/content"],"SC-SS-WW-F":["docs/p6sGlAW5pizs_sbClODkPQ.pdf","https://sid.siemens.com/api/khub/documents/p6sGlAW5pizs~sbClODkPQ/content"],"SC-ST-WR-F":["docs/V33_kxv9WUMTinrTsQ6K0w.pdf","https://sid.siemens.com/api/khub/documents/V33_kxv9WUMTinrTsQ6K0w/content"],"SC-ST-WW-F":["docs/V33_kxv9WUMTinrTsQ6K0w.pdf","https://sid.siemens.com/api/khub/documents/V33_kxv9WUMTinrTsQ6K0w/content"],"SCM-8":["docs/8pcsNgifNhvpX9EeY596sA.html","https://sid.siemens.com/r/A6V10239103"],"SFP-11":["docs/V2rlmEHjfjL_CYp0Yb_uaA.pdf","https://sid.siemens.com/api/khub/documents/V2rlmEHjfjL_CYp0Yb_uaA/content"],"SFPO-11":["docs/V2rlmEHjfjL_CYp0Yb_uaA.pdf","https://sid.siemens.com/api/khub/documents/V2rlmEHjfjL_CYp0Yb_uaA/content"],"SFPT-11":["docs/V2rlmEHjfjL_CYp0Yb_uaA.pdf","https://sid.siemens.com/api/khub/documents/V2rlmEHjfjL_CYp0Yb_uaA/content"],"SHBBS-R":["docs/Uj9Gpr68fRc7Fi32l_oQsg.pdf","https://sid.siemens.com/api/khub/documents/Uj9Gpr68fRc7Fi32l_oQsg/content",{"cov":"Mounting Options for Notification Appliances, Data Sheet 2585","p":4}],"SHBBS-W":["docs/Uj9Gpr68fRc7Fi32l_oQsg.pdf","https://sid.siemens.com/api/khub/documents/Uj9Gpr68fRc7Fi32l_oQsg/content",{"cov":"Mounting Options for Notification Appliances, Data Sheet 2585","p":4}],"SIM-16":["docs/aB2ZUgcP375OlIMl5RIsXA.pdf","https://sid.siemens.com/api/khub/documents/aB2ZUgcP375OlIMl5RIsXA/content"],"SL24XSPS-FW":["docs/D17TTjEr4wVSLn6u06_UuQ.pdf","https://sid.siemens.com/api/khub/documents/D17TTjEr4wVSLn6u06~UuQ/content"],"SL2FSSCR-F":["docs/pZjCyJA9dakkgomWFiCroQ.pdf","https://sid.siemens.com/api/khub/documents/pZjCyJA9dakkgomWFiCroQ/content"],"SL2FSSWR-F":["docs/to3i3L7wI9hXxTu8PUBcPw.pdf","https://sid.siemens.com/api/khub/documents/to3i3L7wI9hXxTu8PUBcPw/content"],"SL2MTSWR-F":["docs/ipJRZWyocaqs__jEIbEHfQ.pdf","https://sid.siemens.com/api/khub/documents/ipJRZWyocaqs~~jEIbEHfQ/content"],"SL2SWW-F":["docs/AnthAaOhcPZ3X8TqSwMj8A.pdf","https://sid.siemens.com/api/khub/documents/AnthAaOhcPZ3X8TqSwMj8A/content"],"SLSPSWR-F":["docs/jAQiWg5u3vX6x0B7LvT24A.pdf","https://sid.siemens.com/api/khub/documents/jAQiWg5u3vX6x0B7LvT24A/content"],"SLSPSWW-F":["docs/jAQiWg5u3vX6x0B7LvT24A.pdf","https://sid.siemens.com/api/khub/documents/jAQiWg5u3vX6x0B7LvT24A/content"],"SLSWR-F":["docs/k_R8zBq_05eNxGSuJPDuog.pdf","https://sid.siemens.com/api/khub/documents/k~R8zBq~05eNxGSuJPDuog/content"],"SLSWW-F":["docs/k_R8zBq_05eNxGSuJPDuog.pdf","https://sid.siemens.com/api/khub/documents/k~R8zBq~05eNxGSuJPDuog/content"],"SNU-ASSY":["docs/fThMXGAgrPL4IOpLJXI36g.html","https://sid.siemens.com/r/A6V10525432"],"SNU-KIT":["docs/fThMXGAgrPL4IOpLJXI36g.html","https://sid.siemens.com/r/A6V10525432"],"SPSB-R":["docs/Uj9Gpr68fRc7Fi32l_oQsg.pdf","https://sid.siemens.com/api/khub/documents/Uj9Gpr68fRc7Fi32l_oQsg/content",{"cov":"Mounting Options for Notification Appliances, Data Sheet 2585","p":4}],"SSD":["docs/H8B0p6FXwUYCWOm6uLSZ2A.html","https://sid.siemens.com/r/A6V10239126"],"SSD-C":["docs/mefUBJ8oB6DlwrZaM1oU2Q.html","https://sid.siemens.com/r/A6V10239148"],"SSD-C-INT":["docs/mefUBJ8oB6DlwrZaM1oU2Q.html","https://sid.siemens.com/r/A6V10239148"],"SSD-C-REM":["docs/6D5Boa5zEkcltiBttAWGVw.html","https://sid.siemens.com/r/A6V10239129"],"SSD-INT":["docs/H8B0p6FXwUYCWOm6uLSZ2A.html","https://sid.siemens.com/r/A6V10239126"],"TRI-D":["docs/vE8d4MkF3hPb0kEsakionw.pdf","https://sid.siemens.com/api/khub/documents/vE8d4MkF3hPb0kEsakionw/content"],"TRI-R":["docs/vE8d4MkF3hPb0kEsakionw.pdf","https://sid.siemens.com/api/khub/documents/vE8d4MkF3hPb0kEsakionw/content"],"TRI-S":["docs/7P7wAJxq3uqHVN5pVnjbSQ.pdf","https://sid.siemens.com/api/khub/documents/7P7wAJxq3uqHVN5pVnjbSQ/content"],"TSM-1X":["docs/dhw5JRX8WMMQNNCzMGplBw.html","https://sid.siemens.com/r/A6V101055486"],"TZC-8B":["docs/X77dUBqZpTfTlrPIvHZ7mQ.html","https://sid.siemens.com/r/A6V10239124"],"USCG-HPLATE":["docs/QT92wvLMjWVYHhHg3WQzJA.pdf","https://sid.siemens.com/api/khub/documents/QT92wvLMjWVYHhHg3WQzJA/content",{"cov":"Desigo Marine Fire and Detection Equipment, Data Sheet","p":4}],"VESDA-HLI-KIT":["docs/Z06Sl7BCQspWfdW8UGEt_Q.pdf","https://sid.siemens.com/api/khub/documents/Z06Sl7BCQspWfdW8UGEt_Q/content"],"VN2001":["docs/51NcrbpoVz93idEE7X5fGA.pdf","https://sid.siemens.com/api/khub/documents/51NcrbpoVz93idEE7X5fGA/content"],"VN2002":["docs/urBTbdhHdHQqlNva3di5vw.pdf","https://sid.siemens.com/api/khub/documents/urBTbdhHdHQqlNva3di5vw/content"],"VN2003":["docs/urBTbdhHdHQqlNva3di5vw.pdf","https://sid.siemens.com/api/khub/documents/urBTbdhHdHQqlNva3di5vw/content"],"VPM":["docs/Z06Sl7BCQspWfdW8UGEt_Q.pdf","https://sid.siemens.com/api/khub/documents/Z06Sl7BCQspWfdW8UGEt_Q/content"],"VPM-MP":["docs/GnzGtrmMMzGBd5zNSIj5OA.pdf","https://sid.siemens.com/api/khub/documents/GnzGtrmMMzGBd5zNSIj5OA/content"],"WBBS":["docs/Uj9Gpr68fRc7Fi32l_oQsg.pdf","https://sid.siemens.com/api/khub/documents/Uj9Gpr68fRc7Fi32l_oQsg/content",{"cov":"Mounting Options for Notification Appliances, Data Sheet 2585","p":4}],"WPSBBS-R":["docs/Uj9Gpr68fRc7Fi32l_oQsg.pdf","https://sid.siemens.com/api/khub/documents/Uj9Gpr68fRc7Fi32l_oQsg/content",{"cov":"Mounting Options for Notification Appliances, Data Sheet 2585","p":4}],"WPSBBS-W":["docs/Uj9Gpr68fRc7Fi32l_oQsg.pdf","https://sid.siemens.com/api/khub/documents/Uj9Gpr68fRc7Fi32l_oQsg/content",{"cov":"Mounting Options for Notification Appliances, Data Sheet 2585","p":4}],"XDACT-ASSY":["docs/d_n4v8wacxlNtHZ_TEl1BQ.html","https://sid.siemens.com/r/A6V10807278"],"XDLC":["docs/evIVylDZwnBzt_6CGafK0w.html","https://sid.siemens.com/r/A6V101040156"],"XDMC":["docs/g1e7mFOsjyQLtKFSLBi_5Q.pdf","https://sid.siemens.com/api/khub/documents/g1e7mFOsjyQLtKFSLBi~5Q/content"],"XINC":["docs/_p_7V9UzfHLgItDx20gjSA.html","https://sid.siemens.com/r/A6V12412368"],"XLS-EXT-CABLE-PKG":["docs/NOXqvjn1ZQpL5Ds_k2xoUQ.pdf","https://sid.siemens.com/api/khub/documents/NOXqvjn1ZQpL5Ds~k2xoUQ/content"],"XLS-MLE6-ADPT":["docs/Sy57N7XGX4lZ9_c0esTpZg.pdf","https://sid.siemens.com/api/khub/documents/Sy57N7XGX4lZ9~c0esTpZg/content"],"XLS-MLE6R-ADPT":["docs/Sy57N7XGX4lZ9_c0esTpZg.pdf","https://sid.siemens.com/api/khub/documents/Sy57N7XGX4lZ9~c0esTpZg/content"],"XLS-MME3-ADPT":["docs/uSIfr_jNbROVluPilZMmiQ.pdf","https://sid.siemens.com/api/khub/documents/uSIfr~jNbROVluPilZMmiQ/content"],"XLS-MME3R-ADPT":["docs/uSIfr_jNbROVluPilZMmiQ.pdf","https://sid.siemens.com/api/khub/documents/uSIfr~jNbROVluPilZMmiQ/content"],"XLS-MSE2-ADPT":["docs/7CCQ1qr2O67A_V4qdNRC8g.pdf","https://sid.siemens.com/api/khub/documents/7CCQ1qr2O67A~V4qdNRC8g/content"],"XLS-MSE2R-ADPT":["docs/7CCQ1qr2O67A_V4qdNRC8g.pdf","https://sid.siemens.com/api/khub/documents/7CCQ1qr2O67A~V4qdNRC8g/content"],"XLS-MSE3-ADPT":["docs/ZaHyq77583QB9LWNgC_Zog.pdf","https://sid.siemens.com/api/khub/documents/ZaHyq77583QB9LWNgC_Zog/content"],"XLS-MSE3R-ADPT":["docs/ZaHyq77583QB9LWNgC_Zog.pdf","https://sid.siemens.com/api/khub/documents/ZaHyq77583QB9LWNgC_Zog/content"],"XLS-RCC1-ADPT":["docs/JRM_awNtOS5lVy4ZU954YQ.pdf","https://sid.siemens.com/api/khub/documents/JRM_awNtOS5lVy4ZU954YQ/content"],"XLS-RCC13-ADPT":["docs/JRM_awNtOS5lVy4ZU954YQ.pdf","https://sid.siemens.com/api/khub/documents/JRM_awNtOS5lVy4ZU954YQ/content"],"XLS-RCC13F-ADPT":["docs/YpND0UJFpDZ4BS0j3oLgwA.pdf","https://sid.siemens.com/api/khub/documents/YpND0UJFpDZ4BS0j3oLgwA/content"],"XLS-RCC13FR-ADPT":["docs/YpND0UJFpDZ4BS0j3oLgwA.pdf","https://sid.siemens.com/api/khub/documents/YpND0UJFpDZ4BS0j3oLgwA/content"],"XMI":["docs/Iba20o1EhXRMLk5km82vvg.html","https://sid.siemens.com/r/A6V10239134"],"XMS-51":["docs/FR2K0WFHAPmK7DukR0nkCg.pdf","https://sid.siemens.com/api/khub/documents/FR2K0WFHAPmK7DukR0nkCg/content"],"XMS-D":["docs/CIHf7A7NaXK_XNzcBNCmpA.html","https://sid.siemens.com/r/A6V11439600"],"XMS-M":["docs/CIHf7A7NaXK_XNzcBNCmpA.html","https://sid.siemens.com/r/A6V11439600"],"XMS-S":["docs/CIHf7A7NaXK_XNzcBNCmpA.html","https://sid.siemens.com/r/A6V11439600"],"XNLC":["docs/Qi6Y1XPO_TLtfNF6EpIUDA.html","https://sid.siemens.com/r/A6V14373883"],"XTRI-D":["docs/417guoKEqc7HqJEVh7ok2w.html","https://sid.siemens.com/r/A6V101055479"],"XTRI-M":["docs/S0k3cb0mZKAbMhy2ns_n_g.html","https://sid.siemens.com/r/A6V101055487"],"XTRI-R":["docs/417guoKEqc7HqJEVh7ok2w.html","https://sid.siemens.com/r/A6V101055479"],"XTRI-S":["docs/417guoKEqc7HqJEVh7ok2w.html","https://sid.siemens.com/r/A6V101055479"],"XVCC":["docs/crSKsCRCX6WCHNGb1ZWViQ.html","https://sid.siemens.com/r/A6V121412366"],"ZAC-40":["docs/GmyEXImd8ajRNoUH5b_5JQ.pdf","https://sid.siemens.com/api/khub/documents/GmyEXImd8ajRNoUH5b~5JQ/content"],"ZAC-40-70":["docs/GmyEXImd8ajRNoUH5b_5JQ.pdf","https://sid.siemens.com/api/khub/documents/GmyEXImd8ajRNoUH5b~5JQ/content"],"ZAM-180":["docs/nJXDWY_v6Go2jjEd68p2iA.html","https://sid.siemens.com/r/A6V10259386"],"ZAM-300":["docs/1sAS_0n2kk9juv0m0OtKJQ.pdf","https://sid.siemens.com/api/khub/documents/1sAS~0n2kk9juv0m0OtKJQ/content"],"ZB-R":["docs/1KE_Owd1hkxxxMQEr9YHEg.pdf","https://sid.siemens.com/api/khub/documents/1KE_Owd1hkxxxMQEr9YHEg/content",{"cov":"ZH and ZR Strobes, Horns and Horn / Strobes, Data Sheet","p":4}],"ZIC-2C":["docs/qYl8lqG_gKNT7Qoj0thS3g.html","https://sid.siemens.com/r/A6V10239144"],"ZIC-4A":["docs/96VJuFTJd27oifjXj3NtXg.html","https://sid.siemens.com/r/A6V10239104"],"ZIC-8B":["docs/R0rg8fFNtQ6tQPTo7_K2LQ.html","https://sid.siemens.com/r/A6V10239143"]};
const DATASHEETS={};for(const m in INSTALL)DATASHEETS[m]=INSTALL[m][0];
// v77 Siemens parts catalog: [category, pin type ('' = catalog only), model, description, datasheet key]. Keys map to URLs fetched and confirmed; '' = Siemens search.
const CAT_U={};
const CATALOG=`Panel cards & modules|panel|FCM2041-U2|Desigo Modular Operator Interface|fcm
Panel cards & modules|panel|CC-5|5-slot card cage|cc
Panel cards & modules|panel|CC-2|2-slot card cage|cc
Panel cards & modules|panel|XDLC|Class X device loop card|xdlc
Panel cards & modules|panel|XNLC|Class X notification loop card|xnlc
Panel cards & modules|panel|MLC|MXL line card|mlc
Panel cards & modules|panel|PSC-12M|Power supply/charger|psc
Panel cards & modules|panel|PSX-12M|Power supply extender|psc
Panel cards & modules|panel|ZIC-4A|Zone indicating card|zic4
Panel cards & modules|panel|ZIC-8B|Zone indicating card|zic8
Panel cards & modules|panel|ZIC-2C|Zone indicating card|zic8
Panel cards & modules|panel|OCM-16|Output control|ocm
Panel cards & modules|panel|SCM-8|Switch control|ctl
Panel cards & modules|panel|LCM-8|LED control|ctl
Panel cards & modules|panel|FCM-6|Fan control|ctl
Panel cards & modules|panel|SIM-16|Supervised input|ov
Panel cards & modules|panel|CDC-4|Conventional detector card|cdc
Panel cards & modules|panel|XVCC|Voice control card|xvcc
Panel cards & modules|panel|TZC-8B|Telephone zone card|tzc
Panel cards & modules|panel|FMT|Firefighters' master telephone|fmt
Panel cards & modules|panel|RNI|Remote network interface|rni
Panel cards & modules|panel|RPM|Remote printer module|rpm
Panel cards & modules|panel|SSD|System status display|ov
Amplifiers|panel|ZAC-40|Zone amplifier card|zac
Amplifiers|panel|ZAM-180|Zone amplifier module|zam
Amplifiers|panel|ZAM-300|Zone amplifier module|
Amplifiers|panel|ZAC-40-70|Zone amplifier card (70 V)|
Amplifiers|panel|EBA2004-A1|Booster amplifier|voice
Amplifiers|panel|DAC-NET|Digital audio card – network|dac
Amplifiers|panel|AIC|Audio input card|aic
Panel cards & modules|panel|NIC-C|Network interface card|nic
Panel cards & modules|panel|XINC|Network ring card|xinc
Network/Fiber|panel|FN2012-A1|Ethernet switch|voice
Network/Fiber|panel|FN2013-U1|Single-mode fiber module|fn13
Network/Fiber|panel|FN2014-U1|Multi-mode fiber module|fn13
Network/Fiber|panel|FN2006-U1|Single-mode X-NET fiber module|fn06
Network/Fiber|panel|FN2007-U1|Multi-mode X-NET fiber module|fn06
Network/Fiber|panel|VN2001|Ethernet module, electrical|voice
Network/Fiber|panel|VN2002|Ethernet module, multi-mode optical|voice
Network/Fiber|panel|VN2003|Ethernet module, single-mode optical|voice
Enclosures & Doors|panel|CAB1|One-row enclosure|encl
Enclosures & Doors|panel|CAB1R|One-row enclosure, red|encl
Enclosures & Doors|panel|CAB2-BB|Two-row back box, black|encl
Enclosures & Doors|panel|CAB2-BD|Two-row inner & outer door set, black|encl
Enclosures & Doors|panel|CAB2-XBD|Two-row transponder door, black|encl
Enclosures & Doors|panel|CAB2-RD|Two-row inner & outer door set, red|encl
Enclosures & Doors|panel|CAB2-XRD|Two-row transponder door, red|encl
Enclosures & Doors|panel|CAB2-RB|Two-row back box, red|encl
Enclosures & Doors|panel|CAB3-BB|Three-row back box, black|encl
Enclosures & Doors|panel|CAB3-BD|Three-row inner & outer door set, black|encl
Enclosures & Doors|panel|CAB3-XBD|Three-row transponder door, black|encl
Enclosures & Doors|panel|CAB3-RD|Three-row inner & outer door set, red|encl
Enclosures & Doors|panel|CAB3-XRD|Three-row transponder door, red|encl
Enclosures & Doors|panel|CAB3-RB|Three-row back box, red|encl
Enclosures & Doors|panel|CAB-MP|Cabinet mounting plate|encl
Enclosures & Doors|panel|COM-BRK|Communication module bracket|fn06
Enclosures & Doors|panel|ID-MP|Inner door mounting plate|encl
Enclosures & Doors|panel|ID-SP|Inner door spacer plate|encl
Enclosures & Doors|panel|OD-LP|Outer door lens plate|encl
Enclosures & Doors|panel|OD-BP|Outer door blank plate|encl
Enclosures & Doors|panel|OD-BP-R|Outer door blank plate, red|encl
Enclosures & Doors|panel|OD-GP|Outer door grill plate|encl
Enclosures & Doors|panel|OD-GP-R|Outer door grill plate, red|encl
Enclosures & Doors|panel|BCM|Blank control module|encl
Enclosures & Doors|panel|CAB-BATT|Battery enclosure|encl
Enclosures & Doors|panel|CAB-BATT-R|Battery enclosure, red|encl
Enclosures & Doors|panel|ENCL-01|Enclosure|encl
Enclosures & Doors|panel|REMBOX2|Remote enclosure, 2 module|encl
Enclosures & Doors|panel|REMBOX2R|Remote enclosure, 2 module, red|encl
Enclosures & Doors|panel|REMBOX2-MP|REMBOX2 mounting plate|encl
Enclosures & Doors|panel|REMBOX4|Remote enclosure, 4 module|encl
Enclosures & Doors|panel|REMBOX4-MP|REMBOX4 mounting plate|encl
Enclosures & Doors|panel|XLS-MLE6-ADPT|MLE-6 enclosure adapter|encl
Enclosures & Doors|panel|XLS-MLE6R-ADPT|MLE-6R enclosure adapter|encl
Enclosures & Doors|panel|XLS-MME3-ADPT|MME-3 enclosure adapter|encl
Enclosures & Doors|panel|XLS-MME3R-ADPT|MME-3R enclosure adapter|encl
Enclosures & Doors|panel|XLS-MSE2-ADPT|MSE-2 enclosure adapter|encl
Enclosures & Doors|panel|XLS-MSE2R-ADPT|MSE-2R enclosure adapter|encl
Enclosures & Doors|panel|XLS-MSE3-ADPT|MSE-3 enclosure adapter|encl
Enclosures & Doors|panel|XLS-MSE3R-ADPT|MSE-3R enclosure adapter|encl
Enclosures & Doors|panel|XLS-RCC13F-ADPT|RCC-1F/3F enclosure adapter|encl
Enclosures & Doors|panel|XLS-RCC13FR-ADPT|RCC-1FR/3FR enclosure adapter|encl
Notification non-ACEND|strobe|SLSWW-F|Wall strobe|sls
Notification non-ACEND|strobe|SLSWR-F|Wall strobe|sls
Notification non-ACEND|spkstrobe|SLSPSWW-F|Wall speaker strobe|slsp
Notification non-ACEND|spkstrobe|SLSPSWR-F|Wall speaker strobe|slsp
Notification non-ACEND|strobe|SL2SWW-F|Wall strobe|sl2
Notification non-ACEND|horn|SL2MTSWR-F|Multi-tone strobe|sl2mt
Notification non-ACEND|horn|SL2FSSCR-F|Ceiling low-frequency sounder strobe|sl2fc
Notification non-ACEND|horn|SL2FSSWR-F|Wall low-frequency sounder strobe|sl2fw
Notification non-ACEND|horn|HS-MC-R|Horn strobe|hs
Notification non-ACEND|horn|HS-MC-W|Horn strobe|hs
Notification non-ACEND|horn|HS-HMC-R|Horn strobe|hs
Notification non-ACEND|horn|AS-MC-R|Audible strobe|as
Notification non-ACEND|horn|AS-MC-W|Audible strobe|as
Notification non-ACEND|horn|AS-HMC-R-WP|Weatherproof horn strobe|
Notification non-ACEND|horn|AS-HMC-CR-WP|Weatherproof horn strobe|
Notification non-ACEND|horn|AS-HMC-CW-WP|Weatherproof horn strobe|
Notification non-ACEND|horn|MTH-HMC-CR-WP|Weatherproof multi-tone horn strobe|mth
Backboxes & Trim||SHBBS-R|Back box|mnt
Backboxes & Trim||SHBBS-W|Back box|mnt
Backboxes & Trim||SBBS|Back box|mnt
Backboxes & Trim||DBBS|Back box|mnt
Backboxes & Trim||SPSB-R|Back box|mnt
Backboxes & Trim||WPSBBS-R|Back box|mnt
Backboxes & Trim||WPSBBS-W|Back box|mnt
Backboxes & Trim||MT-SUR-BOX-W|Back box|mnt
Backboxes & Trim||ZB-R|Back box|zb
Backboxes & Trim||WBBS|Back box|mnt
Backboxes & Trim||FHA2043-R1|Trim kit|voice
Backboxes & Trim||CAB1-TK|Trim kit|encl
Backboxes & Trim||CAB1R-TK|Trim kit|encl
Backboxes & Trim||CAB2-TK|Trim kit|encl
Backboxes & Trim||CAB2R-TK|Trim kit|encl
Backboxes & Trim||CAB3-TK|Trim kit|encl
Backboxes & Trim||CAB3R-TK|Trim kit|encl
PAD-5 & Dialers|panel|PAD5-6A|PAD-5 power supply|pad
PAD-5 & Dialers|panel|PAD5-6A-R|PAD-5 power supply|pad
PAD-5 & Dialers|panel|PAD5-9A|PAD-5 power supply|pad
PAD-5 & Dialers|panel|PAD5-9A-R|PAD-5 power supply|pad
PAD-5 & Dialers|panel|PAD-5-MB|PAD-5 main board|pad
PAD-5 & Dialers|panel|PAD-5-CLSA|PAD-5 Class A/B expansion|pad
PAD-5 & Dialers|panel|PAD-5-CDC|PAD-5 conventional detector card|pad
PAD-5 & Dialers|dact|XDACT-ASSY|DACT mounting assembly|ov
PAD-5 & Dialers|dact|FCA2015-U1|DACT|fca
PAD-5 & Dialers|panel|CAB-100-BRKT|Battery bracket|encl
PAD-5 & Dialers|panel|CAB-55-BRKT|Battery bracket|encl
Panel cards & modules|panel|NRC|Network ring card (legacy)|ov
Panel cards & modules|panel|IIC|Interface isolation card, NRC-NIC bridge (legacy)|ov
Panel cards & modules|panel|CRC-6|Six-relay module|ov
Panel cards & modules|panel|CSB|CAN sounder board|ov
Panel cards & modules|panel|CCL|see datasheet|ov
Panel cards & modules|panel|VPM|VESDA peripheral module|ov
Panel cards & modules|panel|VPM-MP|VPM mounting plate|ov
Panel cards & modules|panel|VESDA-HLI-KIT|VESDA HLI card + socket card|ov
Panel cards & modules|panel|XDMC|Digital message card (legacy)|ov
Panel cards & modules|panel|XMI|Desigo-to-MDACT interface (legacy)|
Panel cards & modules|panel|MOM2-XMP|MOM-2 mounting plate (legacy)|
Panel cards & modules|panel|K-CBL|Printer interface cable|
Panel cards & modules|panel|SNU-ASSY|Single-node upload module (legacy)|ov
Panel cards & modules|panel|SNU-KIT|SNU sales kit (legacy)|ov
Panel cards & modules|panel|PMI-1 UPLD-CBL|PMI upload cable (legacy)|ov
Panel cards & modules||DPU|Device programming/test unit|
Panel cards & modules||GPMI-3|Graphical PMI software|ov
Panel cards & modules||GPMI-HW-KEY|GPMI hardware key|ov
Power supplies|panel|PSFA|Power supply filter assembly|psc
Power supplies|panel|PSC-ISO-CBL|Extender cable for 2× PSC-12M|psc
Power supplies|panel|PS-5A|see datasheet|ov
Power supplies||AC-ADPT|Technician laptop power connector|psc
Power supplies|panel|PSC-12|XLS power supply/charger (legacy)|pscx
Power supplies|panel|PSX-12|XLS power supply extender (legacy)|pscx
Voice / Audio & Telephone|panel|LVM|Live voice module (paging microphone)|ov
Voice / Audio & Telephone|panel|LPB|Local page board|dac
Voice / Audio & Telephone|panel|ALCC|Audio level conversion card|
Amplifiers|panel|ZAM-80|Zone amplifier, 80 W (legacy)|
Voice / Audio & Telephone|panel|FMT-A-ADPT|FMT Class A riser module|ov
Voice / Audio & Telephone|panel|DFM|Fiber converter for DNET (legacy)|
Voice / Audio & Telephone|panel|DFM-BRK|DFM bracket for DNET (legacy)|
Voice / Audio & Telephone||FTS|Remote telephone station|ov
Voice / Audio & Telephone||FTS-P|Remote telephone station|ov
Voice / Audio & Telephone||FTS-C|Remote telephone station|ov
Voice / Audio & Telephone||FTS-CL|Remote telephone station|ov
Voice / Audio & Telephone||FTS-PCL|Remote telephone station|ov
Voice / Audio & Telephone||FB-300|Telephone station flush back box|ov
Voice / Audio & Telephone||FB-301S|Telephone station surface back box|ov
Voice / Audio & Telephone||FC-300S|Key-lock cover with break glass|ov
Voice / Audio & Telephone||FT-GLS|Replacement glass for FC-300S|ov
Voice / Audio & Telephone|ffphone|MTE-2|Telephone enclosure|ov
Voice / Audio & Telephone|ffphone|PFT|Portable firefighter phone|ov
Voice / Audio & Telephone|ffphone|PFT-P|Portable firefighter phone, push-to-talk|ov
Voice / Audio & Telephone|ffphone|FJ-303|Telephone jack plate|ov
Voice / Audio & Telephone|ffphone|FJ-303SS|Telephone jack plate, stainless|ov
Voice / Audio & Telephone|ffphone|FJ-304|Telephone jack plate|ov
Voice / Audio & Telephone|ffphone|FJ-304SS|Telephone jack plate, stainless|ov
Annunciators|rai|SSD-C|System status display with controls|ov
Annunciators|rai|SSD-C-REM|SSD-C, remote locked cabinet|ov
Annunciators|rai|SSD-INT|System status display, internal|ov
Annunciators|rai|SSD-C-INT|SSD-C, internal|ov
Annunciators|rai|ILED-XC|Addressable remote LED, round plate|iled
Annunciators|rai|ILED-XW|Addressable remote LED, rectangular plate|iled
Annunciators|rai|RL-HW|Remote alarm lamp, wall|
Annunciators|rai|RL-HC|Remote alarm lamp, ceiling|
Network/Fiber|panel|FN2016-U1|XINC Ethernet copper media adapter|xinc
Network/Fiber|panel|FN2017-U1|XINC multi-mode fiber media adapter|xinc
Network/Fiber|panel|FN2018-U1|XINC single-mode fiber media adapter|xinc
Network/Fiber|panel|LDC|Long-distance copper module for XINC|xinc
Detectors|smoke|FDOOTC441|Desigo dual optical/heat + CO detector|fdootc
Detectors|smoke|OOHC941|Cerberus PRO dual optical/heat + CO detector|oohc
Detectors|smoke|OH921|Cerberus PRO optical/heat detector|oh921
Detectors|heat|HI921|Cerberus PRO heat detector|hi921
Detectors|smoke|SFP-11|Canadian H-series optical/heat detector|
Detectors|heat|SFPT-11|Canadian H-series heat detector|
Detectors|smoke|SFPO-11|Canadian H-series optical detector|
Bases||DB-11|Detector mounting base|db11
Bases||DB-11E|Detector mounting base, small|db11
Bases||DB-HR|Relay base, H-series (legacy)|db11
Bases||DB-X11RS|Detector base with relay (legacy)|dbx
Bases||ADBH-11|Audible base, H-series|adbh
Bases||ABHW-4B|Audible base|abhw4b
Bases||ABHW-4S|Audible base, 520 Hz|abhw4s
Bases||ABHW-4SZ|Audible base, 520 Hz, sleeping areas|abhw4sz
Detectors|duct|AD-11P|H-series air duct housing (legacy)|
Detectors|duct|AD-HR|H-series air duct housing with relay (legacy)|
Modules & Stations|module|HTRI-SZ|Single input module, US origin|htri
Modules & Stations|relay|HTRI-RZ|Single input module with relay, US origin|htri
Modules & Stations|module|HTRI-DZ|Dual input module, US origin|htri
Modules & Stations||USCG-HPLATE|Marine metal cover plate for HTRI|htri
Modules & Stations|module|HZM|Remote conventional zone module|hzm
Modules & Stations|module|HCP|Intelligent control point|hcp
Modules & Stations|module|FDCIO422|Addressable input/output module|fdcio
Modules & Stations|module|TSM-1X|Intelligent test switch|tsm
Modules & Stations|pull|HMS-2S|Manual station, two-stage|hms2
Modules & Stations|pull|HMS-SA|Manual station with aux contacts|hms2
Modules & Stations|pull|XMS-S|Class X manual station, single action|xms
Modules & Stations|pull|XMS-D|Class X manual station, double action|xms
Modules & Stations||HMSFD|Double-action adapter for HMS-M|
Modules & Stations||SB-5R|Surface box for HMS|
Modules & Stations|relay|RPR-1|Remote relay|
Enclosures & Doors|panel|CAB2-X|Two-row transponder box + door kit (legacy)|encl2
Enclosures & Doors|panel|CAB3-X|Three-row transponder box + door kit (legacy)|encl2
Enclosures & Doors|panel|XLS-RCC13-ADPT|RCC-1/RCC-3 to SSD adapter (legacy)|ov
Enclosures & Doors|panel|XLS-RCC1-ADPT|RCC-1 to SSD adapter (legacy)|ov
Enclosures & Doors|panel|XLS-EXT-CABLE-PKG|Adapter extension cable kit (legacy)|ov
Enclosures & Doors|panel|REMBOX4R|REMBOX4, red|encl
Enclosures & Doors|panel|MLE-6|Legacy MXL enclosure (legacy)|ov
Enclosures & Doors|panel|MLE-6R|Legacy MXL enclosure, red (legacy)|ov
Enclosures & Doors|panel|MME-3|Legacy MXL enclosure (legacy)|ov
Enclosures & Doors|panel|MME-3R|Legacy MXL enclosure, red (legacy)|ov
Enclosures & Doors|panel|MBR-2|Legacy MXL enclosure (legacy)|ov
Enclosures & Doors|panel|MBR-2R|Legacy MXL enclosure, red (legacy)|ov
Enclosures & Doors|panel|MSE-2|Legacy MXL enclosure (legacy)|ov
Enclosures & Doors|panel|MSE-2R|Legacy MXL enclosure, red (legacy)|ov
Enclosures & Doors|panel|MSE-3|Legacy MXL enclosure (legacy)|ov
Enclosures & Doors|panel|MSE-3R|Legacy MXL enclosure, red (legacy)|ov
Enclosures & Doors|panel|MSE-3L|Legacy MXL-IQ enclosure (legacy)|ov
Enclosures & Doors|panel|MSE-3LR|Legacy MXL-IQ enclosure, red (legacy)|ov
Enclosures & Doors|panel|MSE-3M|Legacy MXL-IQ enclosure (legacy)|ov
Enclosures & Doors|panel|MSE-3MR|Legacy MXL-IQ enclosure, red (legacy)|ov
Enclosures & Doors|panel|RCC-1|Legacy remote enclosure (legacy)|ov
Enclosures & Doors|panel|RCC-1F|Legacy remote enclosure, flush (legacy)|ov
Enclosures & Doors|panel|RCC-1FR|Legacy remote enclosure, flush red (legacy)|ov
Enclosures & Doors|panel|RCC-3F|Legacy remote enclosure, flush (legacy)|ov
Enclosures & Doors|panel|RCC-3FR|Legacy remote enclosure, flush red (legacy)|ov`.split('\n').map(l=>{const[c,t,m,d,k]=l.split('|');return{c,t,m,d,u:(INSTALL[m]||[''])[0]}});
const MODEL_DESC={};CATALOG.forEach(p=>{MODEL_DESC[p.m]=p.d;if(p.u)DATASHEETS[p.m]=p.u;if(p.t&&!(MODELS[p.t]||[]).includes(p.m))(MODELS[p.t]=MODELS[p.t]||[]).push(p.m)});

{// bpm-v87: door holders confirmed in Siemens docs
 const SDH='https://sid.siemens.com/api/khub/documents/tK3c3EtuyIdOkZnrgDlqZQ/content',PAD4='https://sid.siemens.com/r/A6V10406110/33243998219___en-US_33139400587',dsc={2:'flush wall, concealed wiring',3:'surface wiring',4:'concealed, fully recessed',5:'floor mount',6:'floor mount, double',7:'heavy duty',8:'heavy duty, overhead/vents'};
 for(const n of [2,3,4,5,6,7,8])for(const v of ['A','D']){const m='SDH-'+n+v;MODEL_DESC[m]=`Siemens door holder, ${dsc[n]}, ${v==='A'?'120 VAC':'24 VDC'}`;DATASHEETS[m]=SDH;(MODELS.doorholder??=[]).push(m)}
 for(const[m,d]of[['FM998','Rixson door holder (listed compatible in Siemens PAD-4 manual)'],['DH24120','RSG door holder (listed compatible in Siemens PAD-4 manual)']]){MODEL_DESC[m]=d;DATASHEETS[m]=PAD4;MODELS.doorholder.push(m)}}
const CAT_SET=new Set(CATALOG.map(p=>p.m));
// bpm-v84: user QR-scanned install links (IndexedDB meta 'installLinks', exported in .marker) override built-ins
let ULINKS={};async function userLinks(){ULINKS=(await get('meta','installLinks'))||{};return ULINKS}
const isHttp=u=>{try{const x=new URL(String(u||'').trim());return x.protocol==='http:'||x.protocol==='https:'}catch(e){return false}};
async function setUserLink(m,url){await userLinks();if(url)ULINKS[m]={url,ts:Date.now()};else delete ULINKS[m];await put('meta',ULINKS,'installLinks')}
function dsSearchUrl(m){return 'https://sid.siemens.com/search?q='+encodeURIComponent(m+' installation instructions')}
function dsUrl(m){m=String(m||'').trim();return ULINKS[m]?.url||DATASHEETS[m]||dsSearchUrl(m)}
function dsCov(m){return ULINKS[m]?.url?null:INSTALL[m]?.[2]||null}
function openDs(m){m=String(m||'').trim();if(m)openViewer(dsUrl(m),m,dsCov(m))}
function dsBtnSync(){const m=form.elements.model.value.trim(),b=$('#dDsBtn');b.hidden=false;$('#dQrBtn').hidden=false;/* bpm-v87: always visible */$('#dDsScan').hidden=!(m&&ULINKS[m]);b.title=m?(dsCov(m)?'Covered in: '+dsCov(m).cov+', not a dedicated install sheet':ULINKS[m]||DATASHEETS[m]?'Open '+m+' install sheet':'Search Siemens for '+m+' installation instructions'):'Search Siemens for '+(TYPES[form.elements.type.value]?.n||'device')+' installation instructions'}
// ---------- bpm-v84: in-app install-sheet viewer (pdf.js for PDFs, iframe for HTML, external only as last resort) ----------
const DOC_CACHE='bpm-docs';let IV={pdf:null,z:1,obs:null,tok:0};
async function fetchPdfBytes(url){const abs=new URL(url,location.href).href;
 try{const c=await caches.open(DOC_CACHE),r=await c.match(abs);if(r){const b=new Uint8Array(await r.arrayBuffer());if(b[0]===37&&b[1]===80)return b}}catch(e){}
 try{const r=await fetch(abs,{mode:'cors'});if(!r.ok)return null;const b=new Uint8Array(await r.clone().arrayBuffer());if(!(b[0]===37&&b[1]===80&&b[2]===68&&b[3]===70))return null;try{(await caches.open(DOC_CACHE)).put(abs,new Response(b,{headers:{'Content-Type':'application/pdf'}}))}catch(e){}return b}catch(e){return null}}
function ivMsg(html){$('#ivBody').innerHTML=`<div class="ivMsg">${html}</div>`}
async function openViewer(url,title,cov){const d=$('#ivDlg'),tok=++IV.tok;IV.p=cov?.p||0;{const c=$('#ivCov');c.hidden=!cov;c.textContent=cov?'Covered in: '+cov.cov+(cov.p?' (opens at p. '+cov.p+')':'')+', not a dedicated install sheet':''}$('#ivRep').hidden=true;IV.pdf=null;IV.z=1;$('#ivZ').textContent='100%';$('#ivT').textContent=title||'';const abs=new URL(url,location.href).href;$('#ivExt').href=abs;$('#ivExt').title='Open the original outside Marker';
 $('#ivZo').hidden=$('#ivZi').hidden=$('#ivZ').hidden=true;ivMsg('Loading…');if(!d.open)d.showModal();
 const local=new URL(abs).origin===location.origin;
 if(/\.html?(\?|#|$)/i.test(abs)&&local){$('#ivBody').innerHTML=`<iframe src="${esc(abs)}" title="${esc(title||'')}"></iframe>`;return}
 if(/^https:\/\/sid\.siemens\.com\/search/.test(abs)){ivMsg(`No verified install sheet is stored for <b>${esc(title||'')}</b>.<br><br>Siemens does not allow its search to open inside other apps.<br><br><a class="btn" href="${esc(abs)}" target="_blank" rel="noopener">🔎 Search Siemens (opens outside Marker)</a><br><br><small>Tip: scan the QR code on the part's install sheet (📷 Scan QR) to save its link here.</small>`);return}
 const bytes=await fetchPdfBytes(abs);if(tok!==IV.tok)return;
 if(bytes){try{IV.pdf=await pdfjsLib.getDocument({data:bytes}).promise}catch(e){IV.pdf=null}}
 if(tok!==IV.tok)return;
 if(IV.pdf){$('#ivZo').hidden=$('#ivZi').hidden=$('#ivZ').hidden=false;return ivRender()}
 if(local){ivMsg('This document could not be opened.');return}
 // cross-origin non-PDF or CORS-blocked: try framing; offer external open as last resort
 $('#ivBody').innerHTML=`<div class="ivMsg" style="padding:6px;font-size:.85em">If the page stays blank, the site blocks viewing inside apps: <a class="btn" href="${esc(abs)}" target="_blank" rel="noopener">↗ Open outside Marker</a></div><iframe src="${esc(abs)}" style="height:calc(100% - 44px)" referrerpolicy="no-referrer"></iframe>`}
async function ivRender(){const pdf=IV.pdf,body=$('#ivBody');if(!pdf)return;IV.obs?.disconnect();body.innerHTML='';const W=Math.min(body.clientWidth-16,1100)*IV.z;
 const p1=await pdf.getPage(1),v1=p1.getViewport({scale:1});
 for(let i=1;i<=pdf.numPages;i++){const w=document.createElement('div');w.className='ivPg';w.dataset.p=i;w.style.width=W+'px';w.style.height=(W*v1.height/v1.width)+'px';body.appendChild(w)}
 const tok=IV.tok,z=IV.z;IV.obs=new IntersectionObserver(es=>{for(const e of es)if(e.isIntersecting&&!e.target.dataset.done){e.target.dataset.done=1;(async()=>{const pg=await pdf.getPage(+e.target.dataset.p);if(tok!==IV.tok||z!==IV.z)return;const v0=pg.getViewport({scale:1}),sc=W/v0.width,dpr=Math.min(devicePixelRatio||1,2),vp=pg.getViewport({scale:sc*dpr});e.target.style.height=(v0.height*sc)+'px';const c=document.createElement('canvas');c.width=vp.width;c.height=vp.height;e.target.appendChild(c);await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise})()}},{root:body,rootMargin:'400px'});
 body.querySelectorAll('.ivPg').forEach(x=>IV.obs.observe(x));if(IV.p>1&&IV.p<=pdf.numPages){const t=body.querySelector(`.ivPg[data-p="${IV.p}"]`);body.scrollTop=t.offsetTop-8;IV.p=0}}
function ivZoom(f){const b=$('#ivBody'),r=b.scrollTop/Math.max(1,b.scrollHeight);IV.z=Math.max(.5,Math.min(4,IV.z*f));$('#ivZ').textContent=Math.round(IV.z*100)+'%';ivRender().then(()=>{b.scrollTop=r*b.scrollHeight})}
$('#ivZi').onclick=()=>ivZoom(1.25);$('#ivZo').onclick=()=>ivZoom(.8);
$('#ivClose').onclick=()=>{IV.tok++;IV.obs?.disconnect();IV.pdf=null;$('#ivBody').innerHTML='';$('#ivDlg').close()};
$('#ivDlg').addEventListener('cancel',e=>{e.preventDefault();$('#ivClose').click()});
$('#dsOff').onclick=async()=>{const fs=[...new Set(Object.values(DATASHEETS).filter(u=>u.startsWith('docs/')))],c=await caches.open(DOC_CACHE);let n=0,bad=0;for(const f of fs){const abs=new URL(f,location.href).href;if(!await c.match(abs)){try{const r=await fetch(abs);if(r.ok)await c.put(abs,r);else bad++}catch(e){bad++}}n++;$('#dsOffI').textContent=`${n}/${fs.length}`}$('#dsOffI').textContent=bad?`${fs.length-bad}/${fs.length} saved offline (${bad} failed)`:`All ${fs.length} install sheets saved offline`};
// ---------- bpm-v84: QR scan → user install link ----------
let QR={stream:null,raf:0,det:null};
function qrStop(){cancelAnimationFrame(QR.raf);clearTimeout(QR.raf);QR.stream?.getTracks().forEach(t=>t.stop());QR.stream=null;const v=$('#qrV');v.srcObject=null}
async function qrDecoder(){if(QR.det)return QR.det;if('BarcodeDetector'in window){try{const f=await BarcodeDetector.getSupportedFormats();if(f.includes('qr_code')){const bd=new BarcodeDetector({formats:['qr_code']});return QR.det=async src=>{const r=await bd.detect(src);return r[0]?.rawValue||null}}}catch(e){}}
 if(!window.jsQR)await new Promise((res,rej)=>{const s=document.createElement('script');s.src='vendor/jsQR.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s)});
 const cv=document.createElement('canvas'),cx=cv.getContext('2d',{willReadFrequently:true});return QR.det=async src=>{const w=src.videoWidth||src.naturalWidth||src.width,h=src.videoHeight||src.naturalHeight||src.height;if(!w||!h)return null;const k=Math.min(1,1000/Math.max(w,h));cv.width=w*k|0;cv.height=h*k|0;cx.drawImage(src,0,0,cv.width,cv.height);const d=cx.getImageData(0,0,cv.width,cv.height),r=jsQR(d.data,d.width,d.height,{inversionAttempts:'attemptBoth'});return r?.data||null}}
function qrGot(txt){txt=String(txt||'').trim();if(!isHttp(txt)){$('#qrS').textContent='That QR code is not a web link (only http/https links are accepted).';return false}$('#qrU').value=txt;$('#qrS').textContent='Identifying the part…';qrStop();qrInfer(txt);return true}
// bpm-v84: identify the part from the QR link (URL path/query, page title, PDF first-page text) against the catalog
let UPARTS={};async function userParts(){UPARTS=(await get('meta','userParts'))||{};for(const[m,v]of Object.entries(UPARTS))if(!MODEL_DESC[m])MODEL_DESC[m]=v.d||'';return UPARTS}
const pnNorm=x=>String(x||'').toUpperCase().replace(/[^A-Z0-9]/g,''),pnBase=x=>pnNorm(String(x||'').toUpperCase().replace(/(-(R|W|F|WP|N|A|INT|INTL|U1|A1|R1)|R)$/,''));
function allParts(){return[...new Set([...CATALOG.map(p=>p.m),...Object.values(MODELS).flat(),...Object.values(MODELS_C||{}).flat(),...Object.keys(UPARTS)])]}
function matchPart(srcs){srcs=[].concat(srcs).filter(Boolean);const ms=allParts().sort((a,b)=>b.length-a.length);let guess='';
 for(const text of srcs){const T=String(text).toUpperCase(),toks=T.split(/[^A-Z0-9-]+/).map(t=>t.replace(/(-(INSTALL|INSTALLATION|INSTRUCTIONS?|MANUAL|DATASHEET|DS|II|EN|US|SHEET))+$/,'')).filter(t=>t.length>=2);let best=null;
  for(const m of ms){const re=new RegExp('(^|[^A-Z0-9-])'+m.toUpperCase().replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![A-Z0-9]|-[A-Z0-9])','g'),n=(T.match(re)||[]).length;if(n&&(!best||n>best.n))best={m,n}}
  if(best)return{m:best.m,how:'exact'};
  const tn=new Set(toks.map(pnNorm)),tb=new Set(toks.map(pnBase));for(const m of ms)if(pnNorm(m).length>=3&&tn.has(pnNorm(m)))return{m,how:'normalized'};
  for(const m of ms)if(pnBase(m).length>=3&&tb.has(pnBase(m)))return{m,how:'normalized (suffix ignored)'};
  guess=guess||toks.find(t=>/[A-Z]/.test(t)&&/[0-9]/.test(t)&&/^[A-Z]{1,6}[A-Z0-9]*(-[A-Z0-9]+)*$/.test(t)&&!/^(A6V|HTTP|P\d{4}|V\d)/.test(t)&&t.length<=16)||''}
 return{m:null,guess}}
async function qrInferText(url){let a='',pdfT='';try{const u=new URL(url);a=decodeURIComponent(u.pathname.replace(/[\/_+.]/g,' '))+' '+decodeURIComponent(u.search.replace(/[&=?+]/g,' '))}catch(e){}
 const b=await fetchPdfBytes(url);if(b){try{const pdf=await pdfjsLib.getDocument({data:b}).promise,pg=await pdf.getPage(1),tc=await pg.getTextContent();pdfT=tc.items.map(i=>i.str).join(' ');try{const md=await pdf.getMetadata();a+=' '+(md?.info?.Title||'')}catch(e){}}catch(e){}}
 else{try{const r=await fetch(url,{mode:'cors'});if(r.ok&&/html/.test(r.headers.get('content-type')||'')){const h=await r.text(),m=h.match(/<title[^>]*>([^<]*)/i);if(m)a+=' '+m[1]}}catch(e){}}return[a,pdfT]}
async function qrInfer(url){await userParts();const pre=$('#qrP').value.trim();const r=matchPart(await qrInferText(url));QR.inf=r;
 if(r.m){$('#qrP').value=r.m;$('#qrM').textContent=`Identified ${r.m} (${r.how} match)${pre&&pre!==r.m?` — the pin's model was ${pre}`:''}. Confirm or change it, then Continue.`}
 else{if(!pre&&r.guess)$('#qrP').value=r.guess;$('#qrM').textContent=r.guess?`No catalog part matched; part number read as ${r.guess}. Confirm or change it.`:'No part number found in the link. Type the part, then Continue.'}
 $('#qrS').textContent='✓ Link read. Confirm the part, then Continue.';qrPartChg();if(QR.auto&&r.m)qrDecide()}
function qrPartChg(){const m=$('#qrP').value.trim(),known=m&&allParts().includes(m);$('#qrNew').hidden=!m||known;$('#qrHas').hidden=true}
async function openQr(part,auto){QR.auto=!!auto;const d=$('#qrDlg');$('#qrU').value='';$('#qrP').value=part||'';$('#qrS').textContent='Point the camera at the QR code…';$('#qrM').textContent='';$('#qrNew').hidden=$('#qrHas').hidden=true;$('#qrD').value='';$('#qrC').value='My devices';$('#qrT').innerHTML='<option value="">(catalog only)</option>'+Object.entries(TYPES).map(([k,v])=>`<option value="${k}">${esc(v.n)}</option>`).join('');{const cur=typeof form!=='undefined'&&$('#pinDlg')?.open?form.elements.type?.value:'';if(cur)$('#qrT').value=cur}await userParts();
 const ms=[...new Set([...CATALOG.map(p=>p.m),...Object.values(MODELS).flat(),...Object.values(await customModels()).flat()])].sort();$('#qrPL').innerHTML=ms.map(m=>`<option value="${esc(m)}">${esc(MODEL_DESC[m]||'')}</option>`).join('');
 d.showModal();let det;try{det=await qrDecoder()}catch(e){$('#qrS').textContent='QR decoder unavailable.';return}
 try{QR.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});const v=$('#qrV');v.srcObject=QR.stream;await v.play();
  const loop=async()=>{if(!QR.stream)return;try{const t=await det(v);if(t&&qrGot(t))return}catch(e){}QR.raf=setTimeout(loop,200)};loop()}
 catch(e){$('#qrS').textContent='Camera not available. Use “From image” or paste the link.'}}
$('#qrFile').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;const det=await qrDecoder(),img=new Image();img.src=URL.createObjectURL(f);await img.decode();let t=null;try{t=await det(img)}catch(x){}URL.revokeObjectURL(img.src);if(t)qrGot(t);else $('#qrS').textContent='No QR code found in that image.'};
const viable=m=>!!(ULINKS[m]?.url||DATASHEETS[m]);
async function qrDecide(){const u=$('#qrU').value.trim(),m=$('#qrP').value.trim();if(!isHttp(u)){$('#qrS').textContent='Only http(s) links can be saved.';return}if(!m){$('#qrS').textContent='Choose or type the part this link belongs to.';return}
 await userParts();const known=allParts().includes(m);
 if(known&&viable(m)){QR.pend={m,u};$('#qrHasT').textContent=`${m} already has ${ULINKS[m]?'a scanned':'a verified'} install sheet. It was kept.`;$('#qrHas').hidden=false;$('#qrS').textContent='Existing sheet kept (not replaced).';return 'has'}
 if(known){await setUserLink(m,u);toast(`Saved scanned install link for ${m}`);qrDone(m);return 'saved'}
 const t=$('#qrT').value,d=$('#qrD').value.trim(),c=$('#qrC').value.trim()||'My devices';UPARTS[m]={d,c,t,ts:Date.now()};await put('meta',UPARTS,'userParts');MODEL_DESC[m]=d;if(t)await rememberModel(t,m);await setUserLink(m,u);toast(`Added ${m} to My devices with its install link`);qrDone(m);return 'new'}
function qrDone(m){qrStop();$('#qrDlg').close();dsBtnSync();if($('#dsDlg').open){$('#dsQ').value=m;dsList()}fetchPdfBytes(ULINKS[m]?.url||'')}
$('#qrSave').onclick=qrDecide;$('#qrP').addEventListener('input',qrPartChg);
$('#qrOpen').onclick=()=>{const{m,u}=QR.pend||{};if(!m)return;qrStop();$('#qrDlg').close();openDs(m);$('#ivRep').hidden=false;$('#ivRep').onclick=async()=>{await setUserLink(m,u);$('#ivRep').hidden=true;toast(`Replaced ${m}'s sheet with the scanned link`);dsBtnSync();if($('#dsDlg').open)dsList();openDs(m)}};
$('#qrRep').onclick=async()=>{const{m,u}=QR.pend||{};if(!m)return;await setUserLink(m,u);toast(`Replaced ${m}'s sheet with the scanned link`);qrDone(m)};

$('#qrDlg').addEventListener('close',qrStop);
$('#dsQr').onclick=()=>openQr($('#dsQ').value.trim()&&CATALOG.concat().some(p=>p.m===$('#dsQ').value.trim())?$('#dsQ').value.trim():'');
$('#dQrBtn').onclick=async()=>{const m=form.elements.model.value.trim();await openQr(m);if(!m&&$('#qrT'))$('#qrT').value=form.elements.type.value;QR.pinType=form.elements.type.value};
$('#qrTool').onclick=()=>openQr('',true); // bpm-v85: toolbar scan: auto-match → keep/attach, else new My devices entry
userLinks();userParts();
$('#dDsBtn').onclick=()=>{const m=form.elements.model.value.trim();if(m)return openDs(m);const n=TYPES[form.elements.type.value]?.n||'fire alarm device';openViewer('https://sid.siemens.com/search?q='+encodeURIComponent(n+' installation instructions Siemens'),n+' installation instructions')};
['change','input'].forEach(ev=>{$('#dModelSel').addEventListener(ev,dsBtnSync);$('#dModelC').addEventListener(ev,dsBtnSync)});
// bpm-v82: category/type keywords (notification, NAC, horn, strobe, speaker…) match every notification device; rank part number > category > description
const DS_NOTIF_T=new Set(['horn','spkstrobe','strobe','linearray']),DS_NOTIF_KW=['notification','nac','horn','strobe','speaker','chime','visual','audible','appliance','sounder','acend'];
const dsNotifGrp=(isT,key)=>isT?DS_NOTIF_T.has(key):/notification/i.test(key);
async function dsList(){const c=await customModels(),q=$('#dsQ').value.trim().toLowerCase();let G=[];
 const nq=q.length>=3&&DS_NOTIF_KW.some(k=>k.startsWith(q)||q.startsWith(k));
 const acend=m=>/^SC-/.test(m)||CATALOG.some(p=>p.m===m&&/acend/i.test(p.c));
 const score=(m,g,notif)=>{if(!q)return 0;if(m.toLowerCase().includes(q))return 1;if(g.toLowerCase().includes(q))return 2;if(nq&&(notif||acend(m)))return 2;if((MODEL_DESC[m]||'').toLowerCase().includes(q))return 3;return 9};
 const btn=m=>{const u=ULINKS[m],has=u||DATASHEETS[m];return`<button type="button" class="btn dsM" data-m="${esc(m)}" title="${dsCov(m)?esc('Covered in: '+dsCov(m).cov+', not a dedicated install sheet'):has?'Install instructions':'Siemens search'}">${esc(m)} ${has?(dsCov(m)?'📘':'📄'):'🔎'}${dsCov(m)?'<span class="scB covB">covered</span>':''}${u?'<span class="scB">scanned</span>':''}${UPARTS[m]?'<span class="scB myB">My devices</span>':''}${MODEL_DESC[m]?`<small class="dsD">${esc(MODEL_DESC[m])}</small>`:''}</button>`+(u?`<button type="button" class="btn dsX" data-rep="${esc(m)}" title="Replace scanned link">↻</button><button type="button" class="btn dsX" data-rm="${esc(m)}" title="Remove scanned link">✕</button>`:'')};
 const grp=(key,attr,name,ms)=>{const notif=dsNotifGrp(attr==='data-type',key);const r=ms.map((m,i)=>({m,i,s:score(m,name,notif)})).filter(x=>x.s<9).sort((x,y)=>x.s-y.s||x.i-y.i);if(r.length)G.push({s:r[0].s,o:G.length,h:`<details open class="dsGrp" ${attr}="${esc(key)}"><summary>${esc(name)} <small>(${r.length})</small></summary><div class="dsL">`+r.map(x=>btn(x.m)).join('')+'</div></details>'})};
 for(const t in TYPES)grp(t,'data-type',TYPES[t].n,[...new Set([...(MODELS[t]||[]).filter(m=>!CAT_SET.has(m)),...(c[t]||[])])]);
 for(const k of [...new Set(CATALOG.map(p=>p.c))])grp(k,'data-cat',k,CATALOG.filter(p=>p.c===k).map(p=>p.m));
 for(const k of [...new Set(Object.values(UPARTS).map(v=>v.c||'My devices'))])grp(k,'data-my',k==='My devices'?k:k+' · My devices',Object.keys(UPARTS).filter(m=>(UPARTS[m].c||'My devices')===k));
 G.sort((x,y)=>x.s-y.s||x.o-y.o);
 $('#dsBody').innerHTML=G.map(g=>g.h).join('')||'<small style="color:#94a3b8">No models match.</small>'}
$('#dsBody').onclick=async e=>{const r=e.target.closest('[data-rep]'),x=e.target.closest('[data-rm]'),b=e.target.closest('.dsM');if(r)return openQr(r.dataset.rep);if(x){if(await uiConfirm('Remove the scanned link for '+x.dataset.rm+'? The built-in link will be used again.')){await setUserLink(x.dataset.rm,null);dsList();dsBtnSync()}return}if(b)openDs(b.dataset.m)};
$('#dsQ').oninput=dsList;
$('#dsBtn').onclick=async()=>{$('#dsQ').value='';await userLinks();await userParts();await dsList();$('#dsDlg').showModal()};

// bpm-v101: page flip by overscroll. Drag (or Shift+wheel) the plan past the bottom edge of the page by PF_T px more than it started → next page, landing at its top
// (zoom kept); past the top edge → previous page, landing at its bottom. Only plain pans (never pinch, drawing, pin drag, box select); off in Walk. Never moves pins.
const PF_T=110,PF_H=40;
function pfEdges(v){const D=dispWH(),H=stage.clientHeight;return{top:v.y,bot:v.y+D.h*v.s,H}}
function pfHint(dir,k){let h=$('#pfHint');if(!h){h=document.createElement('div');h.id='pfHint';stage.append(h)}if(!dir||k<PF_H/PF_T){h.hidden=true;return}
 const ok=k>=1,nx=dir>0?page+1:page-1;h.className=dir>0?'pfB':'pfT';h.classList.toggle('ready',ok);h.textContent=ok?(dir>0?`↓ Release for page ${nx}`:`↑ Release for page ${nx}`):(dir>0?`↓ Next page (${nx})`:`↑ Previous page (${nx})`);h.style.setProperty('--k',Math.min(1,k));h.hidden=false}
function pfAmt(g){if(walk||!plan||!pageW)return null;const e0=pfEdges(g.v),e=pfEdges(view);
 const dn=Math.min(e.H,e0.bot)-e.bot,upA=e.top-Math.max(0,e0.top);if(dn>0&&page<plan.pages)return{dir:1,k:dn/PF_T};if(upA>0&&page>1)return{dir:-1,k:upA/PF_T};return null}
function pfTrack(g){const a=pfAmt(g);pfHint(a&&a.dir,a?a.k:0)}
async function pfFlip(dir){const s=view.s,x=view.x,H=stage.clientHeight;pfHint(0);await gotoPage(page+dir);const D=dispWH();view={s,x,y:dir>0?8:H-D.h*s-8};draw();scheduleRender();toast(`Page ${page} of ${plan.pages}`);return true}
async function pfRelease(g){const a=pfAmt(g);pfHint(0);if(a&&a.k>=1)return pfFlip(a.dir);return false}
let pfW=null,pfWT=0;function pfWheel(e){const d=e.deltaY||e.deltaX;
 if(!pfW)pfW={v:{...view}};clearTimeout(pfWT);const e0=pfEdges(view),D=dispWH(),H=stage.clientHeight;let ny=view.y-d;
 // clamp the scroll at the edges, then accumulate the extra as overscroll
 const minY=Math.min(8,H-D.h*view.s-8),maxY=Math.max(8,H-D.h*view.s-8);if(ny<minY){pfW.o=(pfW.o||0)+(minY-ny);ny=minY}else if(ny>maxY){pfW.o=(pfW.o||0)-(ny-maxY);ny=maxY}else pfW.o=0;
 view={...view,y:ny};fastView();const o=pfW.o||0,dir=o>0?1:o<0?-1:0,ok=dir&&(dir>0?page<plan.pages:page>1);pfHint(ok&&dir,Math.abs(o)/PF_T);
 if(ok&&Math.abs(o)>=PF_T){pfW=null;pfFlip(dir);return}pfWT=setTimeout(()=>{pfW=null;pfHint(0)},350)}

