(function(){
'use strict';
const N=v=>Number(v)||0,S=v=>String(v??'').trim(),K=v=>S(v).toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const SUM=['applications','approved','inProcess','rejected','applicantPending','demand','receivedSummary','paidApplicants','receipts','collection'];
function locked(){return window.__OTS_LOCKED_ROSTER||[]}
function restoreRoster(){if(typeof PUBLIC==='undefined'||!locked().length)return;PUBLIC.roster=locked().map(r=>({...r}));if(window.__OTS_LOCKED_TS)PUBLIC.ts={...window.__OTS_LOCKED_TS}}
function unresolved(r){const x=K(`${r?.ri||''} ${r?.ward||''}`);return x.includes('unresolved')||x.includes('needs classification')||x.includes('unassigned')||x.includes('source ward')}
function match(r){const L=locked().filter(x=>x.zone===r.zone),wk=K(r.ward);let m=L.find(x=>K(x.ward)===wk);if(m)return m;const byNo=L.filter(x=>Number(x.wardNo)===Number(r.wardNo));return byNo.length===1?byNo[0]:null}
function sanitizeWardRows(rows){const out=[];for(const r of rows||[]){const m=match(r);if(m)out.push({...r,zone:m.zone,wardNo:m.wardNo,ward:m.ward,ri:m.ri,post:m.post});else if(unresolved(r))out.push({...r})}return out}
function aggregateRI(wards){const m=new Map();for(const w of wards){const key=`${w.zone}|${w.ri||'Unresolved / Needs Classification'}`,x=m.get(key)||{zone:w.zone,ri:w.ri||'Unresolved / Needs Classification',post:w.post||'Control',wards:0};for(const f of SUM)x[f]=N(x[f])+N(w[f]);x.wards++;m.set(key,x)}return[...m.values()].sort((a,b)=>S(a.zone).localeCompare(S(b.zone))||S(a.ri).localeCompare(S(b.ri)))}
function patchAuthority(){const A=window.OTS_AUTHORITY;if(!A||A.__rosterSanitized)return;A.__rosterSanitized=true;const oldWard=A.wardRows.bind(A);A.wardRows=function(z='All'){return sanitizeWardRows(oldWard('All')).filter(r=>z==='All'||r.zone===z)};A.riRows=function(z='All'){return aggregateRI(A.wardRows('All')).filter(r=>z==='All'||r.zone===z)}}
function apply(){restoreRoster();patchAuthority();if(window.renderAll)window.renderAll()}
let t=0;const timer=setInterval(()=>{t++;apply();if(window.OTS_AUTHORITY&&locked().length||t>120)clearInterval(timer)},100);document.addEventListener('ots:shared-applied',()=>setTimeout(apply,10));document.addEventListener('ots:authority-updated',()=>setTimeout(apply,10));document.addEventListener('ots:bootstrap-ready',apply);
})();