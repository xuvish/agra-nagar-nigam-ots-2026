(function(){
'use strict';
const N=v=>String(v??'').trim();
const normKey=v=>N(v).toLowerCase().replace(/[^a-z0-9]+/g,'');
const appNo=r=>N(r?.['Application number']||r?.AppNo||r?.['Application No']||r?.['Application No.']);
const numv=v=>{const x=Number(String(v??0).replace(/,/g,''));return Number.isFinite(x)?x:0};
const mobileOf=r=>N(r?.['Mobile (masked)']||r?.['Mobile No.']||r?.['Mobile No']||r?.Mobile||r?.['Mobile Number']);
function localReady(){return typeof LOCAL!=='undefined'&&LOCAL&&Array.isArray(LOCAL.applications)&&Array.isArray(LOCAL.payments)}
function paidSet(){const s=new Set();if(!localReady())return s;for(const p of LOCAL.payments){const k=appNo(p);if(k)s.add(k)}return s}
function rosterResolve(a){
  const z=N(a?.['Allocated zone']),w=N(a?.['Allocated ward']),ri=N(a?.['Allocated RI / TC']);
  if(z&&w&&ri)return{zone:z,ward:w,ri};
  const uid=N(a?.['Property UID']);
  if(uid&&typeof window.__resolveWardTight==='function'){
    try{const d=window.__resolveWardTight(z,w,uid);if(d?.row)return{zone:d.row.zone,ward:d.row.ward,ri:d.row.ri}}catch(e){}
  }
  return{zone:z||'',ward:w||'',ri:ri||''};
}
function enrichLocalApps(){
  if(!localReady())return[];
  const apps=LOCAL.applications.map(a=>{
    const x={...a},r=rosterResolve(x);
    if(r.zone)x['Allocated zone']=r.zone;if(r.ward)x['Allocated ward']=r.ward;if(r.ri)x['Allocated RI / TC']=r.ri;
    return x;
  });
  LOCAL.applications=apps;
  return apps;
}
function approvedPending(){
  const paid=paidSet();
  return enrichLocalApps().filter(a=>String(a['Application status']||'').trim().toLowerCase()==='approved'&&!paid.has(appNo(a)));
}
function sourceGap(){
  if(!localReady())return{applications:0,approved:0,inProcess:0,rejected:0};
  const city=LOCAL.controls?.city||{};
  const zones=Object.values(LOCAL.controls?.zones||{});
  const sum=k=>zones.reduce((s,z)=>s+numv(z?.[k]),0);
  return{
    applications:Math.max(0,numv(city.applications)-sum('applications')),
    approved:Math.max(0,numv(city.approved)-sum('approved')),
    inProcess:Math.max(0,numv(city.inProcess)-sum('inProcess')),
    rejected:Math.max(0,numv(city.rejected)-sum('rejected'))
  };
}
const PREV_KPI=window.renderKPIs;
window.renderKPIs=function(){
  PREV_KPI&&PREV_KPI();
  if(!localReady())return;
  const gap=sourceGap(),count=gap.applications||0;
  const card=[...document.querySelectorAll('.kpi')].find(k=>['Needs Classification','Source Exceptions'].includes(k.querySelector('.lab')?.textContent.trim()));
  if(!card)return;
  card.querySelector('.lab').textContent='Source Exceptions';
  card.querySelector('.val').textContent=num(count);
  card.querySelector('.sub').textContent=count?`${num(count)} city-level record(s) await newer Zone/Ward Summary evidence`:'No manual application classification';
  card.classList.remove('alert');
};
window.queueRows=function(){return[]};
window.renderQueue=function(){
  const box=$('queueBox'),sum=$('queueSummary');if(!box||!sum)return;
  if(!localReady()){sum.textContent='Upload the seven reports to run multi-report reconciliation.';box.innerHTML='';return}
  const gap=sourceGap(),count=gap.applications||0;
  const tab=document.querySelector('.tab[data-tab="classify"]');if(tab)tab.textContent='Source Exceptions';
  const h=document.querySelector('#classify h3');if(h)h.textContent='Source Exceptions';
  const hint=document.querySelector('#classify .hint');if(hint)hint.textContent='Audit-only source timing gaps after automatic seven-report reconciliation. Individual applications are not sent to manual classification.';
  sum.innerHTML=`<b>0 individual applications</b> require manual classification.${count?` <b>${num(count)}</b> application(s) are newer than the Zone/Ward Summary and remain counted citywide until that summary catches up.`:' All supplied report evidence is reconciled automatically.'}`;
  box.innerHTML=count?`<div class="tablewrap"><table><thead><tr><th>Type</th><th class="num">Apps</th><th>Handling</th></tr></thead><tbody><tr><td>Report timing gap</td><td class="num">${num(count)}</td><td>Counted in Nagar Nigam city total · no guessed Zone/Ward/RI</td></tr></tbody></table></div>`:'<div style="padding:30px;text-align:center"><div style="font-size:32px;color:#8affdf">✓</div><b>No Manual Classification Required</b><div style="color:#6f8ca0;font-size:10px;margin-top:6px">All usable evidence is reconciled automatically across the seven reports.</div></div>';
};
window.renderFollowup=function(){
  if(!localReady()){$('followHint').textContent='Upload the detailed seven-report set to generate the exact approved-payment-pending list.';$('followBody').innerHTML='';window.__followRows=[];return}
  const z=selectedZone(),q=norm($('search').value),all=approvedPending();
  const rows=all.filter(a=>z==='All'||N(a['Allocated zone'])===z).filter(a=>!q||[appNo(a),a['Applicant / owner'],a['Property UID'],a['House / property no.'],mobileOf(a),a['Allocated zone'],a['Allocated ward'],a['Allocated RI / TC']].some(v=>norm(v).includes(q)));
  window.__followRows=rows;
  const resolved=all.filter(a=>N(a['Allocated zone'])).length,mobiles=all.filter(a=>mobileOf(a)).length;
  $('followHint').innerHTML=`<b>${num(all.length)}</b> approved applicants have no receipt/payment record in the loaded seven-report set. <b>${num(resolved)}</b> have safe property-zone evidence. <b>${num(mobiles)}</b> have a contact value available from the supplied reports; missing mobile numbers are not guessed.`;
  $('followBody').innerHTML=rows.slice(0,2000).map(a=>`<tr><td>${esc(appNo(a)||'—')}</td><td>${esc(a['Applicant / owner']||'—')}</td><td>${esc(mobileOf(a)||'—')}</td><td>${esc(a['Property UID']||'—')}</td><td>${esc(a['House / property no.']||'—')}</td><td>${esc(a['Allocated zone']||'Citywide')}</td><td>${esc(a['Allocated ward']||'—')}</td><td>${esc(a['Allocated RI / TC']||'—')}</td><td>${esc(a['Approval date']||a['Status date']||'—')}</td><td><span class="badge gold">PAYMENT PENDING</span></td></tr>`).join('')||'<tr><td colspan="10" style="text-align:center;padding:28px">No approved payment-pending applicant in this filter.</td></tr>';
};
window.printFollowup=function(){
  if(!localReady()){alert('Upload the seven reports first.');return}
  const rows=window.__followRows||approvedPending(),z=selectedZone();
  const w=window.open('','_blank','width=1200,height=800');if(!w){alert('Please allow pop-ups once for printing.');return}
  const trs=rows.map((a,i)=>`<tr><td>${i+1}</td><td>${esc(appNo(a)||'—')}</td><td>${esc(a['Applicant / owner']||'—')}</td><td>${esc(mobileOf(a)||'—')}</td><td>${esc(a['Property UID']||'—')}</td><td>${esc(a['House / property no.']||'—')}</td><td>${esc(a['Allocated zone']||'Citywide')}</td><td>${esc(a['Allocated ward']||'—')}</td><td>${esc(a['Allocated RI / TC']||'—')}</td><td>${esc(a['Approval date']||a['Status date']||'—')}</td></tr>`).join('');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>OTS Payment Follow-up</title><style>body{font:12px Arial;padding:22px;color:#111}table{border-collapse:collapse;width:100%}th,td{border:1px solid #bbb;padding:6px;text-align:left;font-size:10px}th{background:#eee}@media print{thead{display:table-header-group}}</style></head><body><h1>Agra Nagar Nigam · OTS 2026-27</h1><p>Approved · Payment Pending · ${esc(z==='All'?'All Zones':z)} · Total ${rows.length}</p><table><thead><tr><th>#</th><th>Application</th><th>Applicant</th><th>Mobile</th><th>Property UID</th><th>House No.</th><th>Zone</th><th>Ward</th><th>RI / TC</th><th>Approved On</th></tr></thead><tbody>${trs}</tbody></table><script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);w.document.close();
};
function applyBridge(){if(!localReady())return;enrichLocalApps();const notice=document.getElementById('classificationNotice');if(notice)notice.textContent='Multi-report reconciliation active. Individual applications are auto-linked from the loaded report set; only report-level source timing gaps are shown as exceptions.';if(window.renderAll)window.renderAll()}
window.__applyLocalIntelligenceBridge=applyBridge;
setTimeout(applyBridge,0);
console.log('OTS LOCAL intelligence bridge active');
})();