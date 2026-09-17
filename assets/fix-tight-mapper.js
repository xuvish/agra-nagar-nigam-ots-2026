(function(){
'use strict';

const ZONES=['Chhatta','Hariparwat','Tajganj','Lohamandi'];
const oldProcess=window.processReportSet||window.processWorkbook;
const n=v=>String(v??'').trim().toLowerCase().replace(/&amp;/g,'&').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const num=v=>{const x=Number(String(v??0).replace(/,/g,''));return Number.isFinite(x)?x:0};
const keyOf=r=>r?`${r.zone}|${Number(r.wardNo)}`:null;
const zoneNorm=v=>{const x=n(v).replace(/\s/g,'');if(/chh?atta|chhata|chatta/.test(x))return'Chhatta';if(x.includes('haripar')||x.includes('harpar'))return'Hariparwat';if(x.includes('tajganj')||x==='taj')return'Tajganj';if(x.includes('lohamandi')||x.includes('lohamand'))return'Lohamandi';return null};

const LOCKED_ROSTER=[
 ['Chhatta',28,'Nai Ki Saray','Anamika Yadav','RI'],['Chhatta',55,'Shahdra','Anamika Yadav','RI'],['Chhatta',65,'Yamuna Par Prakash Nagar','Anamika Yadav','RI'],['Chhatta',54,'Trans Yamuna','Anamika Yadav','RI'],['Chhatta',14,'Kachhpura','Anamika Yadav','RI'],['Chhatta',42,'Bhagawati Bag','Anamika Yadav','RI'],['Chhatta',66,'Nawal Ganj','Anamika Yadav','RI'],['Chhatta',50,'Seeta Nagar','Anamika Yadav','RI'],['Chhatta',83,'Tedi Bagiya','Anamika Yadav','RI'],
 ['Chhatta',99,'Pipal Mandi','Rohit Verma','RI'],['Chhatta',17,'Ratan Pura','Rohit Verma','RI'],['Chhatta',79,'Moti Ganj','Rohit Verma','RI'],['Chhatta',20,'Freeganj','Rohit Verma','RI'],['Chhatta',27,'Bag Muzaffar Khan','Rohit Verma','RI'],['Chhatta',95,'Dhankot Fubbara','Rohit Verma','RI'],['Chhatta',68,'Nuri Darwaja','Rohit Verma','RI'],['Chhatta',91,'Rawat Para','Rohit Verma','RI'],
 ['Chhatta',16,'Dolikhar','Sapan Singh','TC'],['Chhatta',1,'Kajipadha','Sapan Singh','TC'],['Chhatta',100,'Nai Ki Mandi','Sapan Singh','TC'],['Chhatta',64,'Belanganj','Sapan Singh','TC'],
 ['Chhatta',32,'Dera Saras','Sharafat Ali','TC'],['Chhatta',53,'Mantola','Sharafat Ali','TC'],['Chhatta',58,'Naraich West','Vikram Sharma','TC'],['Chhatta',59,'Naraich East','Vikram Sharma','TC'],

 ['Hariparwat',11,'Charsu Darwaja','Nitin Karnwal','RI'],['Hariparwat',13,'Nagala Harmukh','Nitin Karnwal','RI'],['Hariparwat',47,'Ghatiya Ajam Khan','Nitin Karnwal','RI'],['Hariparwat',51,'Vijay Nagar','Nitin Karnwal','RI'],['Hariparwat',92,'Wazir Pura','Nitin Karnwal','RI'],
 ['Hariparwat',26,'Jageshwar Nagar','Rupali Gupta','RI'],['Hariparwat',43,'Ghatwasan','Rupali Gupta','RI'],['Hariparwat',71,'Nagla Padi','Rupali Gupta','RI'],
 ['Hariparwat',31,'Lawyers Colony','Akashdeep','RI'],['Hariparwat',61,'Sarlabagh','Akashdeep','RI'],['Hariparwat',81,'Kamla Nagar A/B/C/D','Akashdeep','RI'],['Hariparwat',93,'Kamla Nagar E/F/G','Akashdeep','RI'],
 ['Hariparwat',85,'Kaveri Kunj','Kiran Sharma','RI'],['Hariparwat',87,'Bhud Ka Bagh','Kiran Sharma','RI'],['Hariparwat',90,'Balkeshwar','Kiran Sharma','RI'],
 ['Hariparwat',38,'Gailana','Yadvendra Kumar','RI'],['Hariparwat',52,'Dev Nagar','Yadvendra Kumar','RI'],['Hariparwat',73,'Sikandra','Yadvendra Kumar','RI'],['Hariparwat',96,'Mahrishi Puram','Yadvendra Kumar','RI'],['Hariparwat',80,'Jatpura','Yadvendra Kumar','RI'],['Hariparwat',82,'Bhim Nagar','Yadvendra Kumar','RI'],
 ['Hariparwat',6,'Jagdish Pura East','Dharmendra Sharma','TC'],['Hariparwat',29,'Khandari','Dharmendra Sharma','TC'],['Hariparwat',94,'Bagh Farjana','Dharmendra Sharma','TC'],

 ['Tajganj',72,'Nagla Mewati','Sandeep Kumar Maurya','RI'],['Tajganj',97,'Gover Chawki','Sandeep Kumar Maurya','RI'],['Tajganj',98,'Vibhav Nagar','Sandeep Kumar Maurya','RI'],
 ['Tajganj',33,'Dhandhoo Pura','Veer Singh','RI'],['Tajganj',44,'Katra Fulail','Veer Singh','RI'],['Tajganj',62,'Teli Para','Veer Singh','RI'],['Tajganj',88,'Harjjupura','Veer Singh','RI'],
 ['Tajganj',2,'Gummat Takht Pahlwan','Deepa Pandey','RI'],['Tajganj',4,'Sewala Jat','Deepa Pandey','RI'],['Tajganj',39,'Naam Ner','Deepa Pandey','RI'],['Tajganj',36,'Mahadev Nagar','Deepa Pandey','RI'],['Tajganj',78,'Shaheed Nagar','Deepa Pandey','RI'],
 ['Tajganj',8,'Edgah','Shamsher Singh','RI'],['Tajganj',23,'Mohan Pura','Shamsher Singh','RI'],['Tajganj',40,'Baluganj','Shamsher Singh','RI'],
 ['Tajganj',22,'Sohalla','Saleem Khan','TC'],['Tajganj',48,'Nari Pura','Saleem Khan','TC'],['Tajganj',60,'Khuwash Pura','Saleem Khan','TC'],['Tajganj',35,'Mustfa Quarter','Saleem Khan','TC'],['Tajganj',57,'Ukhrra','Saleem Khan','TC'],
 ['Tajganj',15,'Saray Maluk Chand','Virendra Chandel','TC'],['Tajganj',63,'Chawli','Virendra Chandel','TC'],['Tajganj',70,'Tal Firoj Khan','Virendra Chandel','TC'],['Tajganj',5,'Himachal Colony','Virendra Chandel','TC'],['Tajganj',19,'Bundoo Katra','Virendra Chandel','TC'],

 ['Lohamandi',75,'Avas Vikas West','Jivendra Prakash','RI'],['Lohamandi',69,'Avas Vikas South','Jivendra Prakash','RI'],['Lohamandi',49,'Rahul Nagar Bodla','Jivendra Prakash','RI'],['Lohamandi',101,'Shastripuram','Jivendra Prakash','RI'],
 ['Lohamandi',46,'Avas Vikas East','Abhishek Dubey','RI'],['Lohamandi',37,'Nagla Ajeeta','Abhishek Dubey','RI'],['Lohamandi',3,'Jagdish Pura West','Abhishek Dubey','RI'],['Lohamandi',24,'Gadhi Bhadauriya','Abhishek Dubey','RI'],['Lohamandi',7,'Khataina','Abhishek Dubey','RI'],
 ['Lohamandi',67,'Albatiya','Meghna Gautam','RI'],['Lohamandi',89,'Ram Mohan Nagar','Meghna Gautam','RI'],['Lohamandi',30,'Ram Nagar','Meghna Gautam','RI'],
 ['Lohamandi',45,'Ashok Nagar','Ramveer Singh','RI'],['Lohamandi',76,'Dhakran','Ramveer Singh','RI'],['Lohamandi',12,'Nagala Mohan','Ramveer Singh','RI'],['Lohamandi',18,'Raj Nagar','Ramveer Singh','RI'],['Lohamandi',86,'Khati Para','Ramveer Singh','RI'],['Lohamandi',74,'Jaipur House','Ramveer Singh','RI'],
 ['Lohamandi',27,'Ajeet Nagar','Shailendra Rathore','TC'],['Lohamandi',21,'Barah Khambha','Shailendra Rathore','TC'],['Lohamandi',9,'Ghas Ki Mandi','Shailendra Rathore','TC'],['Lohamandi',34,'Bhogi Pura','Shailendra Rathore','TC'],
 ['Lohamandi',41,'Ajampada','Sanjay Mohan Kulshreshtha','TC'],['Lohamandi',77,'Kedar Nagar','Sanjay Mohan Kulshreshtha','TC'],['Lohamandi',10,'Prakash Nagar','Sanjay Mohan Kulshreshtha','TC']
].map(([zone,wardNo,ward,ri,post])=>({zone,wardNo,ward,ri,post}));

function skeleton(v){
 let x=n(v);
 const reps=[
  [/\bchh?atta\b|\bchhata\b/g,'chatta'],[/\bnoori\b/g,'nuri'],[/\bdarwaza\b/g,'darwaja'],[/\bnaamner\b|\bnamner\b/g,'naam ner'],[/\bidgah\b/g,'edgah'],[/\bchauki\b|\bchowki\b|\bchoki\b/g,'chawki'],[/\bmewati\s+nagla\b/g,'nagla mewati'],[/\bnagala\b|\bnagal\b/g,'nagla'],[/\baawas\b|\bawas\b|\bawash\b/g,'avas'],[/\bvikash\b/g,'vikas'],[/\bpachimi\b|\bpaschimi\b|\bpashchimi\b|\bpaschim\b/g,'west'],[/\bpurvi\b|\bpurab\b/g,'east'],[/\bdakshin\b/g,'south'],[/\bmaharishi\b/g,'mahrishi'],[/\bajit\b/g,'ajeet'],[/\bajita\b/g,'ajeeta'],[/\bfuvvara\b|\bfuwara\b/g,'fubbara'],[/\bfulel\b|\bfullel\b/g,'fulail'],[/\bharjupura\b/g,'harjjupura'],[/\bkhuash\b|\bkhwas\b|\bkhuwaspura\b|\bkhwaspura\b/g,'khuwash'],[/\bmustfa\b/g,'mustafa'],[/\bquater\b/g,'quarter'],[/\bkhatipada\b|\bkhati\s+pada\b/g,'khati para'],[/\bkhatena\b/g,'khataina'],[/\brajamandi\b|\brajimandi\b/g,'raja mandi'],[/\brammohan\b/g,'ram mohan'],[/\beram\s+mohan\s+nagar\b/g,'ram mohan nagar'],[/\bbhadauria\b/g,'bhadauriya'],[/\bghadi\b|\bghari\b/g,'gadhi'],[/\bfarzana\b/g,'farjana'],[/\bsarla\s*bagh\b|\bsarala\s*bagh\b/g,'sarlabagh'],[/\bkachpura\b|\bkachh\s+pura\b/g,'kachhpura'],[/\bseeta\b/g,'sita'],[/\brawatpara\b/g,'rawat para'],[/\bshahdara\b/g,'shahdra'],[/\bshastri\s*puram\b|\bshashtri\s*puram\b|\bshashtripuram\b|\bsastipshastripuram\b|\bshashtripurashastripuram\b|\bshashtripurshastripuram\b|\bshastshastripuram\b/g,'shastripuram'],[/\bsikandar\b/g,'sikandra'],[/\bpeepal\b/g,'pipal'],[/\bsarai\b/g,'saray'],[/\bghatia\b/g,'ghatiya'],[/\bukhrrra\b/g,'ukhrra'],[/\bnaripura\b/g,'nari pura'],[/\bmohanpura\b/g,'mohan pura'],[/\bnawala?ganj\b|\bnawalnawal\b|\bnawalganj\b/g,'nawal ganj']
 ];
 for(const [a,b] of reps)x=x.replace(a,b);
 return x.replace(/\b(zone|ward|agra|number|no)\b/g,' ').replace(/\b\d{1,3}\b/g,' ').replace(/\s+/g,' ').trim();
}

const MASTER=LOCKED_ROSTER.map(r=>({...r,_k:keyOf(r),_s:skeleton(r.ward)}));
const BY_KEY=new Map(MASTER.map(r=>[r._k,r]));
const BY_NO=new Map();for(const r of MASTER){const a=BY_NO.get(Number(r.wardNo))||[];a.push(r);BY_NO.set(Number(r.wardNo),a)}
const BY_SK=new Map();for(const r of MASTER){const a=BY_SK.get(r._s)||[];a.push(r);BY_SK.set(r._s,a)}
const ALIAS_TO_KEY=new Map([
 ['rahul nagar','Lohamandi|49'],['rahul nagar bodla','Lohamandi|49'],
 ['avas vikas west','Lohamandi|75'],['avas vikas pachimi','Lohamandi|75'],['avas vikas pashchimi','Lohamandi|75'],['avas vikas paschimi','Lohamandi|75'],['avas vikas paschim','Lohamandi|75'],
 ['avas vikas east','Lohamandi|46'],['avas vikas purvi','Lohamandi|46'],['avas vikas south','Lohamandi|69'],['avas vikas dakshin','Lohamandi|69'],
 ['nagla mewati','Tajganj|72'],['mewati nagla','Tajganj|72'],['edgah','Tajganj|8'],['idgah','Tajganj|8'],
 ['nuri darwaja','Chhatta|68'],['noori darwaja','Chhatta|68'],['naam ner','Tajganj|39'],['namner','Tajganj|39'],['gover chawki','Tajganj|97'],['gover chowki','Tajganj|97'],['gover chauki','Tajganj|97'],
 ['harjjupura','Tajganj|88'],['harjupura','Tajganj|88'],['mustafa quarter','Tajganj|35'],['mustfa quarter','Tajganj|35'],['mustfa quater','Tajganj|35'],
 ['nagla ajeeta','Lohamandi|37'],['nagala ajeeta','Lohamandi|37'],['nagla ajita','Lohamandi|37'],['gadhi bhadauriya','Lohamandi|24'],['ghadi bhadauria','Lohamandi|24'],['ghari bhadauria','Lohamandi|24'],
 ['raja mandi','Lohamandi|74'],['rajamandi','Lohamandi|74'],['khati para','Lohamandi|86'],['khati pada','Lohamandi|86'],['khatipada','Lohamandi|86'],['ajampada','Lohamandi|41'],['ajam pada','Lohamandi|41'],['azam pada','Lohamandi|41'],
 ['bagh farjana','Hariparwat|94'],['bagh farzana','Hariparwat|94'],['ghatiya ajam khan','Hariparwat|47'],['ghatiya azam khan','Hariparwat|47'],['nagla harmukh','Hariparwat|13'],['nagala harmukh','Hariparwat|13'],
 ['jagdish pura east','Hariparwat|6'],['jagdishpura east','Hariparwat|6'],['jagdish pura west','Lohamandi|3'],['jagdishpura west','Lohamandi|3'],['mahrishi puram','Hariparwat|96'],['maharishi puram','Hariparwat|96'],
 ['sita nagar','Chhatta|50'],['seeta nagar','Chhatta|50'],['katra fulail','Tajganj|44'],['katra fulel','Tajganj|44'],['dhandhoo pura','Tajganj|33'],['dhandhu pura','Tajganj|33'],
 ['khuwash pura','Tajganj|60'],['khwaspura','Tajganj|60'],['sarlabagh','Hariparwat|61'],['sarla bagh','Hariparwat|61'],['gummat takht pahlwan','Tajganj|2'],['gummat takht pehlwan','Tajganj|2'],['tal firoj khan','Tajganj|70'],['tal firoz khan','Tajganj|70']
 ].map(([a,k])=>[skeleton(a),k]));

function uniqRows(rows){const m=new Map();for(const r of rows||[])if(r)m.set(keyOf(r),r);return[...m.values()]}
function zonesFrom(zoneRaw,wardRaw){return [...new Set([zoneNorm(zoneRaw),zoneNorm(wardRaw)].filter(Boolean))]}
function wardNumbers(v){return [...new Set([...String(v??'').matchAll(/\b(\d{1,3})\b/g)].map(m=>Number(m[1])).filter(x=>BY_NO.has(x)))]}
function uidWardNo(uid){const m=String(uid??'').trim().match(/^09233(\d{3})/i);return m?Number(m[1]):null}

function nameCandidates(raw){
 const s=skeleton(raw);if(!s)return[];
 const ali=ALIAS_TO_KEY.get(s);if(ali&&BY_KEY.has(ali))return[BY_KEY.get(ali)];
 const exact=BY_SK.get(s)||[];if(exact.length)return uniqRows(exact);
 const embedded=MASTER.filter(r=>r._s.length>=4&&(s.includes(r._s)||(s.length>=5&&r._s.includes(s))));
 return uniqRows(embedded);
}
function numberCandidate(no,zones){
 const rows=BY_NO.get(Number(no))||[];if(rows.length===1)return rows[0];
 if(rows.length>1&&zones.length===1){const m=rows.filter(r=>r.zone===zones[0]);if(m.length===1)return m[0]}
 return null;
}
function directResolve(zoneRaw,wardRaw,uid){
 const zones=zonesFrom(zoneRaw,wardRaw), names=uniqRows([...nameCandidates(wardRaw),...nameCandidates(zoneRaw)]), numbers=[...new Set([...wardNumbers(wardRaw),...wardNumbers(zoneRaw)])];
 const numRows=uniqRows(numbers.map(no=>numberCandidate(no,zones)).filter(Boolean));
 const uno=uidWardNo(uid), uidRow=uno==null?null:numberCandidate(uno,zones);
 const candidateZones=new Set([...names,...numRows,uidRow].filter(Boolean).map(r=>r.zone));
 if(names.length>1)return{row:null,reason:'Conflicting ward-name evidence',hardConflict:true,candidateZones:[...candidateZones]};
 if(numRows.length>1)return{row:null,reason:'Conflicting ward-number evidence',hardConflict:true,candidateZones:[...candidateZones]};
 const nameRow=names[0]||null,numRow=numRows[0]||null;
 if(nameRow&&numRow&&keyOf(nameRow)!==keyOf(numRow))return{row:null,reason:`Ward number/name conflict (${numRow.wardNo} ${numRow.ward} vs ${nameRow.wardNo} ${nameRow.ward})`,hardConflict:true,candidateZones:[...candidateZones]};
 if(uidRow&&nameRow&&keyOf(uidRow)!==keyOf(nameRow))return{row:null,reason:`Property UID/name conflict (${uidRow.wardNo} ${uidRow.ward} vs ${nameRow.wardNo} ${nameRow.ward})`,hardConflict:true,candidateZones:[...candidateZones]};
 if(uidRow&&numRow&&keyOf(uidRow)!==keyOf(numRow))return{row:null,reason:`Property UID/ward-number conflict (${uidRow.wardNo} ${uidRow.ward} vs ${numRow.wardNo} ${numRow.ward})`,hardConflict:true,candidateZones:[...candidateZones]};
 if(uidRow)return{row:uidRow,basis:'Property UID + locked Ward→RI roster',hardConflict:false,candidateZones:[uidRow.zone]};
 if(nameRow)return{row:nameRow,basis:'Normalized ward name + locked Ward→RI roster',hardConflict:false,candidateZones:[nameRow.zone]};
 if(numRow)return{row:numRow,basis:(BY_NO.get(Number(numRow.wardNo))||[]).length===1?'Unique citywide ward number':'Ward number + zone context',hardConflict:false,candidateZones:[numRow.zone]};
 if(numbers.includes(27))return{row:null,reason:'Ward 27 is duplicated citywide; zone/name/property evidence is required',hardConflict:false,candidateZones:zones};
 const text=skeleton(`${zoneRaw} ${wardRaw}`);
 if(/\blohiya nagar\b/.test(text))return{row:null,reason:'Lohiya Nagar is not in the locked user-confirmed Ward→RI roster',hardConflict:false,candidateZones:zones};
 return{row:null,reason:zones.length===1?'Ward label is not uniquely identified by the locked roster':'Insufficient Zone/Ward evidence',hardConflict:false,candidateZones:zones};
}

function addEvidence(map,k,row){if(!k||!row)return;const cur=map.get(k)||new Set();cur.add(keyOf(row));map.set(k,cur)}
function finalizeEvidence(map){const out=new Map();for(const [k,set] of map)if(set.size===1){const only=[...set][0];if(BY_KEY.has(only))out.set(k,BY_KEY.get(only))}return out}
function contextKeys(zoneRaw,wardRaw){const z=n(zoneRaw),w=n(wardRaw),zs=skeleton(zoneRaw),ws=skeleton(wardRaw);const keys=[];if(z||w)keys.push(`pair:${z}|${w}`);if(zs&&!zoneNorm(zoneRaw)&&zs.length>=3)keys.push(`field:${zs}`);if(ws&&!zoneNorm(wardRaw)&&ws.length>=3)keys.push(`field:${ws}`);return keys}
function buildPropertyContext(E){
 const raw=new Map();
 for(const pr of E.paidRows||[]){const d=directResolve(pr['Raw zone'],pr['Raw ward'],pr['Property UID']);if(!d.row||d.hardConflict)continue;for(const k of contextKeys(pr['Raw zone'],pr['Raw ward']))addEvidence(raw,k,d.row)}
 return finalizeEvidence(raw);
}
function resolve(zoneRaw,wardRaw,uid,context){
 const d=directResolve(zoneRaw,wardRaw,uid);if(d.row||d.hardConflict||!context)return d;
 const rows=uniqRows(contextKeys(zoneRaw,wardRaw).map(k=>context.get(k)).filter(Boolean));
 if(rows.length===1)return{row:rows[0],basis:'Consistent FULL/PART property context + locked Ward→RI roster',hardConflict:false,candidateZones:[rows[0].zone]};
 if(rows.length>1)return{row:null,reason:'Property/payment context points to more than one ward',hardConflict:true,candidateZones:[...new Set(rows.map(r=>r.zone))]};
 return d;
}
function safeZone(d,zoneRaw,wardRaw){if(d?.row)return d.row.zone;const c=[...new Set(d?.candidateZones||[])];if(d?.hardConflict)return c.length===1?c[0]:null;const z=zonesFrom(zoneRaw,wardRaw);return z.length===1?z[0]:(c.length===1?c[0]:null)}

function emptyWard(r){return{zone:r.zone,wardNo:r.wardNo,ward:r.ward,ri:r.ri,post:r.post,applications:0,approved:0,inProcess:0,rejected:0,applicantPending:0,demand:0,receivedSummary:0,paidApplicants:0,receipts:0,collection:0}}
function addMetrics(target,src,fields){for(const f of fields)target[f]=(target[f]||0)+num(src[f])}
function ensureControl(m,z){if(!m.has(z))m.set(z,{zone:z,wardNo:'—',ward:'Zone Control · Genuinely Ambiguous',ri:'Unassigned (Source)',post:'Control',applications:0,approved:0,inProcess:0,rejected:0,applicantPending:0,demand:0,receivedSummary:0,paidApplicants:0,receipts:0,collection:0});return m.get(z)}
function refreshLocal(E,context){
 for(const a of E.apps||[]){const pr=E.paidMap?.get(a['Application number']);if(!pr)continue;const d=resolve(pr['Raw zone'],pr['Raw ward'],pr['Property UID'],context),z=safeZone(d,pr['Raw zone'],pr['Raw ward']);a['Allocated zone']=z||'';a['Allocated ward']=d.row?.ward||'';a['Allocated RI / TC']=d.row?.ri||'';a['Property UID']=a['Property UID']||pr['Property UID'];a['House / property no.']=a['House / property no.']||pr['House / property no.']}
 if(window.LOCAL?.payments){const byReceipt=new Map((E.payments||[]).map(p=>[String(p['Receipt number']||''),p]));for(const p of LOCAL.payments){const x=byReceipt.get(String(p['Receipt number']||''));if(!x)continue;p['Allocated zone']=x['Property zone']||'';p['Allocated ward']=x['Property ward']||'';p['Allocated RI / TC']=x['Property RI']||'';p['Property UID']=x['Property UID']||p['Property UID'];p['Application house no.']=x['House / property no.']||p['Application house no.']}}
}

function tighten(){
 const E=window.OTS7;if(!E||!E._wardSummary||!E.controls)return null;
 PUBLIC.roster=LOCKED_ROSTER.map(r=>({...r}));
 const context=buildPropertyContext(E), city={...E.controls.city}, zones=Object.fromEntries(ZONES.map(z=>[z,{applications:0,approved:0,inProcess:0,rejected:0,payingApps:0,collection:0,receipts:0,demand:0,receivedSummary:0,applicantPending:0}]));
 const wmap=new Map(MASTER.map(r=>[r._k,emptyWard(r)])), controlRows=new Map(), unresolved=[], paymentIssues=[];

 for(const r of E._wardSummary){
  const d=resolve(r.zoneRaw,r.wardRaw,null,context),rw=d.row,z=safeZone(d,r.zoneRaw,r.wardRaw),inp=num(r.inTime)+num(r.overdue)+num(r.applicant);
  city.demand=(city.demand||0);city.receivedSummary=(city.receivedSummary||0);
  if(z&&zones[z]){const t=zones[z];t.applications+=num(r.applications);t.approved+=num(r.approved);t.inProcess+=inp;t.rejected+=num(r.rejected);t.demand+=num(r.demand);t.receivedSummary+=num(r.received);t.applicantPending+=num(r.applicant)}
  if(rw){const x=wmap.get(keyOf(rw));addMetrics(x,{applications:r.applications,approved:r.approved,inProcess:inp,rejected:r.rejected,applicantPending:r.applicant,demand:r.demand,receivedSummary:r.received},['applications','approved','inProcess','rejected','applicantPending','demand','receivedSummary'])}
  else{
   const item={kind:'summary',zoneRaw:r.zoneRaw,wardRaw:r.wardRaw,zone:z||null,applications:num(r.applications),approved:num(r.approved),inProcess:inp,rejected:num(r.rejected),applicantPending:num(r.applicant),demand:num(r.demand),receivedSummary:num(r.received),reason:d.reason||'Genuinely ambiguous Ward→RI'};unresolved.push(item);
   if(z&&zones[z])addMetrics(ensureControl(controlRows,z),item,['applications','approved','inProcess','rejected','applicantPending','demand','receivedSummary']);
  }
 }

 const paidZoneSets=Object.fromEntries(ZONES.map(z=>[z,new Set()]));
 for(const pr of E.paidRows||[]){const d=resolve(pr['Raw zone'],pr['Raw ward'],pr['Property UID'],context),z=safeZone(d,pr['Raw zone'],pr['Raw ward']);if(z&&paidZoneSets[z])paidZoneSets[z].add(pr['Application number']);if(d.row){const x=wmap.get(keyOf(d.row));if(x)x.paidApplicants++}else if(z&&zones[z])ensureControl(controlRows,z).paidApplicants++}
 for(const z of ZONES)zones[z].payingApps=paidZoneSets[z].size;

 for(const p of E.payments||[]){
  const pr=E.paidMap?.get(p['Application number']);if(!pr){paymentIssues.push({application:p['Application number'],receipt:p['Receipt number'],reason:'Receipt has no matching FULL/PART property row'});continue}
  const d=resolve(pr['Raw zone'],pr['Raw ward'],pr['Property UID'],context),rw=d.row,z=safeZone(d,pr['Raw zone'],pr['Raw ward']);
  p['Property zone']=z||null;p['Property ward']=rw?.ward||null;p['Property RI']=rw?.ri||null;p['Property UID']=pr['Property UID'];p['House / property no.']=pr['House / property no.'];p['Payment state']=pr['Payment state'];
  if(z&&zones[z]){zones[z].collection+=num(p['Amount (INR)']);zones[z].receipts++;if(rw){const x=wmap.get(keyOf(rw));if(x){x.collection+=num(p['Amount (INR)']);x.receipts++}}else{const c=ensureControl(controlRows,z);c.collection+=num(p['Amount (INR)']);c.receipts++}}
  else paymentIssues.push({application:p['Application number'],receipt:p['Receipt number'],rawZone:pr['Raw zone'],rawWard:pr['Raw ward'],propertyUID:pr['Property UID'],amount:num(p['Amount (INR)']),reason:d.reason||'Property zone/ward unresolved'});
 }

 const classifiedRows=[...wmap.values()].filter(r=>['applications','approved','inProcess','rejected','applicantPending','demand','receivedSummary','paidApplicants','receipts','collection'].some(f=>Math.abs(num(r[f]))>0.005));
 const wardRows=[...classifiedRows,...[...controlRows.values()].filter(r=>['applications','approved','inProcess','rejected','applicantPending','demand','receivedSummary','paidApplicants','receipts','collection'].some(f=>Math.abs(num(r[f]))>0.005))].sort((a,b)=>a.zone.localeCompare(b.zone)||(Number(a.wardNo)||9999)-(Number(b.wardNo)||9999));
 const rimap=new Map();for(const w of classifiedRows){const k=`${w.zone}|${w.ri}`,x=rimap.get(k)||{zone:w.zone,ri:w.ri,post:w.post||'',applications:0,approved:0,inProcess:0,rejected:0,applicantPending:0,demand:0,receivedSummary:0,paidApplicants:0,receipts:0,collection:0,wards:0};addMetrics(x,w,['applications','approved','inProcess','rejected','applicantPending','demand','receivedSummary','paidApplicants','receipts','collection']);x.wards++;rimap.set(k,x)}
 E.controls={city,zones};E.wardRows=wardRows;E.riRows=[...rimap.values()].sort((a,b)=>a.zone.localeCompare(b.zone)||a.ri.localeCompare(b.ri));E.unresolved=unresolved;
 refreshLocal(E,context);
 const unresolvedApps=unresolved.reduce((s,r)=>s+num(r.applications),0), unresolvedApproved=unresolved.reduce((s,r)=>s+num(r.approved),0), unresolvedInProcess=unresolved.reduce((s,r)=>s+num(r.inProcess),0);
 const zoneSum=f=>ZONES.reduce((s,z)=>s+num(zones[z][f]),0), wardSum=f=>wardRows.reduce((s,r)=>s+num(r[f]),0), riSum=f=>E.riRows.reduce((s,r)=>s+num(r[f]),0);
 E.classifierAudit={version:'tight-v2',lockedRosterRows:MASTER.length,propertyContextKeys:context.size,unresolvedRows:unresolved.length,unresolvedApps,unresolvedApproved,unresolvedInProcess,paymentIssues,city:{...city},zoneSums:{applications:zoneSum('applications'),approved:zoneSum('approved'),inProcess:zoneSum('inProcess'),rejected:zoneSum('rejected'),payingApps:zoneSum('payingApps'),receipts:zoneSum('receipts'),collection:zoneSum('collection'),demand:zoneSum('demand')},wardSums:{applications:wardSum('applications'),approved:wardSum('approved'),inProcess:wardSum('inProcess'),rejected:wardSum('rejected'),paidApplicants:wardSum('paidApplicants'),receipts:wardSum('receipts'),collection:wardSum('collection'),demand:wardSum('demand')},riSums:{applications:riSum('applications'),approved:riSum('approved'),inProcess:riSum('inProcess'),rejected:riSum('rejected'),paidApplicants:riSum('paidApplicants'),receipts:riSum('receipts'),collection:riSum('collection'),demand:riSum('demand')},unresolved:unresolved.map(r=>({...r}))};
 window.__resolveWardTight=(zoneRaw,wardRaw,uid)=>resolve(zoneRaw,wardRaw,uid,context);window.__otsClassifierDiagnostics=()=>E.classifierAudit;
 const notice=document.getElementById('classificationNotice');if(notice)notice.textContent=unresolvedApps?`Deterministic Ward → RI mapping active. ${unresolvedApps} application(s) remain genuinely ambiguous and are retained in Needs Classification with an exact reason; no guessed ward split.`:'All application-summary rows safely classified to the locked Ward → RI roster.';
 return E.classifierAudit;
}

window.__tightenOTS=tighten;
window.processReportSet=async function(){
 const out=await oldProcess.apply(this,arguments);const a=tighten();
 if(a){if(window.renderAll)window.renderAll();if(window.uploadMessage){const E=window.OTS7,c=E.controls.city,ok=(num(c.applications)===num(c.approved)+num(c.inProcess)+num(c.rejected));uploadMessage(`Classifier tightened: ${c.applications} apps · ${c.approved} approved · ${c.inProcess} in-process · ${c.rejected} rejected · ${c.receipts} receipts · ₹${Number(c.collection||0).toLocaleString('en-IN')}. ${a.unresolvedApps?`${a.unresolvedApps} genuinely ambiguous app(s) remain.`:'All summary applications classified.'}${ok?' Reconciliation identity passed.':' WARNING: application reconciliation failed.'}`,ok)}}
 return out;
};
window.processWorkbook=window.processReportSet;
console.log('OTS deterministic Ward → RI classifier v2 ready');
})();
