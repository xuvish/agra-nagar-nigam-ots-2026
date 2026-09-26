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
const uniq=a=>[...new Set((a||[]).filter(Boolean))];

function extractMobiles(value){
  const raw=N(value); if(!raw)return[];
  const out=[];
  const push=d=>{d=N(d).replace(/\D/g,'');if(d.length===10&&/^[6-9]/.test(d)&&!out.includes(d))out.push(d)};
  for(const token of raw.split(/[,;\/|\n]+/)){
    const d=token.replace(/\D/g,'');
    if(d.length===10)push(d);
    else if(d.length===11&&d.startsWith('0'))push(d.slice(-10));
    else if(d.length===12&&d.startsWith('91'))push(d.slice(-10));
  }
  const re=/(?:\+?91[\s.\-]*)?([6-9](?:[\s.\-]*\d){9})/g;
  let m; while((m=re.exec(raw)))push(m[1]);
  return out;
}
function zoneFromFile(name){
  const s=norm(name).replace(/\s/g,'');
  if(/chh?atta|chhata|chatta/.test(s))return'Chhatta';
  if(s.includes('haripar'))return'Hariparwat';
  if(s.includes('tajganj'))return'Tajganj';
  if(s.includes('lohamandi'))return'Lohamandi';
  return null;
}
function rosterRI(zone,wardNo,wardName,propertyId){
  if(typeof window.__resolveWardTight==='function'){
    try{const d=window.__resolveWardTight(zone,`${wardNo||''} ${wardName||''}`.trim(),propertyId);if(d?.row)return d.row.ri||''}catch(e){}
  }
  const rows=(window.PUBLIC?.roster||[]).filter(r=>r.zone===zone&&(Number(r.wardNo)===Number(wardNo)||norm(r.ward)===norm(wardName)));
  return rows.length===1?rows[0].ri:'';
}
function openDB(){return new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB_NAME,DB_VERSION);
  req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE)){const s=db.createObjectStore(STORE,{keyPath:'key'});s.createIndex('propertyId','propertyId',{unique:false});s.createIndex('houseKey','houseKey',{unique:false});s.createIndex('houseNorm','houseNorm',{unique:false});s.createIndex('wardKey','wardKey',{unique:false});}};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
})}
function txDone(tx){return new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('IndexedDB transaction aborted'))})}
async function clearDB(){const db=await openDB();const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).clear();await txDone(tx);db.close()}
async function putBatches(rows,onProgress){const db=await openDB(),batch=4000;for(let i=0;i<rows.length;i+=batch){const tx=db.transaction(STORE,'readwrite'),s=tx.objectStore(STORE);for(const r of rows.slice(i,i+batch))s.put(r);await txDone(tx);onProgress&&onProgress(Math.min(rows.length,i+batch),rows.length)}db.close()}
function status(msg,bad=false){const el=document.getElementById('propertyMasterStatus');if(el){el.textContent=msg;el.style.color=bad?'#ff9b9b':'#b8d3e3'}}
function mergeRecord(old,r){
  if(!old){r.mobiles=uniq(r.mobiles);r.mobile=r.mobiles.join(' / ');r.mobileConflict=r.mobiles.length>1;return r}
  old.mobiles=uniq([...(old.mobiles||[]),...(r.mobiles||[])]);old.mobile=old.mobiles.join(' / ');old.mobileConflict=old.mobiles.length>1;
  for(const k of ['owner','houseNo','address','popularName','wardName','mohalla'])if(!old[k]&&r[k])old[k]=r[k];
  if(!old.ri&&r.ri)old.ri=r.ri;
  return old;
}
async function parseMasterFile(file,zone){
  let wb;
  if(/\.csv$/i.test(file.name)){
    const text=await file.text(),marker='S.No.,"Property ID"',at=text.indexOf(marker);
    if(at<0)throw Error(`${file.name}: Corporate Ward Wise property header not found`);
    wb=XLSX.read(text.slice(at),{type:'string',raw:true});
  }else wb=XLSX.read(await file.arrayBuffer(),{type:'array',raw:true});
  let rows=[];
  for(const name of wb.SheetNames){const sh=wb.Sheets[name],head=XLSX.utils.sheet_to_json(sh,{header:1,defval:'',raw:false});const hi=head.findIndex(r=>r.some(v=>N(v).trim()==='Property ID')&&r.some(v=>N(v).trim()==='Corporate Ward No.'));if(hi>=0){rows=XLSX.utils.sheet_to_json(sh,{range:hi,defval:'',raw:false});break}}
  if(!rows.length)throw Error(`${file.name}: Property ID and Corporate Ward columns not found`);
  const map=new Map();
  for(const x of rows){
    const pid=normId(x['Property ID']);if(!pid)continue;
    const wardNo=Number(String(x['Corporate Ward No.']||'').replace(/\D/g,''))||null,wardName=N(x['Corporate Name']),houseNo=N(x['House No.']),hn=normHouse(houseNo),mobiles=extractMobiles(x.Mobile);
    const r={key:`${zone}|${pid}`,zone,propertyId:pid,propertyIdRaw:N(x['Property ID']),wardNo,wardName,mohalla:N(x['Corporate Mohalla']),owner:N(x['Owner Name']),houseNo,houseNorm:hn,houseKey:hn?`${zone}|${hn}`:'',wardKey:wardNo?`${zone}|${wardNo}`:'',mobile:mobiles.join(' / '),mobiles,mobileConflict:mobiles.length>1,address:N(x.Address),popularName:N(x['Popular Name']),dueAmount:Number(String(x['Due Amount']||'0').replace(/,/g,''))||0,ri:rosterRI(zone,wardNo,wardName,pid)};
    map.set(r.key,mergeRecord(map.get(r.key),r));
  }
  const records=[...map.values()],withContacts=records.filter(r=>r.mobiles.length).length,contactNumbers=records.reduce((s,r)=>s+r.mobiles.length,0),multiMobile=records.filter(r=>r.mobiles.length>1).length;
  return{records,unique:records.length,withContacts,contactNumbers,multiMobile};
}
async function importMaster(files){
  try{
    if(sessionStorage.getItem(AUTH_KEY)!=='1')throw Error('Administrator login is required first.');
    if(files.length!==4)throw Error('Select exactly 4 zone CSVs: Chhatta, Hariparwat, Tajganj and Lohamandi.');
    const by={};for(const f of files){const z=zoneFromFile(f.name);if(!z)throw Error(`Cannot identify zone from file name: ${f.name}`);if(by[z])throw Error(`Two files detected for ${z}`);by[z]=f}
    for(const z of ZONES)if(!by[z])throw Error(`${z} CSV is missing`);
    status('Preparing multi-mobile Property Contact Master…');await clearDB();let total=0,withContacts=0,contactNumbers=0,multiMobile=0;
    for(const z of ZONES){
      status(`Reading ${z} property master…`);const parsed=await parseMasterFile(by[z],z);
      status(`${z}: ${parsed.unique.toLocaleString('en-IN')} properties · ${parsed.contactNumbers.toLocaleString('en-IN')} contact-number entries`);
      await putBatches(parsed.records,(done,all)=>status(`${z}: saving ${done.toLocaleString('en-IN')} / ${all.toLocaleString('en-IN')} properties…`));
      total+=parsed.unique;withContacts+=parsed.withContacts;contactNumbers+=parsed.contactNumbers;multiMobile+=parsed.multiMobile;
    }
    const m={version:3,loadedAt:new Date().toISOString(),properties:total,withContacts,contactNumbers,multiMobile,zones:ZONES};localStorage.setItem(META_KEY,JSON.stringify(m));
    status(`READY · ${total.toLocaleString('en-IN')} properties · ${withContacts.toLocaleString('en-IN')} properties with contact · ${contactNumbers.toLocaleString('en-IN')} number entries · ${multiMobile.toLocaleString('en-IN')} properties have multiple numbers`);
    window.__propertyMasterEnrichedKey='';if(typeof window.__applyPropertyContactMaster==='function')await window.__applyPropertyContactMaster();
  }catch(e){console.error(e);status(e.message||String(e),true)}
}
function install(){
  const input=document.getElementById('propertyMasterFiles');if(!input){setTimeout(install,250);return}
  if(input.dataset.multiFormatV3==='1')return;input.dataset.multiFormatV3='1';
  input.onchange=()=>importMaster([...input.files]);
  const panel=document.getElementById('propertyMasterPanel');const note=panel?.querySelector('div div div');
  if(note)note.textContent='25 Sept applicant details are already enriched from four masters in protected storage. For future uploads, import the four zone CSV or Excel files once in this browser; the full roster stays private here.';
}
window.__extractPropertyMasterMobiles=extractMobiles;
install();
console.log('Property Contact Master multi-format mobile importer active');
})();
