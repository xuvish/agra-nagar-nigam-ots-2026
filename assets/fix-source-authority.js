(function(){
'use strict';
const oldProcess=window.processReportSet||window.processWorkbook;
const n=v=>String(v??'').trim().toLowerCase();
const num=v=>{const x=Number(String(v??0).replace(/,/g,''));return Number.isFinite(x)?x:0};
const sum=(rows,key)=>(rows||[]).reduce((s,r)=>s+num(r?.[key]),0);
const appNo=r=>String(r?.['Application number']??'').trim();

function reconcile(E){
  if(!E?.loaded||!E.controls?.city)return null;
  const city=E.controls.city;
  const apps=E.apps||[], payments=E.payments||[], paidRows=E.paidRows||[];

  const approved=apps.filter(a=>n(a['Application status'])==='approved').length;
  const rejected=apps.filter(a=>/reject|cancel/.test(n(a['Application status']))).length;
  const inProcess=apps.length-approved-rejected;

  const paidSet=new Set();
  for(const r of paidRows){const k=appNo(r);if(k)paidSet.add(k)}
  for(const r of payments){const k=appNo(r);if(k)paidSet.add(k)}

  city.applications=apps.length;
  city.approved=approved;
  city.inProcess=inProcess;
  city.rejected=rejected;
  city.payingApps=paidSet.size;
  city.receipts=payments.length;
  city.collection=payments.reduce((s,p)=>s+num(p['Amount (INR)']),0);
  city.online=payments.filter(p=>n(p['Cashier / channel'])==='online').reduce((s,p)=>s+num(p['Amount (INR)']),0);

  const zones=Object.values(E.controls.zones||{});
  const zoneSums={
    applications:sum(zones,'applications'),
    approved:sum(zones,'approved'),
    inProcess:sum(zones,'inProcess'),
    rejected:sum(zones,'rejected'),
    payingApps:sum(zones,'payingApps'),
    receipts:sum(zones,'receipts'),
    collection:sum(zones,'collection'),
    demand:sum(zones,'demand')
  };
  const gap={
    applications:Math.max(0,num(city.applications)-zoneSums.applications),
    approved:Math.max(0,num(city.approved)-zoneSums.approved),
    inProcess:Math.max(0,num(city.inProcess)-zoneSums.inProcess),
    rejected:Math.max(0,num(city.rejected)-zoneSums.rejected)
  };

  E.unresolved=(E.unresolved||[]).filter(r=>!r?._sourceAuthorityGap);
  if(gap.applications||gap.approved||gap.inProcess||gap.rejected){
    E.unresolved.push({
      _sourceAuthorityGap:true,
      zone:null,zoneRaw:null,wardRaw:null,
      applications:gap.applications,
      approved:gap.approved,
      inProcess:gap.inProcess,
      rejected:gap.rejected,
      applicantPending:0,
      demand:0,
      receivedSummary:0,
      collection:0,
      receipts:0,
      paidApplicants:0,
      reason:'Detailed application reports are newer than the Zone/Ward Summary. Retained at Nagar Nigam city level only until Zone/Ward evidence appears.'
    });
  }

  const collectionAppSet=new Set(payments.map(appNo).filter(Boolean));
  const paidReportTotal=paidRows.reduce((s,r)=>s+num(r['Total paid']),0);
  const paymentStates={FULL:0,PART:0,Other:0};
  for(const r of paidRows){
    const k=String(r?.['Payment state']||'').toUpperCase();
    if(k==='FULL')paymentStates.FULL++;
    else if(k==='PART')paymentStates.PART++;
    else paymentStates.Other++;
  }

  E.sourceAuthorityAudit={
    version:'source-authority-v1',
    rule:'City application status totals come from the detailed Applicant Master. City paid applicants come from distinct FULL/PART or Collection application numbers. City receipts and collection come from Collection Report transaction rows. Zone/Ward Summary is used for allocation and demand, never to reduce city totals.',
    applicationsMaster:apps.length,
    approvedMaster:approved,
    inProcessMaster:inProcess,
    rejectedMaster:rejected,
    approvedDetailRows:(E.approved||[]).length,
    inProcessDetailRows:(E.inprocess||[]).length,
    zoneSummaryApplications:zoneSums.applications,
    zoneSummaryApproved:zoneSums.approved,
    zoneSummaryInProcess:zoneSums.inProcess,
    zoneSummaryRejected:zoneSums.rejected,
    cityToZoneGap:gap,
    paidApplicants:paidSet.size,
    fullPaymentRows:paymentStates.FULL,
    partPaymentRows:paymentStates.PART,
    otherPaymentRows:paymentStates.Other,
    paidReportTotal,
    collectionUniqueApplications:collectionAppSet.size,
    receipts:payments.length,
    collection:city.collection,
    collectionVsPaidReports:city.collection-paidReportTotal,
    identityPassed:num(city.applications)===num(city.approved)+num(city.inProcess)+num(city.rejected)
  };
  if(E.classifierAudit)E.classifierAudit.sourceAuthority=E.sourceAuthorityAudit;

  const notice=document.getElementById('classificationNotice');
  if(notice&&gap.applications){
    notice.textContent+=` ${gap.applications} application(s) exist in newer detailed reports but not yet in the Zone/Ward Summary; they remain counted citywide without a guessed zone/ward.`;
  }
  return E.sourceAuthorityAudit;
}

window.__reconcileSourceAuthority=()=>reconcile(window.OTS7);
window.processReportSet=async function(){
  const out=await oldProcess.apply(this,arguments);
  const audit=reconcile(window.OTS7);
  if(audit&&window.renderAll)window.renderAll();
  return out;
};
window.processWorkbook=window.processReportSet;
console.log('OTS source-authority reconciliation active');
})();