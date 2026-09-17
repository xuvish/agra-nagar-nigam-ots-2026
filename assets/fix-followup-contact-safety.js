(function(){
'use strict';
const PREV=window.processReportSet||window.processWorkbook;
const N=v=>String(v??'').trim();
const K=v=>N(v).toLowerCase().replace(/[^a-z0-9]+/g,'');
const A=r=>N(r?.['Application number']);
const mobile=r=>N(r?.['Mobile (masked)']||r?.['Mobile No.']||r?.Mobile);
function add(m,k,v){k=K(k);v=N(v);if(!k||!v)return;const x=m.get(k);if(!x)m.set(k,{v,conflict:false});else if(x.v!==v)x.conflict=true}
function get(m,k){const x=m.get(K(k));return x&&!x.conflict?x.v:''}
function apply(){const E=window.OTS7;if(!E?.loaded)return;const byApp=new Map(),byUid=new Map(),byHouse=new Map();for(const p of E.payments||[]){const mob=mobile(p);if(!mob)continue;add(byApp,A(p),mob);add(byUid,p['Property UID'],mob);add(byHouse,p['House / property no.']||p['Application house no.']||p['Receipt property no.'],mob)}let recovered=0;E.apps=(E.apps||[]).map(src=>{const a={...src},direct=get(byApp,A(a)),uid=get(byUid,a['Property UID']),house=get(byHouse,a['House / property no.']),safe=direct||uid||house;if(safe){a['Mobile (masked)']=safe;a['Mobile basis']=direct?'Same application Collection receipt':uid?'Unique exact Property UID match':'Unique exact Property No match';recovered++}else if(a['Mobile basis']){delete a['Mobile (masked)'];a['Mobile basis']='No unique contact evidence in supplied reports'}return a});if(typeof LOCAL!=='undefined'&&LOCAL)LOCAL.applications=E.apps;E.followupContactAudit={safeContacts:recovered,rule:'Masked mobile is shown only when the supplied Collection Report gives one unique exact Application/Property UID/Property No match. Conflicting or absent contacts are left blank.'};if(window.renderAll)window.renderAll()}
window.__applyFollowupContactSafety=apply;
window.processReportSet=async function(){const out=await PREV.apply(this,arguments);apply();return out};window.processWorkbook=window.processReportSet;const b=document.querySelector('#reportModal .btn.primary');if(b)b.onclick=window.processReportSet;
})();