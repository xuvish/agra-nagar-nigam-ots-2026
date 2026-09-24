(function(){
'use strict';
const previous=window.processReportSet||window.processWorkbook;
window.processReportSet=async function(){
  const result=await previous.apply(this,arguments),e=window.OTS7;
  if(e?.loaded){
    const summaryApproved=(e._wardSummary||[]).reduce((n,r)=>n+(Number(r.approved)||0),0);
    const detailApproved=e.approved?.length||0;
    const sourceApproved=e.controls?.city?.approved||0;
    const summaryInProcess=(e._wardSummary||[]).reduce((n,r)=>n+(Number(r.inTime)||0)+(Number(r.overdue)||0)+(Number(r.applicant)||0),0);
    const detailInProcess=e.inprocess?.length||0;
    const differences=[];
    if(sourceApproved!==detailApproved||sourceApproved!==summaryApproved)differences.push(`Approved: received master ${sourceApproved}, detail ${detailApproved}, zone/ward ${summaryApproved}`);
    if(summaryInProcess!==detailInProcess)differences.push(`In process: detail ${detailInProcess}, zone/ward ${summaryInProcess}`);
    if(differences.length){
      const msg=document.getElementById('uploadMsg');
      if(msg){msg.className='msg show err';msg.textContent='Source report difference — '+differences.join(' · ')+'. Check the portal exports; no counts were forced to match.'}
      const notice=document.getElementById('classificationNotice');if(notice)notice.textContent='Source report difference — '+differences.join(' · ')+'.';
    }
  }
  return result;
};
window.processWorkbook=window.processReportSet;
})();
