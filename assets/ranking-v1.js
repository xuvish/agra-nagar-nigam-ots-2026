(function(){
'use strict';
const BASELINE={source:'75_DHQ_ApplicationSummary.xls · historical reference',asOf:null,universe:75,referenceOnly:true,rows:[
{name:'Kanpur Nagar Nigam',type:'Nagar Nigam',amount:39919837},
{name:'Moradabad Nagar Nigam',type:'Nagar Nigam',amount:20341750.14},
{name:'Agra Nagar Nigam',type:'Nagar Nigam',amount:19846059.90},
{name:'Varanasi Nagar Nigam',type:'Nagar Nigam',amount:17305559},
{name:'Lucknow Nagar Nigam',type:'Nagar Nigam',amount:10742281}
]};
const $=id=>document.getElementById(id);
const S=v=>String(v??'').trim(),H=v=>S(v).toLowerCase().replace(/[^a-z0-9]+/g,'');
const amount=v=>{const n=Number(S(v).replace(/[,₹\s]/g,''));return Number.isFinite(n)?n:NaN};
const money=v=>'₹'+Number(v||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isAgra=r=>/\bagra\b/i.test(r.name)&&/nagar\s*nigam/i.test(r.name+' '+r.type);
const rankOf=(rows,r)=>1+rows.filter(x=>x.amount>r.amount).length;
function metrics(source){
 const rows=[...source.rows].sort((a,b)=>b.amount-a.amount||a.name.localeCompare(b.name)),a=rows.find(isAgra);
 if(!a)throw Error('Agra Nagar Nigam is missing from the report.');
 const above=rows.filter(x=>x.amount>a.amount).at(-1)||null,below=rows.find(x=>x.amount<a.amount)||null;
 return{rows,a,rank:rankOf(rows,a),above,below,required:above?Math.round((above.amount-a.amount)*100+1)/100:0,lead:below?a.amount-below.amount:null};
}
const col=(headers,parts)=>headers.findIndex(h=>parts.some(p=>h.includes(p)));
function parseSheet(ws){
 const cells=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:true});let candidates=[];
 for(let i=0;i<Math.min(35,cells.length);i++){
  const h=(cells[i]||[]).map(H);
  const name=col(h,['ulbname','nameoftheulb','nameofulb','urbanlocalbody','localbodyname','nikayname']);
  const received=col(h,['receivedamount','totalamountreceived','totalreceived','totalcollection','moneyreceived','totalmoney']);
  const app=col(h,['applicationmoney','applicationamount']),down=col(h,['downpayment']);
  const post=col(h,['moneyreceivedpostots','postotsmoneyreceived','postotsreceived']);
  if(name>=0&&(received>=0||(app>=0&&down>=0&&post>=0)))candidates.push({i,h,name,received,app,down,post});
 }
 if(!candidates.length)return null;
 const c=candidates.find(x=>x.received>=0)||candidates[0],type=col(c.h,['ulbtype','typeofulb','type']),rows=[];
 for(const r of cells.slice(c.i+1)){
  const name=S(r[c.name]),kind=type>=0?S(r[type]):'';
  if(!name||/^(grand\s*)?total$/i.test(name))continue;
  const value=c.received>=0?amount(r[c.received]):amount(r[c.app])+amount(r[c.down])+amount(r[c.post]);
  if(!Number.isFinite(value)||value<0||!/(nagar|palika|panchayat|nigam)/i.test(name+' '+kind))continue;
  rows.push({name,type:kind,amount:Math.round(value*100)/100});
 }
 return rows.some(isAgra)?rows:null;
}
function parseReport(book){
 let choices=[];
 for(const name of book.SheetNames){const rows=parseSheet(book.Sheets[name]);if(rows)choices.push({name,rows})}
 if(!choices.length)throw Error('Cannot identify the ranking report. Expected ULB Name and Received Amount, or the three payment-component columns.');
 const good=choices.filter(x=>x.rows.length===75);
 if(!good.length)throw Error('Expected exactly 75 valid ULBs; found '+choices.map(x=>x.name+': '+x.rows.length).join('; '));
 const chosen=good[0],keys=new Set(chosen.rows.map(x=>H(x.name)));
 if(keys.size!==75||chosen.rows.filter(isAgra).length!==1)throw Error('Ranking report contains duplicate ULBs or does not contain Agra exactly once.');
 return{source:'75 DHQ statewide report · '+chosen.name,rows:chosen.rows,universe:75,referenceOnly:false};
}
function saved(){try{return JSON.parse(localStorage.getItem('ots_ranking_75_v1')||'null')}catch(_){return null}}
function shared(){return window.SHARED_LIVE?.ranking||window.PUBLIC?.ranking||null}
function current(){return shared()||saved()||BASELINE}
function fmtDate(v){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(S(v)))return'Source date not specified';
 const d=new Date(v+'T00:00:00');return Number.isNaN(d.getTime())?S(v):d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
}
function render(){
 const host=$('otsRankPanel');if(!host)return;
 const source=current();let m;try{m=metrics(source)}catch(e){host.textContent='Ranking unavailable: '+e.message;return}
 const prior=source.previous,compare=prior&&source.asOf&&prior.asOf<source.asOf&&prior.universe===source.universe;
 let trend='neutral',trendText=source.referenceOnly?'Historical reference · movement unavailable':'First comparable snapshot · movement unavailable';
 if(compare){
  if(m.rank<prior.rank){trend='up';trendText='↑ '+(prior.rank-m.rank)+' position(s) gained vs '+fmtDate(prior.asOf)}
  else if(m.rank>prior.rank){trend='down';trendText='↓ '+(m.rank-prior.rank)+' position(s) lost vs '+fmtDate(prior.asOf)}
  else if(m.lead!=null&&prior.lead!=null&&m.lead<prior.lead){trend='down';trendText='↓ Rank unchanged · lead over next ULB narrowed'}
  else if(m.lead!=null&&prior.lead!=null&&m.lead>prior.lead){trend='up';trendText='↑ Rank unchanged · lead over next ULB increased'}
  else trendText='— Position unchanged vs '+fmtDate(prior.asOf);
 }
 const top=m.rows.slice(0,5).map(x=>'<div class="ots-rank-row '+(isAgra(x)?'is-agra':'')+'"><span class="ots-rank-place">#'+rankOf(m.rows,x)+'</span><span class="ots-rank-name">'+esc(x.name)+'</span><b>'+money(x.amount)+'</b></div>').join('');
 host.innerHTML='<div class="ots-rank-head"><div><span class="ots-rank-eyebrow">STATEWIDE OTS COLLECTION · 75 REPORTED ULBs</span><h2>Agra Position & Top 5</h2><p>Source: '+esc(source.source)+' · As of '+esc(fmtDate(source.asOf))+(source.referenceOnly?' · HISTORICAL REFERENCE':'')+'</p></div><div class="ots-rank-main"><span>AGRA RANK</span><strong>#'+m.rank+'<small> / '+source.universe+'</small></strong><div class="ots-rank-trend '+trend+'">'+esc(trendText)+'</div></div></div><div class="ots-rank-grid"><div class="ots-rank-leaders"><h3>TOP FIVE · RECEIVED AMOUNT</h3>'+top+'</div><div class="ots-rank-insights"><div><span>Agra reported amount</span><b>'+money(m.a.amount)+'</b></div><div><span>Additional collection to exceed next higher ULB'+(m.above?' ('+esc(m.above.name)+')':'')+'</span><b>'+(m.above?money(m.required):'Rank #1')+'</b></div><div><span>Lead over next lower ULB'+(m.below?' ('+esc(m.below.name)+')':'')+'</span><b>'+(m.lead!=null?money(m.lead):'—')+'</b></div><p>Rank = 1 + ULBs with strictly higher reported received amount. Movement needs two dated statewide reports. City dashboard collection and statewide DHQ totals are separate sources.</p></div></div>';
}
async function prepare(){
 const f=$('otsRankingFile')?.files?.[0];if(!f)return null;
 if(!window.XLSX)throw Error('Excel parser unavailable.');
 const date=S($('otsRankingDate')?.value);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(new Date(date+'T00:00:00').getTime()))throw Error('Confirm the statewide report as-of date.');
 if(!/\.(xls|xlsx|csv)$/i.test(f.name))throw Error('Choose an Excel/CSV ranking report.');
 const book=XLSX.read(await f.arrayBuffer(),{type:'array',raw:true,cellDates:true}),parsed=parseReport(book),prev=shared()||saved();
 const old=prev&&!prev.referenceOnly&&prev.asOf&&prev.universe===75?metrics(prev):null;
 if(old&&date<prev.asOf)throw Error('The report date cannot precede the published ranking date.');
 const previous=old&&date>prev.asOf?{asOf:prev.asOf,universe:75,rank:old.rank,lead:old.lead,amount:old.a.amount}:(old?prev.previous:null);
 return {...parsed,asOf:date,previous,importedAt:new Date().toISOString()};
}
function install(){
 if($('otsRankingFile'))return;
 const box=$('reportModal')?.querySelector('.modalbox'),process=window.processReportSet||window.processWorkbook,builder=window.__buildSharedPayload;
 if(!box||typeof process!=='function'||typeof builder!=='function')return;
 const div=document.createElement('div');div.className='ots-rank-upload';
 div.innerHTML='<b>8th Report · UP 75 ULB Ranking</b><p>Select the DHQ statewide summary separately from the original seven Excel files.</p><input id="otsRankingFile" type="file" accept=".xls,.xlsx,.csv"><label for="otsRankingDate">Statewide report as-of date (confirm from portal)</label><input id="otsRankingDate" type="date"><small id="otsRankingStatus">Optional: the seven-report workflow still works on its own.</small>';
 box.querySelector('.drop')?.insertAdjacentElement('afterend',div);
 let pending=null;
 window.__buildSharedPayload=function(){const p=builder.apply(this,arguments);if(pending)p.ranking=pending;else if(shared())p.ranking=shared();return p};
 const wrapped=async function(){
  try{
   pending=await prepare();
   if(pending)$('otsRankingStatus').textContent='75 ULBs validated · Agra #'+metrics(pending).rank+' · ready with seven reports.';
   return await process.apply(this,arguments);
  }catch(e){const msg=$('uploadMsg');if(msg){msg.className='msg show err';msg.textContent='Ranking validation: '+S(e.message||e)}throw e}
  finally{pending=null}
 };
 window.processReportSet=window.processWorkbook=wrapped;
 const btn=box.querySelector('.btn.primary');if(btn)btn.onclick=wrapped;
 $('otsRankingFile').addEventListener('change',()=>{$('otsRankingStatus').textContent=$('otsRankingFile').files.length?'Ranking file selected; it will be validated on Submit.':'Optional eighth report not selected.'});
}
function init(){
 install();
 const top=$('prodLiveStrip')||document.querySelector('.top');
 if(top&&!$('otsRankPanel')){const el=document.createElement('section');el.id='otsRankPanel';el.className='ots-rank-panel';top.insertAdjacentElement('afterend',el)}
 render();
}
document.addEventListener('ots:bootstrap-ready',init);
document.addEventListener('ots:shared-applied',render);
document.addEventListener('ots:shared-ready',render);
document.addEventListener('ots:published',render);
if(window.__OTS_BOOTSTRAP_READY)init();
window.OTS_RANKING_TEST={parseReport,metrics};
})();