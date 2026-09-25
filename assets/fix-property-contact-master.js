(function(){
'use strict';

const DB_NAME='ots_property_contact_master_v1';
const DB_VERSION=1;
const STORE='properties';
const META_KEY='ots_property_contact_master_meta_v2';
const AUTH_KEY='ots_admin_session_v1';
const ZONES=['Chhatta','Hariparwat','Tajganj','Lohamandi'];
const N=v=>String(v??'').trim();
const norm=v=>N(v).toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const normId=v=>N(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const normHouse=v=>N(v).toUpperCase().replace(/[^A-Z0-9]/g,'');
const digits=v=>N(v).replace(/\D/g,'');
const validMobile=v=>{const d=digits(v);return d.length===10&&/^[6-9]/.test(d)?d:''};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uniq=a=>[...new Set((a||[]).filter(Boolean))];
const mobileList=r=>uniq([...(Array.isArray(r?.mobiles)?r.mobiles:[]),...N(r?.mobile).split(/[\/|,;]+/).map(validMobile)]);
const mobileText=r=>mobileList(r).join(' / ');

function zoneFromFile(name){
 const s=norm(name).replace(/\s/g,'');
 if(/chh?atta|chhata|chatta/.test(s))return'Chhatta';
 if(s.includes('haripar'))return'Hariparwat';
 if(s.includes('tajganj'))return'Tajganj';
 if(s.includes('lohamandi'))return'Lohamandi';
 return null;
}
function officerZone(a){
 const t=norm([a?.['TS approver'],a?.['Approved By'],a?.['Pending with'],a?.['Latest remark']].filter(Boolean).join(' | '));
 if(/shital gupta|sheetal gupta/.test(t))return'Chhatta';
 if(t.includes('akshay kumar'))return'Hariparwat';
 if(t.includes('rambabu'))return null;
 const hits=[];
 for(const r of (window.PUBLIC?.roster||[])){
   const rn=norm(r.ri);if(rn.length>=4&&t.includes(rn))hits.push(r.zone);
 }
 const u=[...new Set(hits)];return u.length===1?u[0]:null;
}
function currentZoneHint(a){
 const z=N(a?.['Allocated zone']||a?.['Calling zone']);
 return ZONES.includes(z)?z:(officerZone(a)||'');
}
function wardNoFrom(v){const m=N(v).match(/\b(\d{1,3})\b/);return m?Number(m[1]):null}
function ownerScore(a,b){
 const A=new Set(norm(a).split(' ').filter(x=>x.length>2)),B=new Set(norm(b).split(' ').filter(x=>x.length>2));
 if(!A.size||!B.size)return 0;let n=0;for(const x of A)if(B.has(x))n++;return n/Math.min(A.size,B.size);
}

function openDB(){return new Promise((resolve,reject)=>{
 const req=indexedDB.open(DB_NAME,DB_VERSION);
 req.onupgradeneeded=()=>{
   const db=req.result;let s;
   if(!db.objectStoreNames.contains(STORE)){
     s=db.createObjectStore(STORE,{keyPath:'key'});
     s.createIndex('propertyId','propertyId',{unique:false});
     s.createIndex('houseKey','houseKey',{unique:false});
     s.createIndex('houseNorm','houseNorm',{unique:false});
     s.createIndex('wardKey','wardKey',{unique:false});
   }
 };
 req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
})}
function txDone(tx){return new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('IndexedDB transaction aborted'))})}
async function clearDB(){const db=await openDB();const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).clear();await txDone(tx);db.close()}
async function putBatches(rows,onProgress){const db=await openDB();const batch=4000;for(let i=0;i<rows.length;i+=batch){const tx=db.transaction(STORE,'readwrite'),s=tx.objectStore(STORE);for(const r of rows.slice(i,i+batch))s.put(r);await txDone(tx);onProgress&&onProgress(Math.min(rows.length,i+batch),rows.length)}db.close()}
async function multiLookup(indexName,keys){
 const unique=[...new Set(keys.filter(Boolean))],out=new Map(),db=await openDB(),batch=250;
 for(let i=0;i<unique.length;i+=batch){
   const part=unique.slice(i,i+batch);await new Promise((resolve,reject)=>{
     const tx=db.transaction(STORE,'readonly'),idx=tx.objectStore(STORE).index(indexName);let pending=part.length;
     if(!pending){resolve();return}
     for(const k of part){const r=idx.getAll(k);r.onsuccess=()=>{out.set(k,r.result||[]);if(--pending===0)resolve()};r.onerror=()=>reject(r.error)}
     tx.onerror=()=>reject(tx.error);
   });
 }
 db.close();return out;
}

function rosterRI(zone,wardNo,wardName,propertyId){
 if(typeof window.__resolveWardTight==='function'){
   try{const d=window.__resolveWardTight(zone,`${wardNo||''} ${wardName||''}`.trim(),propertyId);if(d?.row)return d.row.ri||''}catch(e){}
 }
 const rows=(window.PUBLIC?.roster||[]).filter(r=>r.zone===zone&&(Number(r.wardNo)===Number(wardNo)||norm(r.ward)===norm(wardName)));
 return rows.length===1?rows[0].ri:'';
}
function mergeRecord(old,r){
 if(!old){r.mobiles=mobileList(r);r.mobile=r.mobiles.join(' / ');r.mobileConflict=r.mobiles.length>1;return r}
 old.mobiles=uniq([...mobileList(old),...mobileList(r)]);
 old.mobile=old.mobiles.join(' / ');
 old.mobileConflict=old.mobiles.length>1;
 for(const k of ['owner','houseNo','address','popularName','wardName','mohalla'])if(!old[k]&&r[k])old[k]=r[k];
 if(!old.ri&&r.ri)old.ri=r.ri;
 return old;
}
async function parseMasterFile(file,zone,status){
 const text=await file.text(),marker='S.No.,"Property ID"',at=text.indexOf(marker);
 if(at<0)throw Error(`${file.name}: Corporate Ward Wise property header not found`);
 const csv=text.slice(at),wb=XLSX.read(csv,{type:'string',raw:true}),sh=wb.Sheets[wb.SheetNames[0]],rows=XLSX.utils.sheet_to_json(sh,{defval:'',raw:false});
 const map=new Map();let rawRows=0;
 for(const x of rows){
   const pid=normId(x['Property ID']);if(!pid)continue;rawRows++;
   const wardNo=Number(String(x['Corporate Ward No.']||'').replace(/\D/g,''))||null,wardName=N(x['Corporate Name']),houseNo=N(x['House No.']),hn=normHouse(houseNo),mobile=validMobile(x.Mobile);
   const r={key:`${zone}|${pid}`,zone,propertyId:pid,propertyIdRaw:N(x['Property ID']),wardNo,wardName,mohalla:N(x['Corporate Mohalla']),owner:N(x['Owner Name']),houseNo,houseNorm:hn,houseKey:hn?`${zone}|${hn}`:'',wardKey:wardNo?`${zone}|${wardNo}`:'',mobile,mobiles:mobile?[mobile]:[],mobileConflict:false,address:N(x.Address),popularName:N(x['Popular Name']),dueAmount:Number(String(x['Due Amount']||'0').replace(/,/g,''))||0,ri:rosterRI(zone,wardNo,wardName,pid)};
   map.set(r.key,mergeRecord(map.get(r.key),r));
 }
 const records=[...map.values()];
 const withContacts=records.filter(r=>mobileList(r).length).length;
 const contactNumbers=records.reduce((s,r)=>s+mobileList(r).length,0);
 const multiMobile=records.filter(r=>mobileList(r).length>1).length;
 status&&status(`${zone}: parsed ${records.length.toLocaleString('en-IN')} unique properties · ${withContacts.toLocaleString('en-IN')} properties with mobile · ${contactNumbers.toLocaleString('en-IN')} distinct numbers`);
 return{records,rawRows,unique:records.length,withContacts,contactNumbers,multiMobile};
}

function meta(){try{return JSON.parse(localStorage.getItem(META_KEY)||'null')}catch(e){return null}}
function setMeta(v){localStorage.setItem(META_KEY,JSON.stringify(v))}
function metaText(){const m=meta();if(!m)return'Not loaded in this browser — reload the 4 zone CSVs once for multi-mobile support';return`${Number(m.properties||0).toLocaleString('en-IN')} properties · ${Number(m.contactNumbers||0).toLocaleString('en-IN')} distinct mobile numbers · loaded ${new Date(m.loadedAt).toLocaleString('en-IN')}`}

function injectUI(){
 const modal=document.getElementById('reportModal');if(!modal||document.getElementById('propertyMasterPanel'))return;
 const anchor=document.getElementById('reportChecklist')||modal.querySelector('.drop');if(!anchor)return;
 const panel=document.createElement('div');panel.id='propertyMasterPanel';panel.className='notice';panel.style.cssText='margin-top:10px;padding:12px';
 panel.innerHTML=`<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><div><b>PRIVATE PROPERTY CONTACT MASTER</b><div style="font-size:10px;color:#87a6b9;margin-top:4px">One-time per browser: Chhatta + Hariparwat + Tajganj + Lohamandi CSVs. All distinct source mobile numbers for a matched property are retained and shown in the calling list. Never published to GitHub/Supabase.</div></div><button class="btn" id="propertyMasterChoose" type="button">Load / Replace 4 Zone CSVs</button></div><input id="propertyMasterFiles" type="file" accept=".csv" multiple style="display:none"><div id="propertyMasterStatus" style="font-size:10px;margin-top:8px;color:#b8d3e3">${esc(metaText())}</div>`;
 anchor.insertAdjacentElement('afterend',panel);
 const input=panel.querySelector('#propertyMasterFiles'),btn=panel.querySelector('#propertyMasterChoose');btn.onclick=()=>input.click();input.onchange=()=>importMaster([...input.files]);
}
function status(msg,bad=false){const el=document.getElementById('propertyMasterStatus');if(el){el.textContent=msg;el.style.color=bad?'#ff9b9b':'#b8d3e3'}}

async function importMaster(files){
 try{
   if(sessionStorage.getItem(AUTH_KEY)!=='1')throw Error('Administrator login is required first.');
   if(files.length!==4)throw Error('Select exactly 4 zone CSVs: Chhatta, Hariparwat, Tajganj and Lohamandi.');
   const by={};for(const f of files){const z=zoneFromFile(f.name);if(!z)throw Error(`Cannot identify zone from file name: ${f.name}`);if(by[z])throw Error(`Two files detected for ${z}`);by[z]=f}
   for(const z of ZONES)if(!by[z])throw Error(`${z} CSV is missing`);
   status('Preparing private Property Contact Master…');await clearDB();let total=0,withContacts=0,contactNumbers=0,multiMobile=0;
   for(const z of ZONES){
     status(`Reading ${z} property master…`);const parsed=await parseMasterFile(by[z],z,msg=>status(msg));
     await putBatches(parsed.records,(done,all)=>status(`${z}: saving ${done.toLocaleString('en-IN')} / ${all.toLocaleString('en-IN')} properties…`));
     total+=parsed.unique;withContacts+=parsed.withContacts;contactNumbers+=parsed.contactNumbers;multiMobile+=parsed.multiMobile;
   }
   const m={version:2,loadedAt:new Date().toISOString(),properties:total,withContacts,contactNumbers,multiMobile,zones:ZONES};setMeta(m);
   status(`READY · ${total.toLocaleString('en-IN')} properties · ${contactNumbers.toLocaleString('en-IN')} distinct mobile numbers retained · ${multiMobile.toLocaleString('en-IN')} properties have multiple numbers`);
   window.__propertyMasterEnrichedKey='';await enrichLocal(true);
 }catch(e){console.error(e);status(e.message||String(e),true)}
}

function pickCandidate(cands,a,zoneHint){
 let rows=[...(cands||[])];if(!rows.length)return null;
 if(zoneHint){const z=rows.filter(r=>r.zone===zoneHint);if(z.length)rows=z}
 const h=normHouse(a?.['House / property no.']||a?.['House No.']);if(h){const x=rows.filter(r=>r.houseNorm===h);if(x.length)rows=x}
 const aw=wardNoFrom(a?.['Allocated ward']);if(aw){const x=rows.filter(r=>Number(r.wardNo)===aw);if(x.length)rows=x}
 if(rows.length===1)return rows[0];
 const owner=N(a?.['Applicant / owner']);if(owner){const scored=rows.map(r=>({r,s:ownerScore(owner,r.owner)})).sort((x,y)=>y.s-x.s);if(scored[0]?.s>=0.6&&(scored.length===1||scored[0].s>scored[1].s))return scored[0].r}
 return null;
}
async function enrichLocal(force=false){
 const m=meta();if(!m||typeof LOCAL==='undefined'||!LOCAL||!Array.isArray(LOCAL.applications))return null;
 const sig=`${LOCAL.snapshot||''}|${LOCAL.applications.length}|${m.loadedAt}`;if(!force&&window.__propertyMasterEnrichedKey===sig)return window.__propertyMasterLastStats||null;
 const apps=LOCAL.applications,ctx=apps.map((a,i)=>({i,a,pid:normId(a['Property UID']||a['Property ID']||a['Master property ID']),house:normHouse(a['House / property no.']||a['House No.']),zone:currentZoneHint(a)}));
 const byProp=await multiLookup('propertyId',ctx.map(x=>x.pid));const unmatched=[];let matched=0,withMobile=0,totalNumbers=0,byId=0,byHouseCount=0;
 for(const x of ctx){if(!x.pid){unmatched.push(x);continue}const r=pickCandidate(byProp.get(x.pid),x.a,x.zone);if(r){x.match=r;x.basis='Property ID exact';byId++}else unmatched.push(x)}
 const houseKeys=unmatched.filter(x=>x.house).map(x=>x.house),byHouse=await multiLookup('houseNorm',houseKeys);
 for(const x of unmatched){if(x.match||!x.house)continue;const matches=byHouse.get(x.house)||[],r=pickCandidate(matches,x.a,'');if(r&&(matches.length===1||ownerScore(x.a['Applicant / owner'],r.owner)>=0.6)){x.match=r;x.basis=matches.length===1?'Unique house number across four masters':'House number + unique owner/zone match';byHouseCount++}}
 for(const x of ctx){const r=x.match;if(!r)continue;matched++;const a=x.a,phones=mobileList(r),phoneText=phones.join(' / ');
   a['Property Master match']=x.basis;a['Master property ID']=r.propertyIdRaw||r.propertyId;a['Master owner']=r.owner;a['Master address']=r.address;a['Master popular name']=r.popularName;a['Contact zone']=r.zone;a['Contact ward no']=r.wardNo;a['Contact ward']=r.wardName;a['Contact RI']=r.ri||'';a['Property master due']=r.dueAmount||0;
   a['Allocated zone']=r.zone;a['Allocated ward']=r.wardNo?`${r.wardNo} ${r.wardName}`:r.wardName;a['Allocated RI / TC']=r.ri||a['Allocated RI / TC']||'';a['Allocation basis']=`Property Contact Master · ${x.basis}`;a['Calling zone']=r.zone;a['Calling basis']=`Property Contact Master · ${x.basis}`;
   if(phoneText){a['Contact mobile']=phoneText;a['Contact mobiles']=phones;a['Mobile No.']=phoneText;withMobile++;totalNumbers+=phones.length}
   if(!N(a['Applicant / owner'])&&r.owner)a['Applicant / owner']=r.owner;
 }
 window.__propertyMasterEnrichedKey=sig;const st={total:apps.length,matched,withMobile,totalNumbers,byId,byHouse:byHouseCount,unmatched:apps.length-matched};window.__propertyMasterLastStats=st;
 status(`READY · ${m.properties.toLocaleString('en-IN')} master properties · current OTS: ${matched.toLocaleString('en-IN')} property matches · ${withMobile.toLocaleString('en-IN')} applicants with contact · ${totalNumbers.toLocaleString('en-IN')} numbers available`);
 if(window.renderAll)window.renderAll();return st;
}

async function enrichReportPayments(E){
 if(!meta()||!E?.payments?.length)return null;
 const apps=new Map((E.apps||[]).map(r=>[N(r['Application number']),r]).filter(x=>x[0]));
 const paid=new Map((E.paidRows||[]).map(r=>[N(r['Application number']),r]).filter(x=>x[0]));
 const contexts=E.payments.map(p=>{const a=apps.get(N(p['Application number']))||{},pr=paid.get(N(p['Application number']))||{};
  return {p,a,pr,pid:normId(p['Property UID']||pr['Property UID']||a['Property UID']||a['Master property ID']),house:normHouse(p['House / property no.']||p['Receipt property no.']||pr['House / property no.']||a['House / property no.']),hint:currentZoneHint(a)}});
 const ids=await multiLookup('propertyId',contexts.map(x=>x.pid)),houses=await multiLookup('houseNorm',contexts.map(x=>x.house));
 const roster=window.PUBLIC?.roster||[],wardByNo=(zone,no)=>roster.find(r=>r.zone===zone&&Number(r.wardNo)===Number(no));
 const wardFrom=(zone,raw)=>{const r=roster.filter(r=>r.zone===zone&&(norm(r.ward)===norm(raw)||Number(r.wardNo)===wardNoFrom(raw)));return r.length===1?r[0]:null};
 let matched=0,byHouse=0;
 for(const x of contexts){
  const input={'Applicant / owner':x.a['Applicant / owner']||x.p['Payer name'],'House / property no.':x.p['Receipt property no.']||x.a['House / property no.'],'Allocated zone':x.hint,'Allocated ward':x.a['Allocated ward']};
  let source='Exact master property ID',r=pickCandidate(ids.get(x.pid),input,x.hint);
  if(!r&&x.house){const all=houses.get(x.house)||[];r=pickCandidate(all,input,'');if(r&&all.length>1&&ownerScore(input['Applicant / owner'],r.owner)<0.6)r=null;source=all.length===1?'Unique house across four masters':'House + owner/zone verified';if(r)byHouse++}
  if(!r)continue;
  const w=wardByNo(r.zone,r.wardNo);if(!w)continue;
  x.p['Property UID']=x.p['Property UID']||r.propertyIdRaw;x.p['Property zone']=r.zone;x.p['Property ward']=w.wardNo+' '+w.ward;x.p['Property RI']=w.ri;
  x.p['Master match']=source;matched++;
 }
 const wm=new Map((E.wardRows||[]).map(w=>[w.zone+'|'+Number(w.wardNo),w]));
 for(const w of E.wardRows||[]){w.collection=0;w.receipts=0}
 const unique=new Map();let unmapped=0,unmappedAmount=0;
 for(const x of contexts){
  const p=x.p,z=N(p['Property zone']||x.a['Allocated zone']),raw=N(p['Property ward']||x.a['Allocated ward']);
  const w=wardFrom(z,raw),amount=Number(p['Amount (INR)'])||0;
  if(!w){unmapped++;unmappedAmount+=amount;continue}
  const key=w.zone+'|'+Number(w.wardNo);let dst=wm.get(key);
  if(!dst){dst={zone:w.zone,wardNo:w.wardNo,ward:w.ward,ri:w.ri,post:w.post||'RI',applications:0,approved:0,inProcess:0,rejected:0,applicantPending:0,demand:0,receivedSummary:0,paidApplicants:0,receipts:0,collection:0};wm.set(key,dst);E.wardRows.push(dst)}
  dst.collection+=amount;dst.receipts++;
  const n=N(p['Application number']);if(n){if(!unique.has(key))unique.set(key,new Set());unique.get(key).add(n)}
 }
 for(const [key,set] of unique)wm.get(key).paidApplicants=set.size;
 E.masterReceiptAudit={version:1,source:'four locally uploaded property masters',receipts:E.payments.length,masterMatched:matched,masterHouseMatched:byHouse,unmappedReceipts:unmapped,unmappedAmount};
 return E.masterReceiptAudit
}
window.__matchPropertyMasterForReports=enrichReportPayments;
function ensureFollowupHeader(){const tr=document.querySelector('#followup thead tr');if(tr)tr.innerHTML='<th>Application</th><th>Applicant / Owner</th><th>Mobile</th><th>Property ID</th><th>House No.</th><th>Calling Zone</th><th>Ward</th><th>RI</th><th>Approved On</th><th>Status</th>'}
function linkPhones(){
 ensureFollowupHeader();
 for(const tr of document.querySelectorAll('#followBody tr')){
   const td=tr.children?.[2];if(!td)continue;
   const raw=N(td.textContent);if(!raw||raw==='—')continue;
   const phones=uniq(raw.split(/[\/|,;]+/).map(validMobile).filter(Boolean));
   if(phones.length)td.innerHTML=phones.map(d=>`<a href="tel:${d}" style="color:#8affdf;text-decoration:none;font-weight:700;white-space:nowrap">${d}</a>`).join('<br>');
 }
}
const OLD_FOLLOW=window.renderFollowup;window.renderFollowup=function(){const r=OLD_FOLLOW&&OLD_FOLLOW.apply(this,arguments);setTimeout(linkPhones,0);return r};
const OLD_PROCESS=window.processReportSet||window.processWorkbook;window.processReportSet=async function(){const out=await OLD_PROCESS.apply(this,arguments);window.__propertyMasterEnrichedKey='';setTimeout(()=>enrichLocal(true),50);return out};window.processWorkbook=window.processReportSet;const submit=document.querySelector('#reportModal .btn.primary');if(submit)submit.onclick=window.processReportSet;
window.__applyPropertyContactMaster=()=>enrichLocal(true);window.__propertyContactMasterMeta=()=>meta();

injectUI();setTimeout(injectUI,250);setTimeout(()=>enrichLocal(false),700);
console.log('Private Property Contact Master engine active · multi-mobile enabled');
})();