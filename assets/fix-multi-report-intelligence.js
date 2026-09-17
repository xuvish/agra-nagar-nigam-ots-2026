(function(){
'use strict';
const PREV=window.processReportSet||window.processWorkbook;
const N=v=>String(v??'').trim();
const K=v=>N(v).toLowerCase().replace(/&amp;/g,'&').replace(/[^a-z0-9]+/g,'').trim();
const A=r=>N(r?.['Application number']||r?.AppNo||r?.['Application No']||r?.['Application No.']);
const V=v=>{const x=Number(String(v??0).replace(/,/g,''));return Number.isFinite(x)?x:0};
const ROSTER=()=>PUBLIC.roster||[];
const wardKey=r=>r?`${r.zone}|${r.wardNo}|${r.ward}|${r.ri}`:'';

function rowFromAllocated(r){
 const z=N(r?.['Allocated zone']),w=N(r?.['Allocated ward']),ri=N(r?.['Allocated RI / TC']);
 if(!z||!w||!ri)return null;
 const rr=ROSTER().find(x=>x.zone===z&&(N(x.ward)===w||Number(x.wardNo)===Number(w))&&N(x.ri)===ri);
 return rr||{zone:z,ward:w,wardNo:'—',ri,post:''};
}
function uniqueIndex(){return new Map()}
function addUnique(map,key,row){
 key=K(key);if(!key||!row)return;
 const cur=map.get(key);
 if(!cur){map.set(key,{row,conflict:false});return}
 if(wardKey(cur.row)!==wardKey(row))cur.conflict=true;
}
function getUnique(map,key){const x=map.get(K(key));return x&&!x.conflict?x.row:null}
function appDetailMap(rows){const m=new Map();for(const r of rows||[]){const k=A(r);if(k)m.set(k,r)}return m}
function safeTight(uid,zone='',ward=''){
 if(!uid||typeof window.__resolveWardTight!=='function')return null;
 try{const d=window.__resolveWardTight(zone,ward,uid);return d?.row||null}catch(e){return null}
}
function mobileValue(r){return N(r?.['Mobile (masked)']||r?.['Mobile No.']||r?.['Mobile No']||r?.Mobile||r?.['Mobile Number'])}
function enrich(E){
 if(!E?.loaded)return null;
 const appResolved=new Map(),uidResolved=uniqueIndex(),houseResolved=uniqueIndex(),uidMobile=new Map(),houseMobile=new Map();
 const approved=appDetailMap(E.approved),inproc=appDetailMap(E.inprocess);

 // Paid rows + Collection are the strongest individual property evidence in these seven reports.
 for(const p of E.payments||[]){
   const app=A(p), rr=rowFromAllocated({'Allocated zone':p['Property zone']||p['Allocated zone'],'Allocated ward':p['Property ward']||p['Allocated ward'],'Allocated RI / TC':p['Property RI']||p['Allocated RI / TC']});
   if(rr&&app)appResolved.set(app,rr);
   if(rr){addUnique(uidResolved,p['Property UID'],rr);addUnique(houseResolved,p['House / property no.']||p['Application house no.']||p['Receipt property no.'],rr)}
   const mob=mobileValue(p);if(mob){
     const uk=K(p['Property UID']),hk=K(p['House / property no.']||p['Application house no.']||p['Receipt property no.']);
     if(uk&&!uidMobile.has(uk))uidMobile.set(uk,mob);
     if(hk&&!houseMobile.has(hk))houseMobile.set(hk,mob);
   }
 }
 for(const pr of E.paidRows||[]){
   const app=A(pr),rr=appResolved.get(app)||safeTight(pr['Property UID'],pr['Raw zone'],pr['Raw ward']);
   if(rr){if(app)appResolved.set(app,rr);addUnique(uidResolved,pr['Property UID'],rr);addUnique(houseResolved,pr['House / property no.'],rr)}
 }

 let fullProperty=0,propertyLinked=0,uidLinked=0,mobileLinked=0;
 const enriched=(E.apps||[]).map(src=>{
   const a={...src},app=A(a),uid=N(a['Property UID']),house=N(a['House / property no.']);
   const ad=approved.get(app),ip=inproc.get(app);
   if(ad){a['Approval date']=a['Approval date']||ad['Approval date'];a['TS approver']=a['TS approver']||ad['TS approver'];a['Latest remark']=a['Latest remark']||ad['Latest remark']}
   if(ip){a['Pending with']=a['Pending with']||ip['Pending with'];a['Pending days']=a['Pending days']||ip['Pending days'];a['Received date']=a['Received date']||ip['Received date'];a['Latest remark']=a['Latest remark']||ip['Latest remark']}

   let rr=rowFromAllocated(a),basis=rr?'Existing report property allocation':'';
   if(!rr&&appResolved.has(app)){rr=appResolved.get(app);basis='Application No → FULL/PART/Collection property'}
   if(!rr){rr=getUnique(uidResolved,uid);if(rr){basis='Exact Property UID → paid property evidence';propertyLinked++}}
   if(!rr){rr=getUnique(houseResolved,house);if(rr){basis='Exact Property No → unique paid property evidence';propertyLinked++}}
   if(!rr){rr=safeTight(uid);if(rr){basis='Property UID ward code → locked Ward/RI roster';uidLinked++}}
   if(rr){a['Allocated zone']=rr.zone;a['Allocated ward']=rr.ward;a['Allocated RI / TC']=rr.ri;a['Allocation basis']=basis;fullProperty++}
   else{a['Allocation basis']=a['Allocation basis']||'Individual property ward not present in supplied reports; retained citywide, not a manual-classification task'}

   if(!mobileValue(a)){
     const mob=uidMobile.get(K(uid))||houseMobile.get(K(house));
     if(mob){a['Mobile (masked)']=mob;a['Mobile basis']='Exact property match to Collection Report';mobileLinked++}
   }
   return a;
 });
 E.apps=enriched;
 if(typeof LOCAL!=='undefined'&&LOCAL){LOCAL.applications=enriched;}
 E.multiReportAudit={version:'multi-report-v1',applications:enriched.length,fullPropertyResolved:fullProperty,exactPropertyLinked:propertyLinked,uidWardLinked:uidLinked,mobileLinked};
 return E.multiReportAudit;
}

function paidSet(){
 const E=window.OTS7,s=new Set();
 for(const r of E?.paidRows||[]){const k=A(r);if(k)s.add(k)}
 for(const r of E?.payments||[]){const k=A(r);if(k)s.add(k)}
 return s;
}
function approvedPendingRows(){
 const E=window.OTS7;if(!E?.loaded)return[];const paid=paidSet();
 return (E.apps||[]).filter(a=>String(a['Application status']||'').trim().toLowerCase()==='approved'&&!paid.has(A(a)));
}
function displayMobile(a){return mobileValue(a)||'—'}
function displayZone(a){return N(a['Allocated zone'])||'Citywide · property zone not in supplied detail'}
function displayWard(a){return N(a['Allocated ward'])||'—'}
function displayRI(a){return N(a['Allocated RI / TC'])||'—'}

function sourceControls(){
 const E=window.OTS7;if(!E?.loaded)return[];
 return (E.wardRows||[]).filter(r=>{const x=(N(r.ri)+' '+N(r.ward)).toLowerCase();return x.includes('unresolved')||x.includes('unassigned')||x.includes('zone control')||x.includes('source ward unclear')||x.includes('genuinely ambiguous')});
}
function sourcePaymentIssues(){return window.OTS7?.classifierAudit?.paymentIssues||[]}

const OLD_KPI=window.renderKPIs;
window.renderKPIs=function(){
 OLD_KPI&&OLD_KPI();
 if(!window.OTS7?.loaded)return;
 const card=[...document.querySelectorAll('.kpi')].find(k=>{const l=k.querySelector('.lab')?.textContent.trim();return l==='Needs Classification'||l==='Source Exceptions'});
 if(!card)return;
 const controls=sourceControls(),apps=controls.reduce((s,r)=>s+V(r.applications),0),amt=controls.reduce((s,r)=>s+V(r.collection),0),issues=sourcePaymentIssues().length;
 card.querySelector('.lab').textContent='Source Exceptions';
 card.querySelector('.val').textContent=(apps||issues)?`${num(apps||issues)}`:'0';
 card.querySelector('.sub').textContent=(apps||issues)?`${amt?money(amt)+' · ':''}retained in city/zone control`:'No manual application classification';
 card.classList.remove('alert');
};

window.queueRows=function(){return[]};
window.renderQueue=function(){
 const box=$('queueBox'),sum=$('queueSummary');if(!box||!sum)return;
 const E=window.OTS7;if(!E?.loaded){sum.textContent='Upload the seven reports to run multi-report reconciliation.';box.innerHTML='';return}
 const controls=sourceControls(),issues=sourcePaymentIssues(),gap=E.sourceAuthorityAudit?.cityToZoneGap||{};
 const gapApps=V(gap.applications),controlApps=controls.reduce((s,r)=>s+V(r.applications),0);
 window.__queue=[];
 sum.innerHTML=`<b>0 individual applications</b> require manual classification. The portal joins Application No, Property UID, Property No, FULL/PART property data and Collection data first. ${controlApps?`<b>${num(controlApps)}</b> aggregate source application(s) remain only in city/zone control because the source report itself does not expose a safe Ward→RI split.`:''}${gapApps?` <b>${num(gapApps)}</b> newer application(s) are counted citywide while the Zone/Ward Summary is one report-step behind.`:''}`;
 if(!controls.length&&!issues.length){box.innerHTML='<div style="padding:30px;text-align:center"><div style="font-size:32px;color:#8affdf">✓</div><b>No Manual Classification Required</b><div style="color:#6f8ca0;font-size:10px;margin-top:6px">All usable source evidence is automatically reconciled across the seven reports.</div></div>';return}
 let html='<div class="tablewrap"><table><thead><tr><th>Type</th><th>Zone / Source</th><th>Ward / Receipt</th><th class="num">Apps</th><th class="num">Receipts</th><th class="num">Amount</th><th>Handling</th></tr></thead><tbody>';
 for(const r of controls)html+=`<tr><td>Aggregate source control</td><td>${esc(r.zone||'Citywide')}</td><td>${esc(r.ward||'Source ward unavailable')}</td><td class="num">${num(r.applications||0)}</td><td class="num">${num(r.receipts||0)}</td><td class="num">${money(r.collection||0)}</td><td>Already retained in city/zone totals · no guessed RI</td></tr>`;
 for(const p of issues.slice(0,100))html+=`<tr><td>Payment source exception</td><td>${esc(p.rawZone||'Citywide')}</td><td>${esc(p.receipt||p.rawWard||'—')}</td><td class="num">—</td><td class="num">1</td><td class="num">${money(p.amount||0)}</td><td>${esc(p.reason||'Source evidence incomplete')}</td></tr>`;
 html+='</tbody></table></div>';box.innerHTML=html;
 const tab=document.querySelector('.tab[data-tab="classify"]');if(tab)tab.textContent='Source Exceptions';
 const h=document.querySelector('#classify h3');if(h)h.textContent='Source Exceptions';
 const hint=document.querySelector('#classify .hint');if(hint)hint.textContent='Audit-only source residues after automatic seven-report reconciliation. Individual applications are not sent to a manual queue merely because an unpaid record lacks Ward/RI fields.';
};

window.renderFollowup=function(){
 const E=window.OTS7;if(!E?.loaded){$('followHint').textContent='Upload the detailed seven-report set to generate the exact approved-payment-pending list.';$('followBody').innerHTML='';window.__followRows=[];return}
 const z=selectedZone(),q=norm($('search').value),all=approvedPendingRows();
 const rows=all.filter(a=>(z==='All'||N(a['Allocated zone'])===z)).filter(a=>!q||[A(a),a['Applicant / owner'],a['Property UID'],a['House / property no.'],displayMobile(a),a['Allocated zone'],a['Allocated ward'],a['Allocated RI / TC']].some(v=>norm(v).includes(q)));
 window.__followRows=rows;
 const resolvedAll=all.filter(a=>N(a['Allocated zone'])).length,mobileAll=all.filter(a=>displayMobile(a)!=='—').length;
 $('followHint').innerHTML=`<b>${num(all.length)}</b> exact approved applicants have no FULL/PART/Collection payment record citywide. This list is joined from Applicant Master + Approved + FULL/PART + Collection. <b>${num(resolvedAll)}</b> have safe individual property-zone evidence and <b>${num(mobileAll)}</b> have a contact value recoverable from the supplied reports. Missing mobile numbers are not fabricated.`;
 $('followBody').innerHTML=rows.slice(0,2000).map(a=>`<tr><td>${esc(A(a)||'—')}</td><td>${esc(a['Applicant / owner']||'—')}</td><td>${esc(displayMobile(a))}</td><td>${esc(a['Property UID']||'—')}</td><td>${esc(a['House / property no.']||'—')}</td><td>${esc(displayZone(a))}</td><td>${esc(displayWard(a))}</td><td>${esc(displayRI(a))}</td><td>${esc(a['Approval date']||a['Status date']||'—')}</td><td><span class="badge gold">PAYMENT PENDING</span></td></tr>`).join('')||'<tr><td colspan="10" style="text-align:center;padding:28px">No approved payment-pending applicant in this filter.</td></tr>';
};

window.printFollowup=function(){
 const rows=window.__followRows||[],z=selectedZone();if(!window.OTS7?.loaded){alert('Upload the seven reports first.');return}
 const w=window.open('','_blank','width=1200,height=800');if(!w){alert('Please allow pop-ups once for printing.');return}
 const trs=rows.map((a,i)=>`<tr><td>${i+1}</td><td>${esc(A(a)||'—')}</td><td>${esc(a['Applicant / owner']||'—')}</td><td>${esc(displayMobile(a))}</td><td>${esc(a['Property UID']||'—')}</td><td>${esc(a['House / property no.']||'—')}</td><td>${esc(displayZone(a))}</td><td>${esc(displayWard(a))}</td><td>${esc(displayRI(a))}</td><td>${esc(a['Approval date']||a['Status date']||'—')}</td></tr>`).join('');
 w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>OTS Payment Follow-up</title><style>body{font:12px Arial;padding:22px;color:#111}table{border-collapse:collapse;width:100%}th,td{border:1px solid #bbb;padding:6px;text-align:left;font-size:10px}th{background:#eee}@media print{thead{display:table-header-group}}</style></head><body><h1>Agra Nagar Nigam · OTS 2026-27</h1><p>Approved · Payment Pending · ${esc(z==='All'?'All Zones':z)} · Total ${rows.length}</p><table><thead><tr><th>#</th><th>Application</th><th>Applicant</th><th>Mobile</th><th>Property UID</th><th>House No.</th><th>Zone</th><th>Ward</th><th>RI / TC</th><th>Approved On</th></tr></thead><tbody>${trs}</tbody></table><script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);w.document.close();
};

const OLD_AUDIT=window.renderAudit;
window.renderAudit=function(){
 OLD_AUDIT&&OLD_AUDIT();
 const E=window.OTS7;if(!E?.loaded||!$('auditBox'))return;
 const c=E.controls?.city||{},s=E.sourceAuthorityAudit||{},m=E.multiReportAudit||{},controls=sourceControls();
 const items=[
  ['Applications Master',num(c.applications||0),'CONTROL'],['Approved',num(c.approved||0),'CONTROL'],['In Process',num(c.inProcess||0),'CONTROL'],['Rejected',num(c.rejected||0),'CONTROL'],
  ['Paid Applicants',num(c.payingApps||0),'RECONCILED'],['Receipts',num(c.receipts||0),'RECONCILED'],['Collection',money(c.collection||0),'RECONCILED'],
  ['Zone/Ward Summary apps',num(s.zoneSummaryApplications??0),(V(s.cityToZoneGap?.applications)?'1 CITY GAP':'CONTROL')],['Individual property rows auto-resolved',num(m.fullPropertyResolved||0),'MULTI-REPORT'],['Manual application classification','0','NOT REQUIRED'],['Aggregate source-control rows',num(controls.length),'AUDIT']
 ];
 $('auditBox').innerHTML=items.map(x=>`<div style="display:grid;grid-template-columns:1.4fr 1fr auto;gap:10px;padding:10px 0;border-bottom:1px solid rgba(104,236,255,.07)"><span>${x[0]}</span><b>${x[1]}</b><span class="badge ${x[2].includes('GAP')||x[2]==='AUDIT'?'gold':'green'}">${x[2]}</span></div>`).join('');
};

function applyIntelligence(){
 const E=window.OTS7;if(!E?.loaded)return null;const a=enrich(E);
 const notice=document.getElementById('classificationNotice');if(notice)notice.textContent='Multi-report reconciliation active: Application No, Property UID, Property No, FULL/PART property records and Collection receipts are joined before any exception is shown. Missing individual Ward/RI evidence is not treated as a manual classification backlog.';
 const tab=document.querySelector('.tab[data-tab="classify"]');if(tab)tab.textContent='Source Exceptions';
 if(window.renderAll)window.renderAll();return a;
}
window.__applyMultiReportIntelligence=applyIntelligence;
window.processReportSet=async function(){const out=await PREV.apply(this,arguments);applyIntelligence();return out};
window.processWorkbook=window.processReportSet;
const submit=document.querySelector('#reportModal .btn.primary');if(submit)submit.onclick=window.processReportSet;
console.log('OTS multi-report intelligence active');
})();
