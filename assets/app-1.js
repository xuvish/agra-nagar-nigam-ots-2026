let DEFAULT_DATA=null;
let DATA=null;
let activeTab='overview';

const $=id=>document.getElementById(id);
const norm=v=>String(v??'').trim().toLowerCase().replace(/\s+/g,' ');
const INR=v=>'₹'+Number(v||0).toLocaleString('en-IN',{minimumFractionDigits:Number(v)%1?2:0,maximumFractionDigits:2});
const NUM=v=>Number(v||0).toLocaleString('en-IN');
const fmtDate=s=>{if(!s)return '—';let d=new Date(String(s).slice(0,10)+'T00:00:00');return isNaN(d)?String(s):d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})};
const zoneTS=z=>z==='Chhatta'?'Sheetal Gupta':z==='Hariparwat'?'Akshay Kumar':(z==='Tajganj'||z==='Lohamandi'||z==='Tajganj / Lohamandi')?'Rambabu':'—';
function loadStored(){try{let x=localStorage.getItem('agra_ots_production_v3');return x?JSON.parse(x):null}catch(e){return null}}
function saveStored(){try{localStorage.setItem('agra_ots_production_v3',JSON.stringify(DATA))}catch(e){}}
function getZone(){return $('zone').value}
function latestDate(){return DATA.payments.map(x=>String(x['Payment date']||'').slice(0,10)).filter(Boolean).sort().at(-1)||DATA.meta.snapshot}
function filterPayments(zone=null){
  let p=DATA.payments;
  if(zone&&zone!=='All')p=p.filter(r=>(r['Allocated zone']||'Unresolved')===zone);
  return p
}
function moneySum(rows,key='Amount (INR)'){return rows.reduce((s,r)=>s+Number(r[key]||0),0)}
function zoneControl(z){return DATA.zones.find(r=>r['Zone / RI']===z)}
function cityControl(){return DATA.zones.find(r=>r['Zone / RI']==='CITY TOTAL')}
function qmatch(...vals){let q=norm($('search').value);return !q||vals.some(v=>norm(v).includes(q))}
function onZoneChange(){populateRI();renderAll()}
function populateRI(){
  let z=getZone(), current=$('ri').value;
  let ris=[...new Set(DATA.wards.filter(w=>w['Ward']&&w['RI / TC']&&w['RI / TC']!=='Unresolved'&&(z==='All'||w['Zone']===z)).map(w=>w['RI / TC']))].sort();
  $('ri').innerHTML='<option value="All">All RIs</option>'+ris.map(x=>`<option>${escapeHtml(x)}</option>`).join('');
  if(ris.includes(current))$('ri').value=current;
  let cs=[...new Set(DATA.payments.map(p=>p['Cashier / channel']).filter(Boolean))].sort();let cc=$('cashier').value;
  $('cashier').innerHTML='<option value="All">All cashiers</option>'+cs.map(x=>`<option>${escapeHtml(x)}</option>`).join('');
  if(cs.includes(cc))$('cashier').value=cc
}
function renderKPIs(){
  const z=getZone(), latest=latestDate();
  const allP=filterPayments(z);
  const todayP=allP.filter(r=>String(r['Payment date']).slice(0,10)===latest);
  const total=moneySum(allP), today=moneySum(todayP), prev=total-today;
  const c=z==='All'?cityControl():zoneControl(z);
  const apps=Number(c?.Applications||0), approved=Number(c?.Approved||0), process=Number(c?.['In process']||0), rejected=Number(c?.Rejected||0);
  const paid=Number(c?.['Paying applications']||0), demand=Number(c?.['Demand generated']||0), summary=Number(c?.['Summary received']||0);
  $('kPrev').textContent=INR(prev);$('kToday').textContent=INR(today);$('kTotal').textContent=INR(total);
  $('sPrev').textContent='Before '+fmtDate(latest);$('sToday').textContent=fmtDate(latest);
  $('kApps').textContent=NUM(apps);$('kApproved').textContent=NUM(approved);$('kProcess').textContent=NUM(process);$('kRejected').textContent=NUM(rejected);
  $('kPaid').textContent=NUM(paid);$('kRate').textContent=apps?((approved/apps)*100).toFixed(1)+'%':'—';$('kDemand').textContent=INR(demand);$('kSummary').textContent=INR(summary);
  let online=moneySum(allP.filter(r=>norm(r['Cashier / channel'])==='online'));
  $('kOnline').textContent=INR(online);$('sOnline').textContent=z==='All'?'Separate payment channel':'Within selected allocated zone';
  $('heroTitle').textContent=z==='All'?'Agra Nagar Nigam Dashboard':z+' Zone Dashboard';
  $('heroText').textContent=z==='All'?'Citywide verified figures from the reconciled master workbook.':`Tax Superintendent: ${zoneTS(z)} · figures filtered from the same underlying application and receipt registers.`;
  $('heroMini').textContent='OTS 2026-27 · Status as of '+fmtDate(DATA.meta.snapshot);
  let joint=DATA.payments.filter(r=>r['Allocated zone']==='Tajganj / Lohamandi');
  if(z==='Tajganj'||z==='Lohamandi'){
    $('jointBox').style.display='block';
    $('jointBox').innerHTML=`₹${moneySum(joint).toLocaleString('en-IN')} is retained separately as <b>Tajganj / Lohamandi joint allocation</b>. It is not added to ${z} because the source does not provide a reliable split.`;
  }else $('jointBox').style.display='none';
  const exact=moneySum(allP.filter(r=>norm(r['Allocation basis'])==='exact uid match'));
  const prov=moneySum(allP.filter(r=>norm(r['Allocation basis'])==='provisional uid prefix'));
  const unr=moneySum(allP.filter(r=>norm(r['Allocation basis'])==='unresolved'));
  $('mPaidConv').textContent=approved?((paid/approved)*100).toFixed(1)+'%':'—';
  $('mAvgReceipt').textContent=allP.length?INR(total/allP.length):'—';
  $('mRecovery').textContent=demand?((total/demand)*100).toFixed(1)+'%':'—';
  $('mUnresolved').textContent=INR(unr);
  $('mExact').textContent=total?((exact/total)*100).toFixed(1)+'%':'0%';
  $('mProv').textContent=total?((prov/total)*100).toFixed(1)+'%':'0%';
  $('mUnrPct').textContent=total?((unr/total)*100).toFixed(1)+'%':'0%';
}
