function openReports(){$('reportsModal').classList.add('open');$('errorBox').style.display='none';$('progress').classList.remove('show')}
function closeReports(){$('reportsModal').classList.remove('open')}
function prog(t){$('progress').textContent=t;$('progress').classList.add('show')}
function err(t){$('errorBox').textContent=t;$('errorBox').style.display='block'}
function resetVerified(){if(!confirm('Reset portal to the verified 15 September baseline?'))return;DATA=JSON.parse(JSON.stringify(DEFAULT_DATA));saveStored();$('zone').value='All';$('ri').value='All';$('cashier').value='All';populateRI();renderAll();$('statusStrong').textContent='VERIFIED SNAPSHOT LOADED';$('statusPlain').textContent='15 September 2026 · calculations reconciled'}
function exportBackup(){let b=new Blob([JSON.stringify(DATA)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='Agra_OTS_Portal_Backup_'+DATA.meta.snapshot+'.json';a.click();URL.revokeObjectURL(a.href)}
function importBackup(f){if(!f)return;let rd=new FileReader();rd.onload=()=>{try{let x=JSON.parse(rd.result);if(!x.applications||!x.payments||!x.zones)throw Error('Invalid backup');DATA=x;saveStored();populateRI();renderAll();$('statusStrong').textContent='BACKUP IMPORTED';$('statusPlain').textContent=DATA.meta.snapshot}catch(e){alert('Backup file is not valid.')}};rd.readAsText(f)}
function excelDate(v){if(v instanceof Date)return v.toISOString().slice(0,10);if(typeof v==='number'){let d=XLSX.SSF.parse_date_code(v);return d?`${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`:v}return String(v??'').slice(0,10)}
function sheetRows(wb,name){let ws=wb.Sheets[name];return ws?XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:true}):null}
function objectsFrom(rows,headerRow){let h=rows[headerRow].map(x=>String(x??'').trim());return rows.slice(headerRow+1).filter(r=>r.some(v=>v!==null&&v!=='')).map(r=>Object.fromEntries(h.map((k,i)=>[k||('__'+i),r[i]])))}
function findHeader(rows,required){for(let i=0;i<Math.min(rows.length,20);i++){let h=rows[i].map(x=>norm(x));if(required.every(req=>h.some(x=>x===norm(req))))return i}return -1}
async function processMaster(){
  let f=$('masterFile').files[0];if(!f){err('Choose the reconciled master workbook first.');return}
  if(!window.XLSX){err('Excel parser could not load. Check the internet connection once, then reopen this file.');return}
  try{
    prog('Reading workbook…');
    let wb=XLSX.read(await f.arrayBuffer(),{cellDates:true});
    let req=['Dashboard','Zone and RI','Ward Summary','Daily Cashiers','Applications','Payments'],missing=req.filter(x=>!wb.SheetNames.includes(x));
    if(missing.length)throw Error('This is not the reconciled master format. Missing sheets: '+missing.join(', '));
    prog('Validating applications, approvals, receipts, amount and allocation controls…');
    let zr=sheetRows(wb,'Zone and RI'), zh=findHeader(zr,['Zone / RI','Applications','Approved','In process','Receipt collection']);
    let zones=objectsFrom(zr,zh).filter(x=>x['Zone / RI']);
    let cityPos=zones.findIndex(x=>x['Zone / RI']==='CITY TOTAL');if(cityPos<0)throw Error('CITY TOTAL row not found in Zone and RI sheet.');
    zones=zones.slice(0,cityPos+1);
    let city=zones.find(x=>x['Zone / RI']==='CITY TOTAL');
    let wr=sheetRows(wb,'Ward Summary'), wh=findHeader(wr,['Zone','Ward','RI / TC','Applications','Approved']);
    let wards=objectsFrom(wr,wh).filter(x=>x.Ward);
    let ar=sheetRows(wb,'Applications'), ah=findHeader(ar,['App ID','Application number','Application status','Allocated zone']);
    let applications=objectsFrom(ar,ah).filter(x=>x['App ID']!==null&&x['App ID']!==undefined);
    let pr=sheetRows(wb,'Payments'), ph=findHeader(pr,['Source serial','Application number','Payment date','Amount (INR)','Allocated zone']);
    let payments=objectsFrom(pr,ph).filter(x=>x['Source serial']!==null&&x['Source serial']!==undefined);
    for(const p of payments)p['Payment date']=excelDate(p['Payment date']);
    for(const a of applications){for(const k of ['Status date','First payment','Last payment','Approval date','Received date'])if(a[k])a[k]=excelDate(a[k])}
    let appCount=applications.length, approved=applications.filter(x=>norm(x['Application status'])==='approved').length, receiptCount=payments.length, amount=moneySum(payments);
    let payingAppCount=new Set(payments.map(x=>String(x['Application number']??'').trim()).filter(Boolean)).size;
    let errors=[];
    if(appCount!==Number(city.Applications||0))errors.push(`Applications ${appCount} ≠ city control ${city.Applications}`);
    if(approved!==Number(city.Approved||0))errors.push(`Approved ${approved} ≠ city control ${city.Approved}`);
    if(payingAppCount!==Number(city['Paying applications']||0))errors.push(`Paying applications ${payingAppCount} ≠ city control ${city['Paying applications']}`);
    if(Math.abs(amount-Number(city['Receipt collection']||0))>.01)errors.push(`Receipt amount ${amount} ≠ city control ${city['Receipt collection']}`);
    let receiptNos=payments.map(x=>String(x['Receipt number']??'').trim()).filter(Boolean);
    if(new Set(receiptNos).size!==receiptNos.length)errors.push('Duplicate receipt numbers detected');
    let byD={};for(const r of payments){let d=String(r['Payment date']||'').slice(0,10);byD[d]=(byD[d]||0)+Number(r['Amount (INR)']||0)}
    if(Math.abs(Object.values(byD).reduce((a,b)=>a+b,0)-amount)>.01)errors.push('Daily collection recomputation mismatch');
    let byC={};for(const r of payments){let c=r['Cashier / channel']||'Unresolved';byC[c]=(byC[c]||0)+Number(r['Amount (INR)']||0)}
    if(Math.abs(Object.values(byC).reduce((a,b)=>a+b,0)-amount)>.01)errors.push('Cashier recomputation mismatch');
    let byZ={};for(const r of payments){let z=r['Allocated zone']||'Unresolved';byZ[z]=(byZ[z]||0)+Number(r['Amount (INR)']||0)}
    if(Math.abs(Object.values(byZ).reduce((a,b)=>a+b,0)-amount)>.01)errors.push('Zone allocation recomputation mismatch');
    if(errors.length)throw Error('Workbook failed reconciliation: '+errors.join(' | '));
    prog('Replacing dashboard with reconciled data…');
    DATA={meta:{snapshot:latestDateFromPayments(payments),source:f.name},city:{applications:appCount,approved,inProcess:Number(city['In process']||0),rejected:Number(city.Rejected||0),totalCollection:amount,onlineCollection:moneySum(payments.filter(x=>norm(x['Cashier / channel'])==='online')),paidApplications:payingAppCount,demandGenerated:Number(city['Demand generated']||0)},zones,wards,applications,payments,tsApprovals:[]};
    saveStored();populateRI();renderAll();$('statusStrong').textContent='MASTER WORKBOOK VERIFIED';$('statusPlain').textContent=f.name+' · primary and derived controls matched';prog('Dashboard updated successfully');
    setTimeout(()=>{closeReports()},700)
  }catch(e){err(e.message||String(e));$('progress').classList.remove('show')}
}
function latestDateFromPayments(p){return p.map(x=>String(x['Payment date']||'').slice(0,10)).filter(Boolean).sort().at(-1)||new Date().toISOString().slice(0,10)}
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.panel').forEach(x=>x.classList.remove('active'));t.classList.add('active');$(t.dataset.tab).classList.add('active');activeTab=t.dataset.tab});
async function bootstrapPortal(){
  try{
    DEFAULT_DATA=await loadEmbeddedData();
    DATA=loadStored() || DEFAULT_DATA;
    populateRI();
    renderAll();
  }catch(e){
    console.error(e);
    document.body.innerHTML='<div style="font-family:Arial;padding:32px;max-width:780px;margin:auto"><h2>Portal data could not be loaded</h2><p>'+String(e.message||e)+'</p><p>Please use a current Chrome, Edge or Safari browser.</p></div>';
  }
}
bootstrapPortal();
