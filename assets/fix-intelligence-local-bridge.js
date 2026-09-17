(function(){
'use strict';
const N=v=>String(v??'').trim();
const normKey=v=>N(v).toLowerCase().replace(/[^a-z0-9]+/g,'');
const normText=v=>N(v).toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const appNo=r=>N(r?.['Application number']||r?.AppNo||r?.['Application No']||r?.['Application No.']);
const numv=v=>{const x=Number(String(v??0).replace(/,/g,''));return Number.isFinite(x)?x:0};
const mobileOf=r=>N(r?.['Mobile (masked)']||r?.['Mobile No.']||r?.['Mobile No']||r?.Mobile||r?.['Mobile Number']);
const isFullMobile=v=>/^(?:\+91[- ]?)?[6-9]\d{9}$/.test(N(v).replace(/\s+/g,''));
function localReady(){return typeof LOCAL!=='undefined'&&LOCAL&&Array.isArray(LOCAL.applications)&&Array.isArray(LOCAL.payments)}
function paidSet(){const s=new Set();if(!localReady())return s;for(const p of LOCAL.payments){const k=appNo(p);if(k)s.add(k)}return s}
function addEvidence(map,key,value){key=normKey(key);if(!key||!value)return;const s=map.get(key)||new Set();s.add(value);map.set(key,s)}
function one(map,key){const s=map.get(normKey(key));return s&&s.size===1?[...s][0]:null}
function buildPaidPropertyEvidence(){
  const uidZone=new Map(),houseZone=new Map(),uidMobile=new Map(),houseMobile=new Map();
  if(!localReady())return{uidZone,houseZone,uidMobile,houseMobile};
  for(const p of LOCAL.payments){
    const z=N(p['Actual property zone']||p['Allocated zone']);
    const uid=N(p['Property UID']);
    const house=N(p['Application house no.']||p['Receipt property no.']||p['House / property no.']);
    const mob=mobileOf(p);
    if(z){addEvidence(uidZone,uid,z);addEvidence(houseZone,house,z)}
    if(mob){addEvidence(uidMobile,uid,mob);addEvidence(houseMobile,house,mob)}
  }
  return{uidZone,houseZone,uidMobile,houseMobile};
}
function rosterResolve(a){
  const z=N(a?.['Allocated zone']),w=N(a?.['Allocated ward']),ri=N(a?.['Allocated RI / TC']);
  if(z&&w&&ri)return{zone:z,ward:w,ri,basis:'Existing property allocation'};
  const uid=N(a?.['Property UID']);
  if(uid&&typeof window.__resolveWardTight==='function'){
    try{const d=window.__resolveWardTight(z,w,uid);if(d?.row)return{zone:d.row.zone,ward:d.row.ward,ri:d.row.ri,basis:'Property UID → locked Ward/RI roster'}}catch(e){}
  }
  return{zone:z||'',ward:w||'',ri:ri||'',basis:z?'Existing property-zone evidence':''};
}
function officerCallingZone(a){
  const pieces=[a?.['TS approver'],a?.['Approved By'],a?.['Pending with'],a?.['Latest remark'],a?.['Allocation basis']].filter(Boolean);
  const text=normText(pieces.join(' | '));
  if(!text)return null;
  if(text.includes('sheetal gupta')||text.includes('shital gupta'))return{zone:'Chhatta',basis:'Final approval / officer evidence · Sheetal/Shital Gupta'};
  if(text.includes('akshay kumar'))return{zone:'Hariparwat',basis:'Final approval / officer evidence · Akshay Kumar'};
  if(text.includes('rambabu')||text.includes('ram babu')){
    if(text.includes('tajganj'))return{zone:'Tajganj',basis:'Final approval / officer evidence · Rambabu · Tajganj'};
    if(text.includes('lohamandi'))return{zone:'Lohamandi',basis:'Final approval / officer evidence · Rambabu · Lohamandi'};
  }
  const hits=[];
  for(const r of (PUBLIC.roster||[])){
    const name=normText(r.ri);if(name.length<4)continue;
    if(text.includes(name))hits.push({zone:r.zone,name:r.ri});
  }
  const zones=[...new Set(hits.map(x=>x.zone))];
  if(zones.length===1)return{zone:zones[0],basis:`RI/TC officer evidence · ${hits[0]?.name||'roster match'}`};
  return null;
}
function propertyCallingZone(a,ev){
  const uid=N(a?.['Property UID']),house=N(a?.['House / property no.']);
  const uz=one(ev.uidZone,uid),hz=one(ev.houseZone,house);
  if(uz&&hz&&uz!==hz)return null;
  const z=uz||hz;
  return z?{zone:z,basis:uz?'Exact Property UID → paid property evidence':'Exact Property No → paid property evidence'}:null;
}
function recoverContact(a,ev){
  if(mobileOf(a))return;
  const uid=N(a?.['Property UID']),house=N(a?.['House / property no.']);
  const um=one(ev.uidMobile,uid),hm=one(ev.houseMobile,house);
  if(um&&hm&&um!==hm)return;
  const m=um||hm;if(!m)return;
  a['Mobile (masked)']=m;
  a['Mobile basis']=um?'Exact Property UID → Collection Report':'Exact Property No → Collection Report';
}
function callingAssignment(a,ev){
  const actual=N(a?.['Allocated zone']);
  if(actual)return{zone:actual,basis:N(a?.['Allocation basis'])||'Actual property evidence'};
  const p=propertyCallingZone(a,ev);if(p)return p;
  const off=officerCallingZone(a);if(off)return off;
  return{zone:'Citywide',basis:'No unique calling-zone evidence in supplied reports'};
}
function enrichLocalApps(){
  if(!localReady())return[];
  const ev=buildPaidPropertyEvidence();
  const apps=LOCAL.applications.map(a=>{
    const x={...a},r=rosterResolve(x);
    if(r.zone)x['Allocated zone']=r.zone;if(r.ward)x['Allocated ward']=r.ward;if(r.ri)x['Allocated RI / TC']=r.ri;
    if(r.basis&&r.zone)x['Allocation basis']=x['Allocation basis']||r.basis;
    recoverContact(x,ev);
    const call=callingAssignment(x,ev);x['Calling zone']=call.zone;x['Calling basis']=call.basis;
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
function setCallingHeader(){for(const th of document.querySelectorAll('#followup thead th'))if(th.textContent.trim()==='Zone')th.textContent='Calling Zone'}
window.renderFollowup=function(){
  if(!localReady()){$('followHint').textContent='Upload the detailed seven-report set to generate the exact approved-payment-pending list.';$('followBody').innerHTML='';window.__followRows=[];return}
  setCallingHeader();
  const z=selectedZone(),q=norm($('search').value),all=approvedPending();
  const rows=all.filter(a=>z==='All'||N(a['Calling zone'])===z).filter(a=>!q||[appNo(a),a['Applicant / owner'],a['Property UID'],a['House / property no.'],mobileOf(a),a['Calling zone'],a['Allocated ward'],a['Allocated RI / TC'],a['TS approver']].some(v=>norm(v).includes(q)));
  window.__followRows=rows;
  const by={Chhatta:0,Hariparwat:0,Tajganj:0,Lohamandi:0,Citywide:0};for(const a of all){const k=N(a['Calling zone'])||'Citywide';by[k]=(by[k]||0)+1}
  const assigned=all.length-(by.Citywide||0),contactRows=all.filter(a=>mobileOf(a)).length,fullMobiles=all.filter(a=>isFullMobile(mobileOf(a))).length,masked=Math.max(0,contactRows-fullMobiles);
  $('followHint').innerHTML=`<b>${num(all.length)}</b> approved applicants have no receipt/payment record. <b>${num(assigned)}</b> are assigned to a Calling Zone using property/UID evidence first, then final TS or unique RI/TC evidence. Chhatta <b>${num(by.Chhatta||0)}</b> · Hariparwat <b>${num(by.Hariparwat||0)}</b> · Tajganj <b>${num(by.Tajganj||0)}</b> · Lohamandi <b>${num(by.Lohamandi||0)}</b>${by.Citywide?` · Citywide <b>${num(by.Citywide)}</b>`:''}. Contact evidence: <b>${num(fullMobiles)}</b> full mobile · <b>${num(masked)}</b> masked mobile recovered by exact property match. Masked digits are never guessed into a full number.`;
  $('followBody').innerHTML=rows.slice(0,2000).map(a=>`<tr><td>${esc(appNo(a)||'—')}</td><td>${esc(a['Applicant / owner']||'—')}</td><td title="${esc(a['Mobile basis']||'')}">${esc(mobileOf(a)||'—')}</td><td>${esc(a['Property UID']||'—')}</td><td>${esc(a['House / property no.']||'—')}</td><td title="${esc(a['Calling basis']||'')}">${esc(a['Calling zone']||'Citywide')}</td><td>${esc(a['Allocated ward']||'—')}</td><td>${esc(a['Allocated RI / TC']||'—')}</td><td>${esc(a['Approval date']||a['Status date']||'—')}</td><td><span class="badge gold">PAYMENT PENDING</span></td></tr>`).join('')||'<tr><td colspan="10" style="text-align:center;padding:28px">No approved payment-pending applicant in this zone/filter.</td></tr>';
};
window.printFollowup=function(){
  if(!localReady()){alert('Upload the seven reports first.');return}
  const rows=window.__followRows||approvedPending(),z=selectedZone();
  const w=window.open('','_blank','width=1200,height=800');if(!w){alert('Please allow pop-ups once for printing.');return}
  const trs=rows.map((a,i)=>`<tr><td>${i+1}</td><td>${esc(appNo(a)||'—')}</td><td>${esc(a['Applicant / owner']||'—')}</td><td>${esc(mobileOf(a)||'—')}</td><td>${esc(a['Property UID']||'—')}</td><td>${esc(a['House / property no.']||'—')}</td><td>${esc(a['Calling zone']||'Citywide')}</td><td>${esc(a['Allocated ward']||'—')}</td><td>${esc(a['Approval date']||a['Status date']||'—')}</td></tr>`).join('');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>OTS Payment Follow-up</title><style>body{font:12px Arial;padding:22px;color:#111}table{border-collapse:collapse;width:100%}th,td{border:1px solid #bbb;padding:6px;text-align:left;font-size:10px}th{background:#eee}@media print{thead{display:table-header-group}}</style></head><body><h1>Agra Nagar Nigam · OTS 2026-27</h1><p>Approved · Payment Pending · Calling Zone: ${esc(z==='All'?'All Zones':z)} · Total ${rows.length}</p><table><thead><tr><th>#</th><th>Application</th><th>Applicant</th><th>Mobile</th><th>Property UID</th><th>House No.</th><th>Calling Zone</th><th>Ward (if known)</th><th>Approved On</th></tr></thead><tbody>${trs}</tbody></table><script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);w.document.close();
};
function applyBridge(){if(!localReady())return;enrichLocalApps();const notice=document.getElementById('classificationNotice');if(notice)notice.textContent='Multi-report reconciliation active. Payment follow-up uses a separate Calling Zone: actual property/UID evidence first, then exact property matches, then final TS / unique RI-TC evidence. This does not overwrite actual property ownership.';if(window.renderAll)window.renderAll()}
window.__applyLocalIntelligenceBridge=applyBridge;
setTimeout(applyBridge,0);
console.log('OTS LOCAL intelligence bridge + calling-zone + safe contact recovery active');
})();