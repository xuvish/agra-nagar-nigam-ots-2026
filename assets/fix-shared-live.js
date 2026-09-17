(function(){
'use strict';
const SB_URL='https://pdtongvzntgvwnkhkxti.supabase.co';
const SB_ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkdG9uZ3Z6bnRndndua2hreHRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2MzI4NjksImV4cCI6MjEwNTIwODg2OX0.sbVietTp-puCRQrkTocoYpJ7g0eYDCSwDiYrxg-xPfw';
const AUTH_KEY='ots_admin_session_v1';
const CACHE_KEY='ots_shared_snapshot_cache_v2';
const ZONES=['Chhatta','Hariparwat','Tajganj','Lohamandi'];
window.SHARED_LIVE=null;
window.__otsAdminCred=null;
window.__otsSharedState={source:'loading',updatedAt:null,error:null};

function n(v){return String(v??'').trim().toLowerCase()}
function zNorm(v){const x=n(v).replace(/[^a-z]/g,'');if(/chh?atta|chhata|chatta/.test(x))return'Chhatta';if(x.includes('haripar')||x.includes('harpar'))return'Hariparwat';if(x.includes('tajganj'))return'Tajganj';if(x.includes('lohamandi')||x.includes('lohamand'))return'Lohamandi';return null}
function stage(s){const x=n(s);if(x.includes('applicant')||x.startsWith('respected'))return'With Applicant';if(x.includes('cto'))return'CTO';if(/\bri\b/.test(x)||x.includes('(ri)'))return'RI';if(/\bts\b/.test(x)||x.includes('(ts)'))return'TS';return'Other'}
function round2(v){return Math.round((Number(v)||0)*100)/100}
function sum(rows,key){return (rows||[]).reduce((s,r)=>s+(Number(r?.[key])||0),0)}
function appNo(r){return String(r?.['Application number']||'').trim()}
function isApproved(a){return n(a?.['Application status'])==='approved'}
function isRejected(a){return /reject|cancel/.test(n(a?.['Application status']))}
function appZone(a){const z=String(a?.['Allocated zone']||a?._r?.zone||'').trim();return ZONES.includes(z)?z:null}
function blankStages(){return{CTO:0,RI:0,TS:0,'With Applicant':0,Other:0}}

function paymentMetrics(E){
 const apps=E.apps||[],approvedSet=new Set(apps.filter(isApproved).map(appNo).filter(Boolean));
 const appZoneMap=new Map();for(const a of apps){const k=appNo(a),z=appZone(a);if(k&&z)appZoneMap.set(k,z)}
 for(const p of E.payments||[]){const k=appNo(p),z=p['Property zone'];if(k&&ZONES.includes(z)&&!appZoneMap.has(k))appZoneMap.set(k,z)}
 const started=new Set(),full=new Set(),part=new Set();
 for(const r of E.paidRows||[]){const k=appNo(r);if(!k||!approvedSet.has(k))continue;started.add(k);const state=String(r['Payment state']||'').toUpperCase();if(state==='FULL')full.add(k);else if(state==='PART')part.add(k)}
 for(const r of E.payments||[]){const k=appNo(r);if(k&&approvedSet.has(k))started.add(k)}
 for(const k of full)part.delete(k);
 const zoneSets=Object.fromEntries(ZONES.map(z=>[z,{started:new Set(),full:new Set(),part:new Set()}]));
 for(const k of started){const z=appZoneMap.get(k);if(z)zoneSets[z].started.add(k)}
 for(const k of full){const z=appZoneMap.get(k);if(z)zoneSets[z].full.add(k)}
 for(const k of part){const z=appZoneMap.get(k);if(z)zoneSets[z].part.add(k)}
 const zones={};for(const z of ZONES){const approved=Number(E.controls?.zones?.[z]?.approved)||0,s=zoneSets[z];zones[z]={approved,paymentStartedApproved:s.started.size,fullPaidApproved:s.full.size,partPaidApproved:s.part.size,paymentPendingApproved:Math.max(0,approved-s.started.size)}}
 const approved=Number(E.controls?.city?.approved)||approvedSet.size;
 return{city:{approved,paymentStartedApproved:started.size,fullPaidApproved:full.size,partPaidApproved:part.size,paymentPendingApproved:Math.max(0,approved-started.size)},zones};
}

function workflowMetrics(E){
 const city=blankStages();for(const a of E.inprocess||[]){const s=stage(a['Pending with']);city[s]=(city[s]||0)+1}
 const byZone=Object.fromEntries(ZONES.map(z=>[z,blankStages()])),unallocated=blankStages();
 for(const a of E.apps||[]){if(isApproved(a)||isRejected(a))continue;const s=stage(a['Pending with']),z=appZone(a);if(z)byZone[z][s]=(byZone[z][s]||0)+1;else unallocated[s]=(unallocated[s]||0)+1}
 return{city,byZone,unallocated};
}

function aggregate(E){
 const cityDaily={},zoneDaily=Object.fromEntries(ZONES.map(z=>[z,{}])),cash={},zoneCash=Object.fromEntries(ZONES.map(z=>[z,{}])),cross={};
 const bump=(m,k,a)=>{m[k]??={receipts:0,amount:0};m[k].receipts++;m[k].amount+=Number(a)||0};
 for(const p of E.payments||[]){const d=p['Payment date'],a=Number(p['Amount (INR)']||0),z=p['Property zone'],c=p['Cashier / channel']||'Unknown';if(d)bump(cityDaily,d,a);if(z&&zoneDaily[z]&&d)bump(zoneDaily[z],d,a);bump(cash,c,a);if(z&&zoneCash[z])bump(zoneCash[z],c,a);const src=zNorm(p['Receipt zone (source)']);if(src&&z&&src!==z){const k=[src,z,c].join('|');cross[k]??={sourceZone:src,propertyZone:z,cashier:c,receipts:0,amount:0};cross[k].receipts++;cross[k].amount+=a}}
 const daily=m=>Object.entries(m).sort((a,b)=>a[0].localeCompare(b[0])).map(([date,x])=>({date,receipts:x.receipts,amount:round2(x.amount)}));
 const cashier=m=>Object.entries(m).map(([name,x])=>({name,receipts:x.receipts,amount:round2(x.amount)})).sort((a,b)=>b.amount-a.amount);
 const zoneCashiers={};for(const z of ZONES)zoneCashiers[z]=Object.entries(zoneCash[z]).map(([cashier,x])=>({cashier,receipts:x.receipts,amount:round2(x.amount)})).sort((a,b)=>b.amount-a.amount);
 const pm=paymentMetrics(E),wf=workflowMetrics(E);
 const city={...(E.controls?.city||{}),...pm.city};
 const zones={};for(const z of ZONES)zones[z]={...(E.controls?.zones?.[z]||{}),...pm.zones[z]};
 const unresolvedRows=E.unresolved||[],controlRows=(E.wardRows||[]).filter(r=>n(r?.ri).includes('unassigned')||n(r?.ri).includes('unresolved')||n(r?.ward).includes('genuinely ambiguous')||n(r?.ward).includes('needs classification'));
 const unresolved={applications:sum(unresolvedRows,'applications'),approved:sum(unresolvedRows,'approved'),inProcess:sum(unresolvedRows,'inProcess'),rejected:sum(unresolvedRows,'rejected'),summaryReceived:round2(sum(unresolvedRows,'receivedSummary')),demand:round2(sum(unresolvedRows,'demand')),payingApps:sum(controlRows,'paidApplicants'),receipts:sum(controlRows,'receipts'),collection:round2(sum(controlRows,'collection')),unresolvedWard:round2(sum(controlRows,'collection'))};
 const audit=E.classifierAudit||null,sourceAudit=E.sourceAuthorityAudit||null;
 const classifier=audit?{version:audit.version||null,lockedRosterRows:audit.lockedRosterRows||0,propertyContextKeys:audit.propertyContextKeys||0,unresolvedRows:audit.unresolvedRows||0,unresolvedApps:audit.unresolvedApps||0,unresolvedApproved:audit.unresolvedApproved||0,unresolvedInProcess:audit.unresolvedInProcess||0,paymentIssueCount:(audit.paymentIssues||[]).length,zoneSums:audit.zoneSums||null,wardSums:audit.wardSums||null,riSums:audit.riSums||null}:null;
 return{snapshot:E.snapshot,city,zones,cityDaily:daily(cityDaily),zoneDaily:Object.fromEntries(ZONES.map(z=>[z,daily(zoneDaily[z])])),cashiers:cashier(cash),zoneCashiers,crossZone:Object.values(cross).map(x=>({...x,amount:round2(x.amount)})),roster:PUBLIC.roster,workflowCity:wf.city,stageByZone:wf.byZone,workflowUnallocated:wf.unallocated,paymentMetrics:pm,wardRows:E.wardRows||[],riRows:E.riRows||[],joint:{applications:0,approved:0,inProcess:0,rejected:0,summaryReceived:0,demand:0,payingApps:0,collection:0,unresolvedWard:0},unresolved,meta:{sourceFiles:E.files||[],classifier,sourceAuthority:sourceAudit?{identityPassed:!!sourceAudit.identityPassed,cityToZoneGap:sourceAudit.cityToZoneGap||null,fullPaymentRows:sourceAudit.fullPaymentRows||0,partPaymentRows:sourceAudit.partPaymentRows||0,receipts:sourceAudit.receipts||0}:null,detailedRowsPublished:false,engine:'shared-v3'}};
}

function cacheShared(payload,updatedAt){try{localStorage.setItem(CACHE_KEY,JSON.stringify({updatedAt:updatedAt||new Date().toISOString(),payload}))}catch(e){console.warn('Shared snapshot cache unavailable',e)}}
function cachedShared(){try{return JSON.parse(localStorage.getItem(CACHE_KEY)||'null')}catch(e){return null}}
function applyShared(p,updatedAt,source='live'){
 if(!p)return;
 window.SHARED_LIVE=p;
 window.__otsLastUpdatedAt=updatedAt||window.__otsLastUpdatedAt||null;
 window.__otsSharedState={source,updatedAt:window.__otsLastUpdatedAt,error:null};
 for(const k of ['snapshot','city','zones','cityDaily','zoneDaily','cashiers','zoneCashiers','crossZone','roster','stageByZone','workflowCity','workflowUnallocated','paymentMetrics','riRows','wardRows','joint','unresolved','meta'])if(p[k]!=null)PUBLIC[k]=p[k];
 const label=document.getElementById('modeLabel');if(label)label.textContent=`LIVE PUBLISHED · THROUGH ${String(p.snapshot||'').toUpperCase()}`;
 const integrity=document.getElementById('integrity');if(integrity)integrity.textContent='LIVE RECONCILED';
 if(source==='live')cacheShared(p,updatedAt);
 if(window.rebuildDateSelector)rebuildDateSelector();if(window.renderAll)renderAll();
 document.dispatchEvent(new CustomEvent('ots:shared-applied',{detail:{source,updatedAt:window.__otsLastUpdatedAt}}));
}
async function loadShared(){
 try{
  const r=await fetch(`${SB_URL}/rest/v1/ots_live_snapshot?select=snapshot_date,updated_at,payload&is_current=eq.true&order=id.desc&limit=1`,{headers:{apikey:SB_ANON,Authorization:`Bearer ${SB_ANON}`},cache:'no-store'});
  if(!r.ok)throw Error(`Live snapshot request failed (${r.status})`);
  const rows=await r.json();if(rows&&rows[0]?.payload){applyShared(rows[0].payload,rows[0].updated_at,'live');return}
  throw Error('No current live snapshot returned');
 }catch(e){
  console.warn('Shared live load failed',e);const c=cachedShared();
  if(c?.payload){applyShared(c.payload,c.updatedAt,'cache');window.__otsSharedState.error=String(e?.message||e);return}
  window.__otsSharedState={source:'fallback',updatedAt:null,error:String(e?.message||e)};document.dispatchEvent(new CustomEvent('ots:shared-failed',{detail:window.__otsSharedState}));
 }
}
async function publishShared(payload){let cred=window.__otsAdminCred;if(!cred?.password){const password=prompt('Enter admin password once to publish this update live:');if(!password)throw Error('Live publish cancelled');cred={username:'9997096978',password};window.__otsAdminCred=cred}const r=await fetch(`${SB_URL}/functions/v1/publish-ots-snapshot`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:cred.username,password:cred.password,snapshot_date:payload.snapshot,payload,source_files:payload.meta?.sourceFiles||[]})});const out=await r.json().catch(()=>({}));if(!r.ok)throw Error(out.error||'Live publish failed');return out}

window.__buildSharedPayload=aggregate;
window.__reloadSharedLive=loadShared;
document.addEventListener('submit',e=>{if(e.target?.id==='adminLoginForm'){const u=document.getElementById('adminUser')?.value?.trim(),p=document.getElementById('adminPass')?.value;if(u&&p)window.__otsAdminCred={username:u,password:p}}},true);
const oldOpen=window.openReports;window.openReports=function(){if(sessionStorage.getItem(AUTH_KEY)==='1'&&!window.__otsAdminCred)sessionStorage.removeItem(AUTH_KEY);return oldOpen.apply(this,arguments)};
const oldProcess=window.processReportSet||window.processWorkbook;window.processReportSet=async function(){const out=await oldProcess.apply(this,arguments);if(window.OTS7?.loaded){try{const payload=aggregate(window.OTS7);const pub=await publishShared(payload);const stamp=pub?.updated_at||pub?.updatedAt||new Date().toISOString();applyShared(payload,stamp,'live');if(window.uploadMessage)uploadMessage(`LIVE published through ${payload.snapshot} · ${payload.city.applications} apps · ${payload.city.approved} approved · ${payload.city.inProcess} in-process · ${payload.city.receipts} receipts · ₹${Number(payload.city.collection||0).toLocaleString('en-IN')}.`,true)}catch(e){console.error(e);if(window.uploadMessage)uploadMessage(`Calculated locally, but live publish failed: ${e.message}`,false)}}return out};window.processWorkbook=window.processReportSet;const submit=document.querySelector('#reportModal .btn.primary');if(submit)submit.onclick=window.processReportSet;

const oldRI=window.renderRIWardPerformance;window.renderRIWardPerformance=function(){if(window.OTS7?.loaded||!window.SHARED_LIVE)return oldRI&&oldRI();const z=selectedZone(),q=n(document.getElementById('search')?.value),ris=(SHARED_LIVE.riRows||[]).filter(r=>(z==='All'||r.zone===z)&&(!q||n(`${r.zone} ${r.ri}`).includes(q))),wards=(SHARED_LIVE.wardRows||[]).filter(r=>(z==='All'||r.zone===z)&&(!q||n(`${r.zone} ${r.ward} ${r.wardNo} ${r.ri}`).includes(q)));if(document.getElementById('riPerfBody'))document.getElementById('riPerfBody').innerHTML=ris.map(r=>`<tr><td>${r.zone}</td><td><b>${r.ri}</b></td><td class="num">${r.applications}</td><td class="num">${r.approved}</td><td class="num">${r.inProcess}</td><td class="num">${r.paidApplicants}</td><td class="num">${r.receipts}</td><td class="num">₹${Number(r.collection||0).toLocaleString('en-IN')}</td><td class="num">—</td><td class="num">—</td><td class="num">${r.applicantPending||0}</td></tr>`).join('');if(document.getElementById('wardPerfBody'))document.getElementById('wardPerfBody').innerHTML=wards.map(r=>`<tr><td>${r.zone}</td><td>${r.wardNo}</td><td><b>${r.ward}</b></td><td>${r.ri}</td><td class="num">${r.applications}</td><td class="num">${r.approved}</td><td class="num">${r.inProcess}</td><td class="num">${r.paidApplicants}</td><td class="num">${r.receipts}</td><td class="num">₹${Number(r.collection||0).toLocaleString('en-IN')}</td></tr>`).join('')};
const oldWorkflow=window.renderWorkflow;window.renderWorkflow=function(){if(window.OTS7?.loaded||!window.SHARED_LIVE)return oldWorkflow&&oldWorkflow();const z=selectedZone(),box=document.getElementById('workflowCards'),hint=document.getElementById('workflowHint');if(!box||!hint)return;if(z==='All'){const c=SHARED_LIVE.workflowCity||{};box.innerHTML=[['CTO',c.CTO||0],['RI',c.RI||0],['TS',c.TS||0],['With Applicant',c['With Applicant']||0],['Other / IT',c.Other||0]].map(x=>`<div class="mini"><span>${x[0]}</span><b>${x[1]}</b></div>`).join('');hint.textContent=`Published detailed in-process control · ${(PUBLIC.city?.inProcess||0)} applications.`}else{const c=SHARED_LIVE.stageByZone?.[z]||{},tot=Object.values(c).reduce((s,v)=>s+(Number(v)||0),0),zone=PUBLIC.zones?.[z]||{};box.innerHTML=`<div class="mini"><span>Total In Process</span><b>${zone.inProcess||0}</b></div><div class="mini"><span>CTO</span><b>${c.CTO||0}</b></div><div class="mini"><span>RI</span><b>${c.RI||0}</b></div><div class="mini"><span>TS</span><b>${c.TS||0}</b></div><div class="mini"><span>With Applicant</span><b>${c['With Applicant']||0}</b></div><div class="mini"><span>Other / Unallocated</span><b>${Math.max(0,(zone.inProcess||0)-tot)+(c.Other||0)}</b></div>`;hint.textContent=`${z} · workflow stage split from individually resolved applications; unresolved source rows remain in zone total without fabrication.`}};
loadShared();
})();