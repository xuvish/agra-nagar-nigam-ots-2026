(function(){
'use strict';
const oldProcess=window.processReportSet||window.processWorkbook;
const ZONES=['Chhatta','Hariparwat','Tajganj','Lohamandi'];
const n=v=>String(v??'').trim().toLowerCase();
const num=v=>{const x=Number(String(v??0).replace(/,/g,''));return Number.isFinite(x)?x:0};
function zoneNorm(v){const x=n(v).replace(/[^a-z]/g,'');if(/chh?atta|chhata|chatta/.test(x))return'Chhatta';if(x.includes('haripar')||x.includes('harpar'))return'Hariparwat';if(x.includes('tajganj'))return'Tajganj';if(x.includes('lohamandi')||x.includes('lohamand'))return'Lohamandi';return null}
function controlRow(E,z){let r=(E.wardRows||[]).find(x=>x.zone===z&&(n(x.ri).includes('unassigned')||n(x.ward).includes('ambiguous')||n(x.ward).includes('unclear')));if(!r){r={zone:z,wardNo:'—',ward:'Needs Classification · Zone Known',ri:'Unresolved / Needs Classification',post:'Control',applications:0,approved:0,inProcess:0,rejected:0,applicantPending:0,demand:0,receivedSummary:0,paidApplicants:0,receipts:0,collection:0};E.wardRows.push(r)}return r}
function addUnresolvedRiRows(E){const clean=(E.riRows||[]).filter(r=>!n(r.ri).includes('unresolved')&&!n(r.ri).includes('unassigned'));for(const z of ZONES){const rows=(E.wardRows||[]).filter(r=>r.zone===z&&(n(r.ri).includes('unresolved')||n(r.ri).includes('unassigned')||n(r.ward).includes('ambiguous')||n(r.ward).includes('unclear')));if(!rows.length)continue;const x={zone:z,ri:'Unresolved / Needs Classification',post:'Control',applications:0,approved:0,inProcess:0,rejected:0,applicantPending:0,demand:0,receivedSummary:0,paidApplicants:0,receipts:0,collection:0,wards:rows.length};for(const r of rows)for(const f of ['applications','approved','inProcess','rejected','applicantPending','demand','receivedSummary','paidApplicants','receipts','collection'])x[f]+=num(r[f]);clean.push(x)}E.riRows=clean.sort((a,b)=>a.zone.localeCompare(b.zone)||a.ri.localeCompare(b.ri))}
function allocate(E){if(!E?.loaded||!E.controls?.city)return;
 let fallbackReceipts=0,fallbackAmount=0;
 for(const p of E.payments||[]){if(p['Property zone'])continue;const z=zoneNorm(p['Receipt zone (source)']);if(!z||!E.controls.zones?.[z])continue;const a=num(p['Amount (INR)']);p['Property zone']=z;p['Property ward']=null;p['Property RI']='Unresolved / Needs Classification';p['Zone allocation basis']='Receipt/source zone fallback only — actual property Ward/RI unresolved';E.controls.zones[z].collection=num(E.controls.zones[z].collection)+a;E.controls.zones[z].receipts=num(E.controls.zones[z].receipts)+1;const r=controlRow(E,z);r.collection=num(r.collection)+a;r.receipts=num(r.receipts)+1;fallbackReceipts++;fallbackAmount+=a}
 addUnresolvedRiRows(E);
 E.unresolvedAllocation={fallbackReceipts,fallbackAmount,rule:'City totals always retain valid records. If actual property Ward/RI is unresolved but one zone is safely known, retain the record in that zone under Unresolved / Needs Classification. Receipt source zone is used only as a last-resort zone-level fallback when no property zone is available; it never overrides known property ownership.'};
 if(E.classifierAudit)E.classifierAudit.unresolvedAllocation=E.unresolvedAllocation;
 const notice=document.getElementById('classificationNotice');if(notice&&fallbackReceipts)notice.textContent+=` ${fallbackReceipts} receipt(s) without property-zone evidence were retained at zone level using their explicit receipt/source zone; Ward/RI remain unresolved.`;
}
window.__applyUnresolvedAllocation=()=>allocate(window.OTS7);
window.processReportSet=async function(){const out=await oldProcess.apply(this,arguments);allocate(window.OTS7);if(window.renderAll)window.renderAll();return out};
window.processWorkbook=window.processReportSet;
console.log('OTS unresolved allocation rule active');
})();