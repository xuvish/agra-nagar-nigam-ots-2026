(function(){
'use strict';
function load(src){
 return new Promise((resolve,reject)=>{
  const s=document.createElement('script');
  s.src=src;s.async=false;
  s.onload=resolve;
  s.onerror=()=>reject(new Error('Failed to load '+src));
  document.body.appendChild(s);
 });
}
function waitFor(fn,ms=4500){
 return new Promise(resolve=>{
  const start=Date.now(),t=setInterval(()=>{
   if(fn()||Date.now()-start>ms){clearInterval(t);resolve()}
  },50);
 });
}
(async()=>{
 try{
  await load('assets/fix-locked-roster-final.js?v=20260918-final-roster');
  await load('assets/fix-excel-date-local.js?v=20260917-2340-v1');
  await load('assets/fix-point1.js?v=20260917-0900');
  await waitFor(()=>!!window.openClassification);
  await load('assets/fix-point4.js?v=20260917-0900');
  await load('assets/fix-point5.js?v=20260917-0900');
  await load('assets/fix-point6.js?v=20260917-0901');
  await load('assets/fix-point7.js?v=20260917-0830');
  await load('assets/fix-point8.js?v=20260917-1145');
  await load('assets/fix-engine-v3.js?v=20260925-reconciled-v9');
  await load('assets/fix-admin-production-v7.js?v=20260918-0840-admin-v7c');
  await load('assets/ots-seven-pdf.js?v=20260925-pending-master-v11');
  await load('assets/fix-smart-upload.js?v=20260925-reconciled-v9');
  await load('assets/fix-tight-mapper.js?v=20260925-reconciled-v9');
  await load('assets/fix-source-authority.js?v=20260917-2335-v1');
  await load('assets/fix-multi-report-intelligence.js?v=20260917-2350-v1');
  await load('assets/fix-followup-contact-safety.js?v=20260917-2352-v1');
  await load('assets/fix-intelligence-local-bridge.js?v=20260918-0042-calling-mobile-v3');
  await load('assets/fix-collection-authority-v2.js?v=20260925-reconciled-v9');
  await load('assets/ots-master-ward-index.js?v=20260925-master-index-v2');
  await load('assets/fix-shared-live-v8.js?v=20260925-current-roster-v16');
  await load('assets/fix-property-contact-master.js?v=20260918-0124-v2-multimobile');
  await load('assets/fix-property-contact-multiformat.js?v=20260918-0132-v1');
  await load('assets/fix-property-master-main-uploader.js?v=20260918-0152-direct-v2');
  await load('assets/fix-authority-v8.js?v=20260925-pending-master-v11');
  await load('assets/fix-persist-v8.js?v=20260925-current-roster-v15');
  await load('assets/ots-seven-pdf-audit.js?v=20260925-reconciled-v9');
  window.processWorkbook=window.processReportSet||window.processWorkbook;
  const submit=document.querySelector('#reportModal .btn.primary');
  if(submit&&window.processWorkbook){submit.onclick=window.processWorkbook;submit.textContent='Submit Reports & Recalculate';}
  window.__OTS_BOOTSTRAP_READY=true;
  if(window.renderAll)window.renderAll();
  document.dispatchEvent(new CustomEvent('ots:bootstrap-ready'));
 }catch(e){
  console.error('OTS production bootstrap failed',e);
  window.__OTS_BOOTSTRAP_ERROR=String(e?.message||e);
  document.dispatchEvent(new CustomEvent('ots:bootstrap-error',{detail:{error:window.__OTS_BOOTSTRAP_ERROR}}));
 }
})();
})();
