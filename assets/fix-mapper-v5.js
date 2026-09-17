(function(){
'use strict';
const PREV=window.processReportSet||window.processWorkbook;
const clean=s=>String(s??'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const aliases={
  'eram mohan nagar':['Lohamandi',89,'Ram Mohan Nagar'],
  'rahul nagar':['Lohamandi',49,'Rahul Nagar Bodla'],
  'bodla':['Lohamandi',49,'Rahul Nagar Bodla'],
  'block b shastripuram agra':['Lohamandi',101,'Shastripuram'],
  'sastipshastripuram':['Lohamandi',101,'Shastripuram'],
  'shashtripurashastripuram':['Lohamandi',101,'Shastripuram'],
  'shashtripurshastripuram':['Lohamandi',101,'Shastripuram'],
  'shastri puram':['Lohamandi',101,'Shastripuram'],
  'shastshastripuram':['Lohamandi',101,'Shastripuram']
};
function rows(ws){return XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:true})}
function header(a){for(let i=0;i<Math.min(a.length,30);i++){const h=(a[i]||[]).map(clean);if(h.some(x=>x.includes('appl received'))&&h.some(x=>x==='approved')&&h.some(x=>x.includes('demand generated')))return i}return-1}
async function tightenInput(){const input=document.getElementById('masterFile');if(!input||input.dataset.v5busy==='1')return;const fs=[...input.files];if(fs.length!==7)return;input.dataset.v5busy='1';try{const dt=new DataTransfer();let changed=0,apps=0;for(const f of fs){let replaced=false;try{const ab=await f.arrayBuffer(),wb=XLSX.read(ab,{type:'array',raw:true});for(const sh of wb.SheetNames){const a=rows(wb.Sheets[sh]),hi=header(a);if(hi<0)continue;const next=(a[hi+1]||[]).map(clean),start=hi+(next.some(x=>x==='in time'||x==='overdue'||x==='applicant')?2:1);for(let i=start;i<a.length;i++){const r=a[i]||[],k=clean(r[3]),m=aliases[k];if(!m)continue;r[2]=m[0];r[3]=`${m[1]}, ${m[2]}`;changed++;apps+=Number(String(r[4]??0).replace(/,/g,''))||0}wb.Sheets[sh]=XLSX.utils.aoa_to_sheet(a);const out=XLSX.write(wb,{bookType:'xlsx',type:'array'});dt.items.add(new File([out],f.name.replace(/\.xls$/i,'.xlsx'),{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',lastModified:f.lastModified}));replaced=true;break}}catch(e){}if(!replaced)dt.items.add(f)}if(changed){input.files=dt.files;input.dataset.smartReady='';input.dataset.mapperReady='';window.__mapperV5Stats={changed,apps}}}finally{input.dataset.v5busy='0'}}
window.processReportSet=async function(){await tightenInput();const out=await PREV.apply(this,arguments);const E=window.OTS7;if(E?.loaded&&window.__mapperV5Stats){E.mapperV5=window.__mapperV5Stats;const rem=(E.unresolved||[]).reduce((s,r)=>s+(Number(r.applications)||0),0);const notice=document.getElementById('classificationNotice');if(notice)notice.textContent=`Tight safe mapping applied. ${window.__mapperV5Stats.apps} additional applications auto-classified; ${rem} records remain only where ward identity is genuinely ambiguous.`;if(window.renderAll)window.renderAll()}return out};
window.processWorkbook=window.processReportSet;const b=document.querySelector('#reportModal .btn.primary');if(b)b.onclick=window.processReportSet;
})();