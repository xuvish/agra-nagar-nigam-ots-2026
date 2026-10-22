(function(){
'use strict';
const ORDER=['Anamika Yadav','Rohit Verma','Vikram Sharma','Sharafat Ali','Sapan Singh'];
const HEAD=['वार्ड संख्या एवं नाम','राजस्व निरीक्षक / कर संग्रहकर्ता का नाम','कुल प्राप्त आवेदन','प्रक्रियाधीन आवेदन','स्वीकृत आवेदन','भुगतान प्राप्त स्वीकृत आवेदन','भुगतान हेतु लंबित स्वीकृत आवेदन','कुल प्राप्त धनराशि (₹)','कुल सृजित मांग (₹)'];
function build(p){
 if(!p?.snapshot)throw Error('पहले रिपोर्ट अपलोड करें।');
 const wards=(p.wardRows||[]).filter(w=>w.zone==='Chhatta');
 if(wards.length!==25||new Set(wards.map(w=>w.wardNo)).size!==25)throw Error('छत्ता के सभी 25 वार्ड उपलब्ध नहीं हैं। रिपोर्ट जाँचें।');
 const keys=['applications','inProcess','approved','payingApps','collection','demand'];
 for(const w of wards){if(!ORDER.includes(w.ri)||keys.some(k=>typeof w[k]!=='number'||!Number.isFinite(w[k])||w[k]<0)||w.payingApps>w.approved)throw Error('वार्ड '+w.ward+' के आँकड़े जाँचें।');}
 const z=p.zones?.Chhatta;
 if(!z)throw Error('छत्ता जोन का सारांश उपलब्ध नहीं है।');
 for(const k of keys){const sum=wards.reduce((n,w)=>n+w[k],0);if(Math.abs(sum-Number(z[k]))>0.01)throw Error('वार्ड एवं जोन योग में अंतर: '+k);}
 const rows=[['छत्ता जोन का वार्डवार OTS विवरण'],['रिपोर्ट दिनांक: '+p.snapshot],[],HEAD],subtotals=[];
 let grand=Array(7).fill(0);
 for(const ri of ORDER){
  const group=wards.filter(w=>w.ri===ri).sort((a,b)=>a.wardNo-b.wardNo),first=rows.length+1,total=Array(7).fill(0);
  for(const w of group){const v=[w.applications,w.inProcess,w.approved,w.payingApps,w.approved-w.payingApps,w.collection,w.demand];v.forEach((n,i)=>{total[i]+=n;grand[i]+=n});rows.push([w.wardNo+' — '+w.ward,w.ri,...v]);}
  rows.push([ri+' — योग','',...total]);subtotals.push({row:rows.length,first,last:rows.length-1});
 }
 rows.push(['महायोग','',...grand]);const grandRow=rows.length;
 rows.push([],['भुगतान प्राप्त में पूर्ण एवं आंशिक भुगतान शामिल हैं।'],['भुगतान लंबित = स्वीकृत आवेदन जिनमें भुगतान प्राप्त नहीं हुआ।'],['स्रोत: पोर्टल का चयनित रिपोर्ट दिनांक; OTS मांग एवं संग्रह के मूल आँकड़े।']);
 return {rows,subtotals,grandRow,grand,snapshot:p.snapshot};
}
function download(p){
 try{
  if(!window.XLSX)throw Error('Excel सुविधा लोड नहीं हुई। पेज रीफ्रेश करें।');
  const b=build(p),X=window.XLSX,ws=X.utils.aoa_to_sheet(b.rows);
  for(let r=5;r<=b.grandRow;r++)for(let c=2;c<9;c++){const a=X.utils.encode_cell({r:r-1,c}),cell=ws[a];if(cell?.t==='n')cell.z='#,##0';}
  for(const s of b.subtotals)for(let c=2;c<9;c++){const col=X.utils.encode_col(c);ws[col+s.row].f='SUM('+col+s.first+':'+col+s.last+')';}
  for(let c=2;c<9;c++){const col=X.utils.encode_col(c);ws[col+b.grandRow].f=b.subtotals.map(s=>col+s.row).join('+');}
  ws['!cols']=[{wch:35},{wch:30},...Array(5).fill({wch:24}),{wch:26},{wch:26}];
  ws['!rows']=[];ws['!rows'][3]={hpt:45};
  ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:8}},{s:{r:1,c:0},e:{r:1,c:8}}];
  const wb=X.utils.book_new();X.utils.book_append_sheet(wb,ws,'Chhatta Ward Report');
  X.writeFile(wb,'Chhatta_25_Wards_'+b.snapshot+'.xlsx',{compression:true});
 }catch(e){alert(e.message||'रिपोर्ट डाउनलोड नहीं हुई।');}
}
window.OTS_WARD_REPORT={build,download};
})();