(function(){
'use strict';
const PREV=window.processReportSet||window.processWorkbook;
const clean=s=>String(s??'').toLowerCase().replace(/&amp;/g,'&').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const num=v=>{const x=Number(String(v??0).replace(/,/g,''));return Number.isFinite(x)?x:0};
const ZONES=['Chhatta','Hariparwat','Tajganj','Lohamandi'];
function zNorm(v){const x=clean(v).replace(/\s/g,'');if(/chh?atta|chhata|chatta/.test(x))return'Chhatta';if(x.includes('haripar')||x.includes('harpar'))return'Hariparwat';if(x.includes('tajganj')||x==='taj')return'Tajganj';if(x.includes('lohamandi')||x.includes('lohamand'))return'Lohamandi';return null}
function skel(v){let x=clean(v);const reps=[
 [/\bnoori\b/g,'nuri'],[/\bdarwaza\b/g,'darwaja'],[/\bnawalnawal\b|\bnawalganj\b/g,'nawal ganj'],[/\bnaamner\b|\bnamner\b/g,'naam ner'],[/\bidgah\b/g,'edgah'],[/\bmewati\s+nagla\b/g,'nagla mewati'],[/\bshastri\s*puram\b|\bshashtri\s*puram\b|\bshashtripuram\b|\bsastipshastripuram\b|\bshashtripurashastripuram\b|\bshashtripurshastripuram\b|\bshastshastripuram\b/g,'shastripuram'],
 [/\beram\s+mohan\s+nagar\b/g,'ram mohan nagar'],[/\brammohan\b/g,'ram mohan'],[/\bkhati\s+pada\b|\bkhatipada\b/g,'khati para'],[/\baawas\b|\bawas\b|\bawash\b/g,'avas'],[/\bvikash\b/g,'vikas'],[/\bpachimi\b|\bpaschimi\b|\bpashchimi\b|\bpaschim\b/g,'west'],[/\bpurvi\b|\bpurab\b/g,'east'],[/\bdakshin\b/g,'south'],[/\bmaharishi\b/g,'mahrishi'],[/\bghatia\b/g,'ghatiya'],[/\bfuvvara\b|\bfuwara\b/g,'fubbara'],[/\bfulel\b|\bfullel\b/g,'fulail'],[/\bharjupura\b/g,'harjjupura'],[/\bkhuash\b|\bkhwas\b/g,'khuwash'],[/\bmustfa\b/g,'mustafa'],[/\bquater\b/g,'quarter'],[/\bnagala\b|\bnagal\b/g,'nagla'],[/\bajit\b/g,'ajeet'],[/\bajita\b/g,'ajeeta'],[/\bbhadauria\b/g,'bhadauriya'],[/\bghadi\b/g,'gadhi'],[/\bfarzana\b/g,'farjana'],[/\bsarla\s+bagh\b/g,'sarlabagh'],[/\bkachpura\b/g,'kachhpura'],[/\bseeta\b/g,'sita'],[/\brawatpara\b/g,'rawat para']
 ];for(const [a,b] of reps)x=x.replace(a,b);return x.replace(/\b(zone|ward|agra|number|no)\b/g,' ').replace(/\s+/g,' ').trim()}
function master(){return (PUBLIC.roster||[])}
function byNo(no,zone){let a=master().filter(x=>Number(x.wardNo)===Number(no)&&(zone?x.zone===zone:true));return a.length===1?a[0]:null}
function byName(name,zone){let q=skel(name).replace(/^\d{1,3}\s+/,'').trim();if(!q)return null;let a=master().filter(x=>(!zone||x.zone===zone)&&skel(x.ward)===q);if(a.length===1)return a[0];a=master().filter(x=>skel(x.ward)===q);if(a.length===1)return a[0];
 // Safe containment handles strings such as BLOCK-B SHASTRIPURAM AGRA without guessing generic localities.
 a=master().filter(x=>(!zone||x.zone===zone)&&skel(x.ward).length>=5&&(q.includes(skel(x.ward))||skel(x.ward).includes(q)));const u=new Map(a.map(x=>[`${x.zone}|${x.wardNo}`,x]));return u.size===1?[...u.values()][0]:null}
function uidWard(uid){const m=String(uid??'').match(/^09233(\d{3})/i);return m?Number(m[1]):null}
function nums(v){return [...String(v??'').matchAll(/\b(\d{1,3})\b/g)].map(m=>Number(m[1]))}
function resolve(zoneRaw,wardRaw,uid){
 let z=zNorm(zoneRaw)||zNorm(wardRaw),r;
 // When Property UID embeds a ward code, it is the strongest property-level signal.
 const uno=uidWard(uid);if(uno){r=byNo(uno,z)||byNo(uno);if(r)return r}
 // Explicit ward text wins over a dirty/misplaced zone label or a conflicting old number prefix.
 r=byName(wardRaw,z)||byName(wardRaw)||((zNorm(wardRaw)&&byName(zoneRaw,z))?byName(zoneRaw,z):null);if(r)return r;
 const all=[...nums(wardRaw),...nums(zoneRaw)];
 // A ward number that is globally unique in the locked 100-ward roster is safe even when the source zone is wrong.
 for(const no of all){r=byNo(no);if(r)return r}
 // If a number is not globally unique, zone+number may still disambiguate it.
 for(const no of all){r=byNo(no,z);if(r)return r}
 return null;
}
function header(rows,need){for(let i=0;i<Math.min(rows.length,30);i++){const h=(rows[i]||[]).map(clean);if(need.every(n=>h.some(x=>x===n||x.includes(n))))return i}return-1}
async function tightenFiles(){const input=document.getElementById('masterFile');if(!input||input.dataset.v6busy==='1')return;const fs=[...input.files];if(fs.length!==7)return;input.dataset.v6busy='1';try{const dt=new DataTransfer();let changed=0;for(const f of fs){let outFile=f;try{const ab=await f.arrayBuffer(),wb=XLSX.read(ab,{type:'array',raw:true});let touched=false;for(const sh of wb.SheetNames){const a=XLSX.utils.sheet_to_json(wb.Sheets[sh],{header:1,defval:'',raw:true});let hi=header(a,['appl received','approved','demand generated']);if(hi>=0){const next=(a[hi+1]||[]).map(clean),start=hi+(next.some(x=>x==='in time'||x==='overdue'||x==='applicant')?2:1);for(let i=start;i<a.length;i++){const rr=a[i]||[];if(!String(rr[2]??'').trim()&&!String(rr[3]??'').trim())continue;const wr=resolve(rr[2],rr[3],null);if(!wr)continue;const nz=wr.zone,nw=`${wr.wardNo}, ${wr.ward}`;if(String(rr[2])!==nz||String(rr[3])!==nw){rr[2]=nz;rr[3]=nw;changed++;touched=true}}wb.Sheets[sh]=XLSX.utils.aoa_to_sheet(a);continue}
        hi=header(a,['appno','zonename','wardname','totalpaid']);if(hi>=0){const h=a[hi].map(x=>String(x??'').trim()),ix={};h.forEach((x,i)=>ix[x]=i);for(let i=hi+1;i<a.length;i++){const rr=a[i]||[];if(!rr.length)continue;const wr=resolve(rr[ix.ZoneName],rr[ix.WardName],rr[ix.Property_UID]);if(!wr)continue;const nw=`${wr.wardNo}, ${wr.ward}`;if(String(rr[ix.ZoneName])!==wr.zone||String(rr[ix.WardName])!==nw){rr[ix.ZoneName]=wr.zone;rr[ix.WardName]=nw;changed++;touched=true}}wb.Sheets[sh]=XLSX.utils.aoa_to_sheet(a)}
      }if(touched){const arr=XLSX.write(wb,{bookType:'xlsx',type:'array'});outFile=new File([arr],f.name.replace(/\.xls$/i,'.xlsx'),{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',lastModified:f.lastModified})}}catch(e){console.warn('final mapper pre-map skipped',f.name,e)}dt.items.add(outFile)}if(changed){input.files=dt.files;input.dataset.smartReady='';input.dataset.mapperReady='';window.__mapperV6Pre=changed}}finally{input.dataset.v6busy='0'}}
function clamp(v){v=Number(v)||0;return Math.abs(v)<0.005?0:v}
function mergeRows(rows){const m=new Map();for(const r of rows){const key=`${r.zone}|${r.wardNo}|${r.ward}|${r.ri}`;const x=m.get(key)||{...r,applications:0,approved:0,inProcess:0,rejected:0,applicantPending:0,demand:0,receivedSummary:0,paidApplicants:0,receipts:0,collection:0};for(const k of ['applications','approved','inProcess','rejected','applicantPending','demand','receivedSummary','paidApplicants','receipts','collection'])x[k]+=num(r[k]);m.set(key,x)}return[...m.values()]}
function rebuildRI(rows){const m=new Map();for(const r of rows){const key=`${r.zone}|${r.ri}`;const x=m.get(key)||{zone:r.zone,ri:r.ri,post:r.post||'',applications:0,approved:0,inProcess:0,rejected:0,applicantPending:0,demand:0,receivedSummary:0,paidApplicants:0,receipts:0,collection:0,wards:0};for(const k of ['applications','approved','inProcess','rejected','applicantPending','demand','receivedSummary','paidApplicants','receipts','collection'])x[k]+=num(r[k]);x.wards++;m.set(key,x)}return[...m.values()].sort((a,b)=>a.zone.localeCompare(b.zone)||a.ri.localeCompare(b.ri))}
function finalReconcile(){const E=window.OTS7;if(!E?.loaded||!E.controls?.zones)return;let rows=mergeRows(E.wardRows||[]);
 // Every source row is accounted for. If the report itself contains only a generic zone/locality and no safe ward identity, keep it in a visible zone-control row instead of guessing an RI or counting it twice as Needs Classification.
 for(const z of ZONES){const ctl=E.controls.zones[z]||{};const zr=rows.filter(r=>r.zone===z);const sum=k=>zr.reduce((s,r)=>s+num(r[k]),0);const d={applications:clamp(num(ctl.applications)-sum('applications')),approved:clamp(num(ctl.approved)-sum('approved')),inProcess:clamp(num(ctl.inProcess)-sum('inProcess')),rejected:clamp(num(ctl.rejected)-sum('rejected')),applicantPending:clamp(num(ctl.applicantPending)-sum('applicantPending')),demand:clamp(num(ctl.demand)-sum('demand')),receivedSummary:clamp(num(ctl.receivedSummary)-sum('receivedSummary')),paidApplicants:clamp(num(ctl.payingApps)-sum('paidApplicants')),receipts:clamp(num(ctl.receipts)-sum('receipts')),collection:clamp(num(ctl.collection)-sum('collection'))};const meaningful=Object.values(d).some(v=>Math.abs(num(v))>0.005);if(meaningful)rows.push({zone:z,wardNo:'—',ward:'Source Ward Unclear · Zone Control',ri:'Unassigned (Source)',post:'Control',...d})}
 E.wardRows=rows.sort((a,b)=>a.zone.localeCompare(b.zone)||(Number(a.wardNo)||9999)-(Number(b.wardNo)||9999));E.riRows=rebuildRI(E.wardRows);E.unresolved=[];E.mapperV6={preChanged:window.__mapperV6Pre||0,zoneControlRows:E.wardRows.filter(r=>r.ri==='Unassigned (Source)').length};
 const notice=document.getElementById('classificationNotice');if(notice)notice.textContent='Tight reconciliation active: normal spelling/zone errors are auto-mapped to the locked Ward → RI roster. No record is dropped and no ambiguous ward is guessed; any genuinely source-unclear residue stays visibly inside its zone-control row.';
 if(window.renderAll)window.renderAll();
}
window.processReportSet=async function(){await tightenFiles();const out=await PREV.apply(this,arguments);finalReconcile();return out};
window.processWorkbook=window.processReportSet;const b=document.querySelector('#reportModal .btn.primary');if(b)b.onclick=window.processReportSet;
})();