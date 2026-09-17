(function(){
'use strict';
const OLD=window.processReportSet||window.processWorkbook;
const norm=s=>String(s??'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const SAFE={
 'nawalganj':'Nawal Ganj',
 'eram mohan nagar':'Ram Mohan Nagar',
 'khati pada':'Khati Para',
 'rahul nagar':'Rahul Nagar Bodla',
 'bodla':'Rahul Nagar Bodla',
 'block b shastripuram agra':'Shastripuram',
 'sastipshastripuram':'Shastripuram',
 'shashtripurashastripuram':'Shastripuram',
 'shashtripurshastripuram':'Shastripuram',
 'shastri puram':'Shastripuram',
 'shastshastripuram':'Shastripuram',
 'idgah':'Edgah',
 'edgah':'Edgah',
 'mewati nagla':'Nagla Mewati',
 'namner':'Naam Ner'
};
function rosterByWard(name){return (PUBLIC.roster||[]).find(r=>norm(r.ward)===norm(name))||null}
function add(dst,src){for(const k of ['applications','approved','inProcess','rejected','applicantPending','demand','receivedSummary'])dst[k]=(Number(dst[k])||0)+(Number(src[k])||0)}
function tighten(E){
 if(!E||!Array.isArray(E.unresolved)||!Array.isArray(E.wardRows)||E.__tightened)return;
 const left=[];
 for(const r of E.unresolved){
   const target=SAFE[norm(r.wardRaw)];
   const wr=target&&rosterByWard(target);
   if(!wr){left.push(r);continue}
   let row=E.wardRows.find(x=>x.zone===wr.zone&&Number(x.wardNo)===Number(wr.wardNo));
   if(!row){row={zone:wr.zone,wardNo:wr.wardNo,ward:wr.ward,ri:wr.ri,post:wr.post,applications:0,approved:0,inProcess:0,rejected:0,applicantPending:0,demand:0,receivedSummary:0,paidApplicants:0,receipts:0,collection:0};E.wardRows.push(row)}
   add(row,{...r,applicantPending:r.applicant||0,receivedSummary:r.received||0});
 }
 E.unresolved=left;
 E.unresolvedWardRows=left;
 const groups=new Map();
 for(const w of E.wardRows){const k=w.zone+'|'+w.ri;let g=groups.get(k);if(!g){g={zone:w.zone,ri:w.ri,post:w.post,applications:0,approved:0,inProcess:0,rejected:0,applicantPending:0,demand:0,receivedSummary:0,paidApplicants:0,receipts:0,collection:0,wards:0};groups.set(k,g)};for(const f of ['applications','approved','inProcess','rejected','applicantPending','demand','receivedSummary','paidApplicants','receipts','collection'])g[f]+=(Number(w[f])||0);g.wards++}
 E.riRows=[...groups.values()].sort((a,b)=>a.zone.localeCompare(b.zone)||a.ri.localeCompare(b.ri));
 if(E.controls?.zones){for(const z of Object.keys(E.controls.zones)){const rows=E.wardRows.filter(w=>w.zone===z);const c=E.controls.zones[z];for(const f of ['applications','approved','inProcess','rejected','demand'])c[f]=rows.reduce((s,w)=>s+(Number(w[f])||0),0);c.applicantPending=rows.reduce((s,w)=>s+(Number(w.applicantPending)||0),0)}}
 E.__tightened=true;
}
window.processReportSet=async function(){const out=await OLD.apply(this,arguments);if(window.OTS7?.loaded){tighten(window.OTS7);if(window.renderAll)window.renderAll()}return out};
window.processWorkbook=window.processReportSet;
window.__tightenOTSClassification=tighten;
})();