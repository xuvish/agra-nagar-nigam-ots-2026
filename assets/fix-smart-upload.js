(function(){
'use strict';
const AUTH_KEY='ots_admin_session_v1';
const CANON={apps:'applications.xlsx',zone:'zone ward app summarry.xls',collection:'CollectionReport.xls',full:'FULL PaymentData.xlsx',part:'PART PaymentData.xlsx',inprocess:'InProcessReport.xls',approved:'ApprovedApplicationSummaryReport.xls'};
const originalProcess=window.processReportSet||window.processWorkbook;
function norm(v){return String(v??'').trim().toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()}
function findHeader(rows,preds){for(let i=0;i<Math.min(rows.length,30);i++){const h=(rows[i]||[]).map(norm);if(preds.every(p=>h.some(v=>v===p||v.includes(p))))return i}return-1}
function paymentKind(rows,hi){const h=(rows[hi]||[]).map(x=>String(x??'').trim());const ix={};h.forEach((x,i)=>ix[x]=i);const gp=(r,k)=>Number(String((r[ix[k]]??0)).replace(/,/g,''))||0;let near=0,n=0;for(const r of rows.slice(hi+1,hi+101)){if(!r||!r.length)continue;const payable=gp(r,'TotalPayable'),paid=gp(r,'TotalPaid'),disc=gp(r,'TotalDiscount');if(!payable&&!paid)continue;n++;if(Math.abs((payable-disc)-paid)<=2)near++}return n&&near/n>=0.8?'full':'part'}

async function repairSpreadsheetFile(file){
  const name=String(file.name||'');
  if(!/\.xlsx$/i.test(name))return file;
  const ab=await file.arrayBuffer();
  const u=new Uint8Array(ab);
  if(u.length<22||u[0]!==0x50||u[1]!==0x4b)return file;
  let pos=-1;
  for(let i=u.length-22;i>=0;i--){
    if(u[i]===0x50&&u[i+1]===0x4b&&u[i+2]===0x05&&u[i+3]===0x06){pos=i;break}
  }
  if(pos<0)return file;
  const commentLen=u[pos+20]|(u[pos+21]<<8);
  const cleanEnd=Math.min(u.length,pos+22+commentLen);
  if(cleanEnd>=u.length)return file;
  const clean=u.slice(0,cleanEnd);
  return new File([clean],name,{type:file.type||'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',lastModified:file.lastModified});
}

async function readWorkbook(file){
  const safe=await repairSpreadsheetFile(file);
  const ab=await safe.arrayBuffer();
  try{return{wb:XLSX.read(ab,{type:'array',raw:true}),file:safe,repaired:safe!==file}}
  catch(e){
    try{
      const txt=new TextDecoder('utf-8').decode(new Uint8Array(ab));
      if(/<table|<html/i.test(txt))return{wb:XLSX.read(txt,{type:'string',raw:true}),file:safe,repaired:safe!==file};
    }catch(_){ }
    throw e;
  }
}

async function detect(file){
  let parsed;
  try{parsed=await readWorkbook(file)}catch(e){return{type:'unknown',file,error:String(e)}}
  const wb=parsed.wb,safe=parsed.file;
  for(const sh of wb.SheetNames){
    const rows=XLSX.utils.sheet_to_json(wb.Sheets[sh],{header:1,defval:'',raw:true});
    let hi=findHeader(rows,['appno','status']);if(hi>=0&&findHeader(rows,['property uid'])>=0)return{type:'apps',file:safe,repaired:parsed.repaired};
    hi=findHeader(rows,['appno','zonename','wardname','totalpaid']);if(hi>=0)return{type:paymentKind(rows,hi),file:safe,repaired:parsed.repaired};
    hi=findHeader(rows,['receipt no','total amount','payment date']);if(hi>=0)return{type:'collection',file:safe,repaired:parsed.repaired};
    hi=findHeader(rows,['application no','pending with whom']);if(hi>=0)return{type:'inprocess',file:safe,repaired:parsed.repaired};
    hi=findHeader(rows,['application no','application approved on']);if(hi>=0)return{type:'approved',file:safe,repaired:parsed.repaired};
    hi=findHeader(rows,['appl received','approved','demand generated']);if(hi>=0)return{type:'zone',file:safe,repaired:parsed.repaired};
  }
  return{type:'unknown',file:safe,repaired:parsed.repaired};
}

async function canonicalizeInput(){
  const input=document.getElementById('masterFile');if(!input||input.dataset.smartBusy==='1')return false;
  const files=[...input.files];if(files.length!==7)return false;
  input.dataset.smartBusy='1';
  try{
    const found=await Promise.all(files.map(detect));
    const counts={};for(const x of found)counts[x.type]=(counts[x.type]||0)+1;
    const needed=['apps','zone','collection','full','part','inprocess','approved'];
    const ok=needed.every(k=>counts[k]===1)&&!counts.unknown;
    if(!ok){
      const msg=document.getElementById('uploadMsg');if(msg){msg.className='msg show err';msg.textContent='Could not identify all seven reports by content. Detected: '+found.map(x=>x.type+' ← '+x.file.name+(x.error?' ['+x.error+']':'')).join(' | ')}
      return false;
    }
    if(typeof DataTransfer!=='undefined'){
      const dt=new DataTransfer();
      for(const x of found){const nf=new File([x.file],CANON[x.type],{type:x.file.type,lastModified:x.file.lastModified});dt.items.add(nf)}
      input.files=dt.files;input.dataset.smartReady='1';input.dispatchEvent(new Event('change',{bubbles:true}));
    }
    const repaired=found.filter(x=>x.repaired).length;
    const msg=document.getElementById('uploadMsg');if(msg){msg.className='msg show ok';msg.textContent='7 reports identified by CONTENT — filenames do not matter.'+(repaired?` Auto-repaired ${repaired} corrupted XLSX export(s).`:'')+' Ready to calculate.'}
    return true;
  }catch(e){console.error(e);const msg=document.getElementById('uploadMsg');if(msg){msg.className='msg show err';msg.textContent='Spreadsheet repair/read failed: '+e.message}return false}
  finally{input.dataset.smartBusy='0'}
}
function install(){const input=document.getElementById('masterFile');if(input&&!input.dataset.smartListener){input.dataset.smartListener='1';input.addEventListener('change',()=>{if(input.dataset.smartReady==='1'){input.dataset.smartReady='';return}canonicalizeInput()})}}
const oldOpen=window.openReports;window.openReports=function(){const r=oldOpen.apply(this,arguments);setTimeout(install,120);return r};
window.processReportSet=async function(){if(sessionStorage.getItem(AUTH_KEY)!=='1'){window.openReports();return}const input=document.getElementById('masterFile');if(input&&input.dataset.smartReady!=='1'){const ok=await canonicalizeInput();if(!ok)return}return originalProcess.apply(this,arguments)};
window.processWorkbook=window.processReportSet;
install();
})();