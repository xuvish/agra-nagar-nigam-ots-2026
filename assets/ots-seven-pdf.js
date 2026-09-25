(function(){
'use strict';
// The seven UP OTS exports are text PDFs with fixed A4 landscape table columns.
// Keep conversion in the browser; the existing reconciler receives its familiar
// workbook columns and does the calculation exactly once.
const SPECS={
  apps:{title:/Received Application/i,anchor:{min:72,max:112,pattern:/^OTS\d*$/i},edges:[70,110,125,160,350,565,625,688,740],header:['AppNo','AppName','Property_UID','PropertyNo','AppStatusDate','Status'],build:c=>[field(c,1),words(c,4),field(c,5),field(c,7),field(c,8),status(c,9)]},
  approved:{title:/Approved Application Summary Report/i,anchor:{min:72,max:132,pattern:/^OTS\d*$/i},edges:[70,120,300,480,535,595,650],header:['Application No','Name Of Applicant','Application Received On','Application Approved On','Approved By','Last Remark'],build:c=>[field(c,1),words(c,2),words(c,3),words(c,4),words(c,6).replace(/\bramb\s+abu\b/i,'Rambabu'),words(c,7)]},
  inprocess:{title:/In-Process Application/i,anchor:{min:70,max:102,pattern:/^OTS\d*$/i},edges:[70,95,170,280,335,420,500],header:['Application No','Name of Applicant','Application Received On','Pending with whom','For How Many Days','Last Remark'],build:c=>[field(c,1),words(c,2),words(c,3),words(c,5),field(c,6),words(c,7)]},
  collection:{title:/Daily Collection Report/i,anchor:{min:50,max:70,pattern:/^\d+$/},edges:[70,100,160,230,290,330,365,405,445,495,565,620,675,750],header:['Receipt No.','Total Amount','Payment Date','Application No.','Mode','Name','Property No.','Mobile No.','CashWindow Name','Zone Name','Ward Name','Payment Mode'],build:c=>[field(c,7),amount(c,10),collectionDate(c,9),field(c,2),field(c,1),words(c,3),field(c,5),field(c,6),words(c,11),words(c,12),words(c,13),words(c,14)]},
  payment:{title:/Collection Report FullPart/i,anchor:{min:70,max:101,pattern:/^OTS\d*$/i},edges:[70,101,125,235,270,320,350,390,465,540,615,690,760],header:['AppNo','AppName','Property_UID','PropertyNo','ZoneName','WardName','TotalPayable','TotalPaid','TotalDiscount','PaidDate'],build:c=>[field(c,1),words(c,3),field(c,4),field(c,5),words(c,6),words(c,7),amount(c,10),amount(c,11),amount(c,12),field(c,13)]},
  zone:{title:/Zone\/Ward Wise Application Summary/i,anchor:{min:58,max:120,pattern:/^Agra\s+Nagar/i},edges:[55,120,200,380,450,495,535,590,630,675,745],header:['Sr No','ULB Name','Zone Name','Ward Name','Appl. Received','In-Time','Overdue','Applicant','Approved','Rejected','Received Amount','Demand Generated'],build:c=>[field(c,0),words(c,1),words(c,2),words(c,3),amount(c,4),amount(c,5),amount(c,6),amount(c,7),amount(c,8),amount(c,9),amount(c,10),amount(c,11)]}
};
const sort=(a,b)=>a.y-b.y||a.x-b.x;
function field(c,n){return (c[n]||[]).slice().sort(sort).map(x=>x.value).join('').replace(/\s+/g,'')}
function words(c,n){return (c[n]||[]).slice().sort(sort).map(x=>x.value).join(' ').replace(/\s+/g,' ').trim()}
function status(c,n){const s=field(c,n).toLowerCase();return s.includes('approv')?'Approved':s.includes('reject')?'Rejected':s.includes('progress')?'In Progress':words(c,n)}
function collectionDate(c,n){const s=words(c,n),m=s.match(/(\d{1,2})\s*([A-Za-z]{3})\s*(\d{4})/);if(!m)throw Error('A collection payment date is unreadable: '+s);const mon={jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'}[m[2].toLowerCase()];if(!mon)throw Error('A collection payment month is unreadable: '+s);return `${m[3]}-${mon}-${m[1].padStart(2,'0')}`}
function amount(c,n){const raw=(c[n]||[]).map(x=>x.value).find(x=>/^[-+]?\d[\d,]*(?:\.\d+)?$/.test(x));const v=Number(String(raw??'').replace(/,/g,''));if(raw===undefined||!Number.isFinite(v))throw Error('A numeric PDF table cell could not be read (row '+field(c,0)+'; column '+n+').');return v}
function column(edges,x){const i=edges.findIndex(edge=>x<edge);return i<0?edges.length:i}
function parsePages(pages,spec){
 const parsed=[];let last=null;
 for(let n=0;n<pages.length;n++){
   const items=pages[n].slice().sort(sort);
   const anchors=items.filter(x=>x.x>=spec.anchor.min&&x.x<spec.anchor.max&&spec.anchor.pattern.test(x.value)&&x.y>(n===0?198:15)).sort(sort);
   if(!anchors.length)throw Error('No report rows on PDF page '+(n+1));
   if(n&&last){const before=anchors[0].y-11;for(const item of items){if(item.y>12&&item.y<before&&item.x>=70)last[column(spec.edges,item.x)].push({...item,y:item.y+n*1000})}}
   let limit=900;
   if(n===pages.length-1){const footer=items.find(x=>x.y>anchors.at(-1).y+8&&x.value.toLowerCase()==='total');if(footer)limit=Math.min(limit,footer.y-2)}
   for(let i=0;i<anchors.length;i++){
     const a=anchors[i],lo=i===0?a.y-(spec===SPECS.collection?15:11):(spec===SPECS.collection?(anchors[i-1].y+a.y)/2:a.y-11);
     const hi=i===anchors.length-1?limit:(spec===SPECS.collection?(a.y+anchors[i+1].y)/2:anchors[i+1].y-11);
     const c=Array.from({length:spec.edges.length+1},()=>[]);
     for(const x of items){if(x.y>=lo&&x.y<hi)c[column(spec.edges,x.x)].push(x)}
     parsed.push(c);last=c;
   }
 }
 const out=parsed.map(c=>spec.build(c));
 for(let i=0;i<out.length;i++){
   const id=spec===SPECS.zone?out[i][0]:(spec===SPECS.collection?out[i][3]:out[i][0]);
   if(spec===SPECS.zone){if(!/^\d+$/.test(String(id)))throw Error('Ward summary row '+(i+1)+' unreadable')}
   else if(!/^OTS\d{18}$/i.test(String(id)))throw Error('Application number incomplete in row '+(i+1)+': '+String(id).slice(0,30));
 }
 return out;
}
async function convert(file){
  if(!window.pdfjsLib||!window.XLSX)throw Error('PDF/Excel reader did not load. Refresh and retry.');
  pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
  const first=await pdf.getPage(1),intro=(await first.getTextContent()).items.map(x=>x.str).join(' ');
  const type=Object.keys(SPECS).find(key=>SPECS[key].title.test(intro));
  if(!type)return null;
  const spec=SPECS[type],pages=[];
  for(let n=1;n<=pdf.numPages;n++){
    const page=n===1?first:await pdf.getPage(n),content=await page.getTextContent(),items=[];
    for(const t of content.items){const value=String(t.str||'').trim();if(value)items.push({value,x:t.transform[4],y:page.view[3]-t.transform[5]})}
    pages.push(items);
  }
  const data=parsePages(pages,spec);if(!data.length)throw Error('No rows found in '+file.name);
  if(type==='collection')for(const row of data)if(!row[0]||!row[3]||row[1]<=0)throw Error('A collection receipt is incomplete in PDF.');
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([spec.header,...data]),'OTSReport');
  const bytes=XLSX.write(wb,{bookType:'xlsx',type:'array'});
  return{type,count:data.length,rows:data,file:new File([bytes],file.name.replace(/\.pdf$/i,'.xlsx'),{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})};
}
window.OTSSevenPdf={convert,parsePages,SPECS};
})();
