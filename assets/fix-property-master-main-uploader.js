(function(){
'use strict';
const ZONES=['Chhatta','Hariparwat','Tajganj','Lohamandi'];
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'');
function zoneFromName(name){
 const s=norm(name);
 if(/chh?atta|chhata|chatta/.test(s))return'Chhatta';
 if(s.includes('haripar'))return'Hariparwat';
 if(s.includes('tajganj'))return'Tajganj';
 if(s.includes('lohamandi'))return'Lohamandi';
 return null;
}
function isMasterSet(files){
 if(!files||files.length!==4)return false;
 const zones=files.map(f=>zoneFromName(f.name));
 return zones.every(Boolean)&&new Set(zones).size===4&&ZONES.every(z=>zones.includes(z));
}
function copyFiles(files,target){
 const dt=new DataTransfer();
 [...files].forEach(f=>dt.items.add(f));
 target.files=dt.files;
}
function setMessage(html){
 const el=document.getElementById('uploadMsg');if(!el)return;
 el.innerHTML=html;el.classList.add('show');
}
function sync(){
 const main=document.getElementById('masterFile');
 const hidden=document.getElementById('propertyMasterFiles');
 const modal=document.getElementById('reportModal');
 const submit=modal?.querySelector('.btn.primary');
 if(!main||!hidden||!submit)return false;
 if(main.dataset.masterBridge==='1')return true;
 main.dataset.masterBridge='1';
 const normalSubmit=()=>{window.__otsPropertyMasterMode=false;submit.textContent='Submit Reports & Recalculate';submit.onclick=window.processReportSet||window.processWorkbook;};
 const enterMasterMode=()=>{
   window.__otsPropertyMasterMode=true;
   submit.textContent='Import 4 Property Master CSVs';
   setMessage('<b>PROPERTY CONTACT MASTER READY</b><br>Chhatta + Hariparwat + Tajganj + Lohamandi recognized. Click <b>Import 4 Property Master CSVs</b>. These are not daily OTS reports.');
   submit.onclick=async function(ev){
     ev?.preventDefault?.();
     const files=[...main.files];
     if(!isMasterSet(files))return normalSubmit();
     copyFiles(files,hidden);
     setMessage('<b>IMPORTING PRIVATE PROPERTY CONTACT MASTER…</b><br>Please keep this window open. Progress will appear in the Property Contact Master box below.');
     hidden.dispatchEvent(new Event('change',{bubbles:true}));
   };
 };
 main.addEventListener('change',()=>{
   const files=[...main.files];
   if(isMasterSet(files)){
     enterMasterMode();
     setTimeout(enterMasterMode,0);
     setTimeout(enterMasterMode,120);
   }else normalSubmit();
 },true);
 if(isMasterSet([...main.files]))setTimeout(enterMasterMode,0);
 return true;
}
let tries=0;const t=setInterval(()=>{tries++;if(sync()||tries>80)clearInterval(t)},100);
console.log('Property Master main-uploader bridge active');
})();