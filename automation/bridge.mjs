#!/usr/bin/env node
/**
 * Local-only OTS bridge. Run on the operator's own Mac/Windows desktop.
 * Credentials are accepted by http://127.0.0.1:8765/control only, held in memory,
 * used with the visible official browser, and never uploaded to GitHub/Supabase.
 * This is NOT a hosted credential relay or a CAPTCHA/OTP bypass.
 */
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const PORT=8765;
const LOCAL='http://127.0.0.1:'+PORT;
const ORIGIN='https://www.upulbots.in';
const PORTAL=ORIGIN+'/Login.aspx';
const DASHBOARD='https://xuvish.github.io/agra-nagar-nigam-ots-2026/ots/';
const PLAN=path.join(os.homedir(),'.agra-ots-automation','selectors.json');
const NAMES=['apps','zone','collection','full','part','inprocess','approved'];
const LABELS=['Applications','Zone/Ward Summary','Collection','FULL Payment','PART Payment','In-Process','Approved Applications'];
const LIMIT=32000;
const status={phase:'idle',progress:0,message:'Ready. Complete one-time export setup before starting.',report:null,error:null,sevenPublished:false,rankingPublished:false,updatedAt:null};
let active=null;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function stage(phase,progress,message,report=null){
 Object.assign(status,{phase,progress,message,report,error:null,updatedAt:new Date().toISOString()});
 console.log('[OTS Bridge] '+phase+': '+message);
}
const safeName=s=>String(s||'report.xls').replace(/[^a-z0-9._-]/gi,'_').slice(0,90);
function assertPath(step){
 return step&&typeof step.path==='string'&&step.path.startsWith('/')&&!step.path.startsWith('//')&&!step.path.includes('\\')&&
 typeof step.selector==='string'&&step.selector.length>0&&step.selector.length<1000;
}
async function getPlan(){
 const cfg=JSON.parse(await fs.readFile(PLAN,'utf8'));
 if(cfg.version!==1||cfg.portalOrigin!==ORIGIN||!Array.isArray(cfg.reports)||cfg.reports.length!==7)
  throw Error('Local 7-report selector setup is missing. Run npm run setup once.');
 for(let i=0;i<7;i++)if(cfg.reports[i].key!==NAMES[i]||!cfg.reports[i].steps?.length||!cfg.reports[i].steps.every(assertPath))
  throw Error('Invalid recorded export steps for '+LABELS[i]+'. Run npm run setup.');
 if(cfg.ranking&&(!cfg.ranking.steps?.length||!cfg.ranking.steps.every(assertPath)))
  throw Error('Invalid ranking export steps. Run npm run setup again.');
 return cfg;
}
function watchDownload(context,timeout=120000){
 let settled=false,finish,onPage,timer;
 const listeners=new Map();
 const promise=new Promise((resolve,reject)=>{
  finish=(error,download)=>{
   if(settled)return;settled=true;clearTimeout(timer);
   for(const [p,handler] of listeners)p.off('download',handler);
   context.off('page',onPage);
   if(error)reject(error);else resolve(download);
  };
  const attach=page=>{if(listeners.has(page))return;const cb=d=>finish(null,d);listeners.set(page,cb);page.on('download',cb)};
  onPage=p=>attach(p);
  context.pages().forEach(attach);context.on('page',onPage);
  timer=setTimeout(()=>finish(Error('Timed out waiting for Excel download. Check portal session and recorded export buttons.')),timeout);
 });
 return{promise,cancel:()=>finish(Error('Download watcher cancelled.'))};
}
async function save(download,dir,key,index){
 const ext=path.extname(download.suggestedFilename()).toLowerCase();
 if(!['.xls','.xlsx','.csv'].includes(ext))throw Error('Unexpected export extension '+ext);
 const file=path.join(dir,String(index+1).padStart(2,'0')+'-'+key+'-'+safeName(download.suggestedFilename()));
 await download.saveAs(file);
 const info=await fs.stat(file);
 if(!info.size||info.size>50*1024*1024)throw Error('Invalid size in report '+key);
 return file;
}
async function replayOne(page,context,item,dir,index){
 for(let j=0;j<item.steps.length;j++){
  const step=item.steps[j];
  if(new URL(page.url()).pathname!==step.path)await page.goto(ORIGIN+step.path,{waitUntil:'domcontentloaded',timeout:60000});
  if(new URL(page.url()).origin!==ORIGIN)throw Error('Portal redirected outside its approved origin; stopped.');
  const el=page.locator(step.selector).first();
  if(j===item.steps.length-1){
   const watcher=watchDownload(context);
   try{await el.click({timeout:30000});return await save(await watcher.promise,dir,item.key,index)}
   catch(e){watcher.cancel();throw Error('Export '+item.key+' failed at recorded step '+(j+1)+': '+e.message)}
  }
  await el.click({timeout:30000});await wait(350);
 }
 throw Error('No export action recorded for '+item.key);
}
async function tryPrefillOfficialLogin(page,username,password){
 // The portal may change its login form. Never guess an unrelated field or submit CAPTCHA.
 try{
  if(new URL(page.url()).origin!==ORIGIN)return false;
  const passwords=page.locator('input[type="password"]:visible');
  if(await passwords.count()!==1)return false;
  const candidates=page.locator('input[type="text"]:visible,input[type="email"]:visible,input:not([type]):visible');
  const count=await candidates.count(), usable=[];
  for(let i=0;i<count;i++){
   const node=candidates.nth(i);
   const description=await node.evaluate(e=>(e.id+' '+e.name+' '+e.placeholder+' '+(e.getAttribute('autocomplete')||'')).toLowerCase());
   if(!/captcha|otp|verify|search|code|mobile|phone|security|answer/.test(description))usable.push(node);
  }
  if(usable.length!==1)return false;
  await usable[0].fill(username);await passwords.first().fill(password);
  return true;
 }catch{return false}
}
async function waitForModalResult(page){
 await page.waitForFunction(()=>{
  const msg=document.querySelector('#uploadMsg')?.textContent||'';
  return /published successfully|live publish failed|could not identify|not recognized|invalid|failed:|reconciliation failed/i.test(msg);
 },null,{timeout:240000});
 const result=(await page.locator('#uploadMsg').textContent())||'';
 if(!/published successfully/i.test(result))throw Error('Existing dashboard did not confirm live publication: '+result.trim());
}
async function publishSeven(context,files,credentials){
 stage('importing',76,'Opening the existing dashboard and verifying administrator access.');
 const page=await context.newPage();
 await page.goto(DASHBOARD,{waitUntil:'domcontentloaded',timeout:90000});
 await page.waitForFunction(()=>window.__OTS_BOOTSTRAP_READY===true,null,{timeout:90000});
 await page.evaluate(()=>{if(typeof window.openReports!=='function')throw Error('Dashboard report uploader unavailable');window.openReports()});
 const login=page.locator('#adminLoginModal');
 await login.waitFor({state:'visible',timeout:30000});
 await page.locator('#adminUser').fill(credentials.dashboardUsername);
 await page.locator('#adminPass').fill(credentials.dashboardPassword);
 credentials.dashboardPassword='';
 await page.locator('#adminLoginForm button[type="submit"]').click();
 await page.waitForFunction(()=>document.querySelector('#reportModal')?.classList.contains('on')||
  document.querySelector('#adminLoginMsg')?.classList.contains('err'),null,{timeout:30000});
 if(!(await page.locator('#reportModal').evaluate(e=>e.classList.contains('on'))))
  throw Error('Dashboard administrator login failed. Check the separate dashboard credentials.');
 stage('importing',81,'Matching all seven Excel reports by content.');
 await page.locator('#masterFile').setInputFiles(files);
 await page.waitForFunction(()=>{
  const message=document.querySelector('#uploadMsg')?.textContent||'';
  return /7 reports identified by CONTENT|could not identify|repair\/read failed|not recognized/i.test(message);
 },null,{timeout:120000});
 const confirm=(await page.locator('#uploadMsg').textContent())||'';
 if(!/7 reports identified by CONTENT/i.test(confirm))throw Error('Seven-file validation failed: '+confirm);
 stage('calculating',88,'Seven files verified. Recalculating applications, receipts and all four zones.');
 await page.locator('#reportModal .btn.primary').click();
 await waitForModalResult(page);
 status.sevenPublished=true;
 stage('published',94,'Existing 7-report dashboard successfully published. Checking optional ranking.');
 return page;
}
async function publishRanking(page,file,date){
 if(!file)return;
 const open=page.locator('#otsRankOpenUpload');
 await open.waitFor({state:'visible',timeout:30000});
 await open.click();
 await page.locator('#otsRankFile').setInputFiles(file);
 if(date)await page.locator('#otsRankSourceDate').fill(date);
 await page.locator('#otsRankPublish').waitFor({state:'visible',timeout:30000});
 await page.waitForFunction(()=>{
  const b=document.querySelector('#otsRankPublish'),m=document.querySelector('#otsRankMessage')?.textContent||'';
  return (b&&!b.disabled)||/not found|invalid|duplicate|exceeds|error|failed/i.test(m);
 },null,{timeout:120000});
 const b=page.locator('#otsRankPublish');
 if(await b.isDisabled())throw Error('Ranking sheet validation failed: '+(await page.locator('#otsRankMessage').textContent()));
 stage('ranking',96,'Ranking sheet checked. Publishing independent ULB ranking.');
 await b.click();
 await page.waitForFunction(()=>{
  const msg=document.querySelector('#otsRankMessage')?.textContent||'';
  return /ranking published for all website visitors|publish failed|invalid administrator|failed|duplicate/i.test(msg);
 },null,{timeout:90000});
 const msg=(await page.locator('#otsRankMessage').textContent())||'';
 if(!/ranking published for all website visitors/i.test(msg))throw Error('Ranking publication failed: '+msg);
 status.rankingPublished=true;
}
async function run(job){
 let dir;
 try{
  const cfg=await getPlan();
  dir=await fs.mkdtemp(path.join(os.tmpdir(),'agra-ots-bridge-'));
  stage('browser',4,'Opening official OTS portal in a visible local browser.');
  const browser=await chromium.launch({headless:false});
  job.browser=browser;
  const context=await browser.newContext({acceptDownloads:true});
  const page=await context.newPage();
  await page.goto(PORTAL,{waitUntil:'domcontentloaded',timeout:90000});
  const prefilled=await tryPrefillOfficialLogin(page,job.credentials.portalUsername,job.credentials.portalPassword);
  job.credentials.portalPassword='';
  stage('awaiting_login',8,prefilled?
    'Official portal credentials prefilled. Complete sign-in/CAPTCHA/OTP in the opened browser, then press Continue here.':
    'Official portal opened. Enter your credentials there, complete CAPTCHA/OTP, then press Continue here.');
  await new Promise((resolve,reject)=>{job.continue=resolve;job.reject=reject});
  if(new URL(page.url()).origin!==ORIGIN)throw Error('Login browser is no longer on the official OTS origin.');
  if(/Login\.aspx/i.test(new URL(page.url()).pathname)&&(await page.locator('input[type="password"]:visible').count())>0)
   throw Error('Official portal login still appears open. Complete login before continuing.');
  const files=[];
  for(let i=0;i<7;i++){
   stage('downloading',12+Math.round(i*7), 'Downloading '+LABELS[i]+' ('+(i+1)+'/7)…',LABELS[i]);
   files.push(await replayOne(page,context,cfg.reports[i],dir,i));
  }
  let ranking=null;
  if(cfg.ranking){
   stage('downloading',64,'Downloading optional statewide ranking report (8/8)…','Ranking');
   ranking=await replayOne(page,context,cfg.ranking,dir,7);
  }
  if(files.length!==7)throw Error('Incomplete seven-report export; nothing was submitted.');
  stage('validating',72,'All seven Excel downloads complete. Import validation is starting.');
  const dashboard=await publishSeven(context,files,job.credentials);
  if(ranking)await publishRanking(dashboard,ranking,job.credentials.rankingDate);
  stage('done',100,ranking?'Seven reports and statewide ranking published successfully.':'All seven reports published successfully. Refresh to see the latest dashboard.');
 }catch(e){
  const msg=e instanceof Error?e.message:String(e);
  Object.assign(status,{phase:'error',error:msg,message:status.sevenPublished?'Seven-report dashboard published; additional step failed: '+msg:msg,updatedAt:new Date().toISOString()});
  console.error('[OTS Bridge] '+status.message);
 }finally{
  if(job.credentials){job.credentials.portalPassword='';job.credentials.dashboardPassword='';}
  try{await job.browser?.close()}catch{}
  if(dir)try{await fs.rm(dir,{recursive:true,force:true})}catch{}
  active=null;
 }
}
function json(res,obj,statusCode=200){
 res.writeHead(statusCode,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
 res.end(JSON.stringify(obj));
}
async function body(req){
 const parts=[];let length=0;
 for await(const part of req){length+=part.length;if(length>LIMIT)throw Error('Request too large');parts.push(part)}
 return JSON.parse(Buffer.concat(parts).toString('utf8'));
}
function validCredentials(x){
 return x&&typeof x==='object'&&['portalUsername','portalPassword','dashboardUsername','dashboardPassword'].every(k=>
  typeof x[k]==='string'&&x[k].trim()&&x[k].length<=512)&&
 (!x.rankingDate||(/^\d{4}-\d{2}-\d{2}$/.test(x.rankingDate)&&!Number.isNaN(Date.parse(x.rankingDate))));
}
const server=http.createServer(async(req,res)=>{
 const pathname=new URL(req.url||'/',LOCAL).pathname;
 if(req.method==='GET'&&pathname==='/control'){
  try{
   const html=await fs.readFile(path.join(HERE,'control.html'),'utf8');
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
    'Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors https://xuvish.github.io http://127.0.0.1:8765"});
   res.end(html);
  }catch{json(res,{ok:false,error:'Local control page not found'},500)}
  return;
 }
 if(req.method==='GET'&&pathname==='/health'){json(res,{ok:true,service:'local-ots-helper'});return}
 if(req.method==='GET'&&pathname==='/status'){json(res,{ok:true,...status});return}
 if(req.method!=='POST'||!['/start','/continue'].includes(pathname)){json(res,{ok:false,error:'Unknown route'},404);return}
 // The control iframe sends same-origin JSON POSTs. Other sites cannot trigger actions.
 if(req.headers.origin!==LOCAL||!String(req.headers['content-type']||'').startsWith('application/json')){
  json(res,{ok:false,error:'Local control-page request required'},403);return;
 }
 try{
  const input=await body(req);
  if(pathname==='/start'){
   if(active){json(res,{ok:false,error:'An update is already in progress'},409);return}
   if(!validCredentials(input)){json(res,{ok:false,error:'Enter both OTS and dashboard administrator credentials'},400);return}
   try{await getPlan()}catch(e){json(res,{ok:false,error:e.message},400);return}
   const credentials={
    portalUsername:input.portalUsername.trim(),portalPassword:input.portalPassword,
    dashboardUsername:input.dashboardUsername.trim(),dashboardPassword:input.dashboardPassword,
    rankingDate:input.rankingDate||''
   };
   Object.assign(status,{phase:'starting',progress:1,message:'Preparing local browser and recorded reports…',report:null,error:null,sevenPublished:false,rankingPublished:false,updatedAt:new Date().toISOString()});
   active={credentials,browser:null,continue:null,reject:null};
   void run(active);
   json(res,{ok:true,message:'Update started'});
  }else{
   if(!active||status.phase!=='awaiting_login'||typeof active.continue!=='function'){
    json(res,{ok:false,error:'No portal login confirmation is currently pending'},409);return;
   }
   const next=active.continue;active.continue=null;
   stage('authenticating',10,'Verifying official portal session before report downloads…');
   next();
   json(res,{ok:true});
  }
 }catch(e){json(res,{ok:false,error:e.message||String(e)},400)}
});
server.listen(PORT,'127.0.0.1',()=>console.log('Local OTS helper ready: '+LOCAL+'/control\nOpen the live dashboard → Update Dashboard. Login and OTP are handled on your computer only.'));
