(function(){
'use strict';
// The seven UP OTS exports are text PDFs with fixed A4 landscape table columns.
// Keep conversion in the browser; the existing reconciler receives its familiar
// workbook columns and does the calculation exactly once.
const SPECS={
  apps:{title:/Received Application/i,anchor:{min:72,max:112,pattern:/^OTS\d*$/i},edges:[70,110,125,160,350,565,625,688,740],header:['AppNo','AppName','Property_UID','PropertyNo','AppStatusDate','Status'],build:c=>[field(c,1),words(c,4),field(c,5),field(c,7),field(c,8),status(c,9)]},
  approved:{title:/Approved Application Summary Report/i,anchor:{min:72,max:132,pattern:/^OTS\d*$/i},edges:[70,120,300,480,535,595,650],header:['Application No','Name Of Applicant','Application Received On','Application Approved On','Approved By','Last Remark'],build:c=>[field(c,1),words(c,2),words(c,3),words(c,4),words(c,6).replace(/\bramb\s+abu\b/i,'Rambabu'),words(c,7)]},
  inprocess:{title:/In-Process Application/i,anchor:{min:70,max:102,pattern:/^OTS\d*$/i},edges:[70,95,170,280,335,420,500],header:['Application No','Name of Applicant','Application Received On','Pending with whom','For How Many Days','Last Remark'],build:c=>[field(c,1),words(c,2),words(c,3),words(c,5),field(c,6),words(c,7)]},
  collection:{title:/Daily Collection Report/i,anchor:{min:105,max:172,pattern:/^OTS\d*$/i},edges:[70,100,160,230,290,330,365,405,445,495,565,620,675,750],header:['Receipt No.','Total Amount','Payment Date','Application No.','Mode','Name','Property No.','Mobile No.','CashWindow Name','Zone Name','Ward Name','Payment Mode'],build:c=>[field(c,7),amount(c,10),collectionDate(c,9),field(c,2),field(c,1),words(c,3),field(c,5),field(c,6),words(c,11),words(c,12),words(c,13),words(c,14)]},
  zone:{title:/Zone\/Ward Wise Application Summary/i,anchor:{min:58,max:100,pattern:/^Agra(?: Nagar)?$/i},edges:[55,120,200,380,450,495,535,590,630,675,745],header:['Sr No','ULB Name','Zone Name','Ward Name','Appl. Received','In-Time','Overdue','Applicant','Approved','Rejected','Received Amount','Demand Generated'],build:c=>[field(c,0),words(c,1),words(c,2),words(c,3),amount(c,4),amount(c,5),amount(c,6),amount(c,7),amount(c,8),amount(c,9),amount(c,10),amount(c,11)]}
};
function field(c,n){return (c[n]||[]).map(x=>x.value).join('').replace(/\s+/g,'')}
function words(c,n){return (c[n]||[]).map(x=>x.value).join(' ').replace(/\s+/g,' ').trim()}
function status(c,n){const s=field(c,n).toLowerCase();return s.includes('approv')?'Approved':s.includes('reject')?'Rejected':s.includes('progress')?'In Progress':words(c,n)}
function collectionDate(c,n){const s=words(c,n),m=s.match(/\b(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\b/);if(!m)throw Error('A collection payment date is unreadable.');return `${m[1]} ${m[2]} ${m[3]}`}
function amount(c,n){const raw=(c[n]||[]).map(x=>x.value).find(x=>/^[-+]?\d[\d,]*(?:\.\d+)?$/.test(x));const v=Number(String(raw??'').replace(/,/g,''));if(raw===undefined||!Number.isFinite(v))throw Error('A numeric PDF table cell could not be read (row '+field(c,0)+'; column '+n+').');return v}
function column(edges,x){const i=edges.findIndex(edge=>x<edge);return i<0?edges.length:i}
function parseRows(items,spec){
  const sorted=items.sort((a,b)=>a.y-b.y||a.x-b.x),rows=[];let cells=null;
  if(spec===SPECS.collection){
    const serial=sorted.filter(x=>x.x>=50&&x.x<70&&/^\d+$/.test(x.value));
    if(!serial.length)throw Error('Daily collection PDF has no numbered receipt rows.');
    const groups=serial.map(()=>Array.from({length:spec.edges.length+1},()=>[]));
    for(const item of sorted){
      if(item.y<serial[0].y-18)continue;
      let lo=0,hi=serial.length;
      while(lo<hi){const mid=(lo+hi)>>1;if(serial[mid].y<item.y)lo=mid+1;else hi=mid}
      const before=Math.max(0,lo-1),after=Math.min(serial.length-1,lo);
      let index=Math.abs(item.y-serial[before].y)<=Math.abs(item.y-serial[after].y)?before:after;
      if(Math.floor(item.y/1000)===Math.floor(serial[after].y/1000)&&Math.floor(serial[before].y/1000)<Math.floor(item.y/1000)&&item.y<serial[after].y-15)index=before;
      groups[index][column(spec.edges,item.x)].push(item);
    }
    for(let i=0;i<groups.length;i++){const group=groups[i];for(const col of group)col.sort((a,b)=>a.y-b.y||a.x-b.x);const row=spec.build(group);if(!/^OTS\d+$/i.test(row[3]))throw Error('Daily collection PDF row '+(i+1)+' has an unreadable application number: '+row[3]);rows.push(row)}
    return rows;
  }
  function finish(){
    if(!cells)return;
    const row=spec.build(cells);
    if(spec===SPECS.zone){if(/^\d+$/.test(String(row[0]))&&row[2]&&row[3])rows.push(row)}
    else if(/^OTS\d+$/i.test(String(spec===SPECS.collection?row[3]:row[0])))rows.push(row);
    else throw Error('A PDF application number was split or unreadable ('+String(spec===SPECS.collection?row[3]:row[0]).slice(0,50)+'). Upload the original portal PDF.');
  }
  for(const item of sorted){
    if(item.x>=spec.anchor.min&&item.x<spec.anchor.max&&spec.anchor.pattern.test(item.value)){
      finish();cells=Array.from({length:spec.edges.length+1},()=>[]);
    }
    if(cells)cells[column(spec.edges,item.x)].push(item);
  }
  finish();return rows;
}
async function convert(file){
  if(!window.pdfjsLib||!window.XLSX)throw Error('PDF/Excel reader did not load. Refresh and retry.');
  pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
  const first=await pdf.getPage(1),intro=(await first.getTextContent()).items.map(x=>x.str).join(' ');
  const type=Object.keys(SPECS).find(key=>SPECS[key].title.test(intro));
  if(!type)return null;
  const spec=SPECS[type],items=[];
  for(let n=1;n<=pdf.numPages;n++){
    const page=n===1?first:await pdf.getPage(n),content=await page.getTextContent();
    for(const t of content.items){const value=String(t.str||'').trim();if(value)items.push({value,x:t.transform[4],y:n*1000+page.view[3]-t.transform[5]})}
  }
  const data=parseRows(items,spec);if(!data.length)throw Error('No application rows found in '+file.name);
  if(type==='collection'){
    for(const row of data)if(!row[0]||!row[3]||row[1]<=0)throw Error('A collection receipt is incomplete in PDF.');
  }
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([spec.header,...data]),'OTSReport');
  const bytes=XLSX.write(wb,{bookType:'xlsx',type:'array'});
  return{type,count:data.length,rows:data,file:new File([bytes],file.name.replace(/\.pdf$/i,'.xlsx'),{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})};
}
window.OTSSevenPdf={convert,parseRows,SPECS};
})();
