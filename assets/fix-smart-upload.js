(function(){
'use strict';
const AUTH_KEY='ots_admin_session_v1';
const CANON={apps:'applications.xlsx',zone:'zone ward app summarry.xls',collection:'CollectionReport.xls',full:'FULL PaymentData.xlsx',part:'PART PaymentData.xlsx',inprocess:'InProcessReport.xls',approved:'ApprovedApplicationSummaryReport.xls'};
const originalProcess=window.processReportSet||window.processWorkbook;
function norm(v){return String(v??'').trim().toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()}
function findHeader(rows,preds){for(let i=0;i<Math.min(rows.length,30);i++){const h=(rows[i]||[]).map(norm);if(preds.every(p=>h.some(v=>v===p||v.includes(p))))return i}return-1}
function paymentKind(rows,hi){const h=(rows[hi]||[]).map(x=>norm(x).replace(/ /g,''));const ix={};h.forEach((x,i)=>ix[x]=i);const gp=(r,k)=>Number(String((r[ix[k]]??0)).replace(/,/g,''))||0;let near=0,n=0;for(const r of rows.slice(hi+1,hi+101)){if(!r||!r.length)continue;const payable=gp(r,'totalpayable'),paid=gp(r,'totalpaid'),disc=gp(r,'totaldiscount');if(!payable&&!paid)continue;n++;if(Math.abs((payable-disc)-paid)<=2)near++}return n&&near/n>=0.8?'full':'part'}

function convertPaymentExport(rows,hi,name){
  // PDF-to-Excel exports use spaced headers. The existing OTS calculation engine
  // expects the portal's compact headers, so normalize the sheet before import.
  const headers=(rows[hi]||[]).map(x=>norm(x).replace(/ /g,''));
  const cols=['applicationno','nameofapplicant','propertyuid','propertyno','zonename','wardname','totalpayable','totalpaid','totaldiscount','paiddate'];
  const labels=['AppNo','AppName','Property_UID','PropertyNo','ZoneName','WardName','TotalPayable','TotalPaid','TotalDiscount','PaidDate'];
  const positions=cols.map(x=>headers.indexOf(x));
  if(positions.some(x=>x<0))throw Error('Payment report is missing a required column.');
  const out=[labels];
  for(const row of rows.slice(hi+1)){
    const values=positions.map(i=>row[i]??'');
    if(/^OTS\d+/i.test(String(values[0]).trim()))out.push(values);
  }
  if(!out.length||out.length===1)throw Error('Payment report contains no application rows.');
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(out),'PaymentData');
  const bytes=XLSX.write(wb,{bookType:'xlsx',type:'array'});
  return new File([bytes],name,{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}

async function convertPaymentPdf(file){
  if(!window.pdfjsLib)throw Error('PDF reader did not load. Refresh the page and try again.');
  pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
  const words=[];
  for(let pageNo=1;pageNo<=pdf.numPages;pageNo++){
    const page=await pdf.getPage(pageNo),content=await page.getTextContent();
    for(const item of content.items){
      const value=String(item.str||'').trim();if(!value)continue;
      words.push({value,x:item.transform[4],y:pageNo*1000+page.view[3]-item.transform[5]});
    }
  }
  words.sort((a,b)=>a.y-b.y||a.x-b.x);
  const boundaries=[70,101,125,235,270,320,350,390,465,540,615,690,760];
  const fields=['AppNo','AppName','Property_UID','PropertyNo','ZoneName','WardName','TotalPayable','TotalPaid','TotalDiscount','PaidDate'];
  const rows=[fields];let cols=null;
  function finish(){
    if(!cols)return;
    const value=i=>cols[i].join('').replace(/\s+/g,'');
    const app=value(1);
    if(!/^OTS\d+$/i.test(app))throw Error('Could not read every payment application number from PDF.');
    const money=i=>{const v=Number(value(i).replace(/,/g,''));if(!Number.isFinite(v))throw Error('Could not read a payment amount from PDF.');return v};
    rows.push([app,cols[3].join(' ').replace(/\s+/g,' ').trim(),value(4),value(5),value(6),value(7),money(10),money(11),money(12),value(13)]);
  }
  for(const word of words){
    if(word.x>=69&&word.x<101&&/^OTS\d*$/i.test(word.value)){finish();cols=Array.from({length:14},()=>[])}
    if(cols){const col=boundaries.findIndex(edge=>word.x<edge);cols[col<0?13:col].push(word.value)}
  }
  finish();
  if(rows.length<2)throw Error('No OTS payment rows found in PDF. Select the FULL/PART payment report.');
  const workbook=XLSX.utils.book_new();XLSX.utils.book_append_sheet(workbook,XLSX.utils.aoa_to_sheet(rows),'PaymentData');
  const bytes=XLSX.write(workbook,{bookType:'xlsx',type:'array'});
  return {rows,file:new File([bytes],file.name.replace(/\.pdf$/i,'.xlsx'),{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})};
}

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
  if(/\.pdf$/i.test(file.name)){
    try{
      const report=await window.OTSSevenPdf.convert(file);
      if(report)return{type:report.type,file:report.file,converted:true,count:report.count};
      const converted=await convertPaymentPdf(file);
      return{type:paymentKind(converted.rows,0),file:converted.file,converted:true};
    }
    catch(e){return{type:'unknown',file,error:String(e.message||e)}}
  }
  let parsed;
  try{parsed=await readWorkbook(file)}catch(e){return{type:'unknown',file,error:String(e)}}
  const wb=parsed.wb,safe=parsed.file;
  for(const sh of wb.SheetNames){
    const rows=XLSX.utils.sheet_to_json(wb.Sheets[sh],{header:1,defval:'',raw:true});
    let hi=findHeader(rows,['appno','status']);if(hi>=0&&findHeader(rows,['property uid'])>=0)return{type:'apps',file:safe,repaired:parsed.repaired};
    hi=findHeader(rows,['appno','zonename','wardname','totalpaid']);if(hi>=0)return{type:paymentKind(rows,hi),file:safe,repaired:parsed.repaired};
    hi=findHeader(rows,['application no','zone name','ward name','total paid']);if(hi>=0){
      try{const converted=convertPaymentExport(rows,hi,file.name);return{type:paymentKind(rows,hi),file:converted,repaired:true}}
      catch(e){return{type:'unknown',file:safe,error:e.message}}
    }
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
  const progress=document.getElementById('uploadMsg');
  input.dataset.smartBusy='1';
  try{
    const found=[];
    for(let i=0;i<files.length;i++){
      if(progress)progress.textContent=`Reading report ${i+1} of ${files.length}: ${files[i].name}…`;
      found.push(await detect(files[i]));
    }
    const pay=found.filter(x=>x.type==='payment').sort((a,b)=>a.count-b.count);
    if(pay.length===2&&pay[0].count!==pay[1].count){pay[0].type='full';pay[1].type='part'}
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
    const repaired=found.filter(x=>x.repaired).length,pdfs=found.filter(x=>x.converted).length;
    const msg=document.getElementById('uploadMsg');if(msg){msg.className='msg show ok';msg.textContent='7 reports identified by CONTENT — filenames do not matter.'+(pdfs?` Read ${pdfs} PDF report(s) directly.`:'')+(repaired?` Auto-repaired ${repaired} damaged XLSX export(s).`:'')+' Ready to calculate.'}
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
