(function(){
'use strict';
const confirmed={
 OTS092332609011105662:['Avas Vikas East',46,'Abhishek Dubey'],
 OTS092332609011534336:['Ajampada',41,'Sanjay Mohan Kulshrestha'],
 OTS092332609021052605:['Gadhi Bhadauriya',24,'Abhishek Dubey'],
 OTS092332609081305281:['Loha Mandi North','north','Abhishek Dubey'],
 OTS092332608311723556:['Gadhi Bhadauriya',24,'Abhishek Dubey'],
 OTS092332608311701539:['Jaipur House',74,'Ramveer Singh'],
 OTS092332609011231836:['Ram Mohan Nagar',89,'Meghna Gautam']
};
const held=new Set(['OTS092332608191815570','OTS092332608191815571','OTS092332608311709543','OTS092332609011532332','OTS092332609011541349','OTS092332609011554376','OTS092332609021110630','OTS092332609031023497','OTS092332609031023498','OTS092332609070930961','OTS092332609081044391','OTS092332609111314846','OTS092332609112238060','OTS092332609140846513','OTS092332609151508696','OTS092332609211041004']);
const id=r=>String(r['Application number']||'').trim();
window.__applyConfirmedAssignments=function(E){
 const financial=new Map((window.__otsFinancialRows||[]).map(r=>[String(r['Application No']).trim(),r]));
 const receipts=new Set(E.payments.map(id));
 for(const a of E.apps){
  const k=id(a),f=financial.get(k);if(f){a['Contact mobile']=String(f.Mobile||a['Contact mobile']||'');a['Property UID']=a['Property UID']||f['Property Code'];a['House / property no.']=a['House / property no.']||f['House No'];}
  if(held.has(k)&&!receipts.has(k)){a['Allocated zone']='';a['Allocated ward']='';a['Allocated RI / TC']='';continue}
  let row=null;if(confirmed[k]){const [ward,wardNo,ri]=confirmed[k];row={zone:'Lohamandi',ward,wardNo,ri};}
  else row=window.__resolveWardTight?.(f?.['Zone Name']||a['Raw zone'],f?.['Ward Name']||a['Raw ward'],a['Property UID'])?.row;
  if(!row&&/^09233\d{3}/i.test(String(a['House / property no.']||'')))row=window.__resolveWardTight?.('','',a['House / property no.'])?.row;
  if(!row){const m=window.OTS_MASTER_WARDS?.[String(a['Property UID']||'').trim().toUpperCase()];if(m)row=(PUBLIC.roster||[]).find(r=>r.zone===m[0]&&String(r.wardNo)===String(m[1]));}
  if(!row&&!held.has(k)){const z=String(a['Raw zone']||'').toLowerCase().replace(/[^a-z]/g,'');const zone=/chh?atta|chhata|chatta/.test(z)?'Chhatta':/haripar/.test(z)?'Hariparwat':/lohamandi/.test(z)?'Lohamandi':/tajganj/.test(z)?'Tajganj':'';if(zone&&!a['Allocated zone'])a['Allocated zone']=zone;}
  if(row){a['Allocated zone']=row.zone;a['Allocated ward']=row.ward;a['Allocated RI / TC']=row.ri;}
 }
 const apps=new Map(E.apps.map(a=>[id(a),a]));
 for(const p of E.payments){const a=apps.get(id(p));if(!a?.['Allocated zone'])continue;p['Property zone']=a['Allocated zone'];p['Property ward']=a['Allocated ward'];p['Property RI']=a['Allocated RI / TC'];}
 if(financial.size){
 const num=v=>Number(String(v||0).replace(/,/g,''))||0;
 const fields=['applications','approved','inProcess','rejected','payingApps','collection','receipts','demand','receivedSummary','applicantPending','paidApplicants'];
 const empty=()=>Object.fromEntries(fields.map(k=>[k,0]));
 const zones=Object.fromEntries(['Chhatta','Hariparwat','Tajganj','Lohamandi'].map(z=>[z,empty()]));
 const wards=new Map(),paid=new Set(E.payments.map(id));
 const wardFor=a=>{const z=a['Allocated zone'],w=a['Allocated ward'],ri=a['Allocated RI / TC'];if(!z||!w||!ri)return null;const k=z+'|'+w;let r=wards.get(k);if(!r){const master=(PUBLIC.roster||[]).find(r=>r.zone===z&&(r.ward===w||String(r.wardNo)+' '+r.ward===w));r={...empty(),zone:z,ward:w,wardNo:master?.wardNo||'',ri,post:master?.post||'RI'};wards.set(k,r)}return r};
 for(const a of E.apps){const z=zones[a['Allocated zone']],w=wardFor(a),f=financial.get(id(a)),st=String(a['Application status']).toLowerCase(),metric=st==='approved'?'approved':/reject|cancel/.test(st)?'rejected':'inProcess';for(const r of [z,w].filter(Boolean)){r.applications++;r[metric]++;r.demand+=num(f?.['Total Demand Generated']);if(paid.has(id(a))){r.payingApps++;r.paidApplicants++}if(/applicant/i.test(a['Pending with']||''))r.applicantPending++;}}
 for(const p of E.payments){const a=apps.get(id(p)),z=zones[p['Property zone']],w=a&&wardFor(a);for(const r of [z,w].filter(Boolean)){r.collection+=num(p['Amount (INR)']);r.receivedSummary=r.collection;r.receipts++;}}
 const ris=new Map();for(const w of wards.values()){const key=w.zone+'|'+w.ri;let r=ris.get(key);if(!r){r={...empty(),zone:w.zone,ri:w.ri,post:w.post,wards:0};ris.set(key,r)}for(const k of fields)r[k]+=w[k];r.wards++;}
 E.controls.zones=zones;E.wardRows=[...wards.values()];E.riRows=[...ris.values()];
 }
 // Preserve identity-level evidence in the same private store used for drill-down.
 if(typeof LOCAL!=='undefined'&&LOCAL)LOCAL.applications=E.apps;
};
})();
