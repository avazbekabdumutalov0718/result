import crypto from 'node:crypto';
import {put,get,del} from '@vercel/blob';
import {QUESTIONS} from './questions.js';

const BAD=(message,status=400)=>Object.assign(new Error(message),{status});
const ROUND='2026-2';
const PREFIX='tafakkur-round-2-30q-v1';
const QCOUNT=QUESTIONS.length;
const DURATION=20000;
const keyFor=(id,part)=>PREFIX+'/codes/'+id+'/'+part+'.json';
const keySecret=()=>{const s=process.env.QUIZ_ID_SECRET||process.env.QUIZ_ADMIN_SECRET;if(!s||s.length<20)throw BAD('Test kaliti sozlanmagan.',503);return s};
const adminSecret=()=>{const s=process.env.QUIZ_ADMIN_SECRET;if(!s||s.length<20)throw BAD('Admin kaliti sozlanmagan.',503);return s};
export function response(res,status,value){res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');return res.status(status).json(value)}
export function errorResponse(res,e){console.error('[quiz round 2]',e.message);return response(res,e.status||500,{error:e.status?e.message:'Server bilan bog‘liq xatolik. Tashkilotchiga murojaat qiling.'})}
export function requirePost(req){if(req.method!=='POST')throw BAD('Faqat POST mumkin.',405)}
export function requireAdmin(req){
 const actual=Buffer.from(String(req.headers?.['x-quiz-admin-key']||'')),expected=Buffer.from(adminSecret());
 if(actual.length!==expected.length||!crypto.timingSafeEqual(actual,expected))throw BAD('Administrator kaliti noto‘g‘ri.',403)
}
export function registeredCodes(){
 const input=String(process.env.QUIZ_ACCESS_CODES||'').trim();
 const codes=input.split(/[\s,;]+/).filter(Boolean);
 if(codes.length!==15||new Set(codes).size!==15||codes.some(v=>!/^\d{4}$/.test(v)))throw BAD('15 ta yangi 4 xonali kod hali sozlanmagan.',503);
 return codes;
}
export function verifyCode(input){
 const code=String(input||'').trim();
 if(!/^\d{4}$/.test(code))throw BAD('Kod 4 ta raqamdan iborat bo‘lishi kerak.');
 const actual=Buffer.from(code);
 let found=false;
 for(const allowed of registeredCodes())found=crypto.timingSafeEqual(actual,Buffer.from(allowed))||found;
 if(!found)throw BAD('Kod noto‘g‘ri yoki yangi test ro‘yxatida yo‘q.',403);
 const codeId=crypto.createHmac('sha256',keySecret()).update('r2:otp4:'+code).digest('hex').slice(0,40);
 return {codeId,round:ROUND};
}
const sessionSecret=()=>crypto.createHmac('sha256',keySecret()).update('tafakkur:round2:session:v1').digest();
export function cookieFor(u){
 const payload=Buffer.from(JSON.stringify({codeId:u.codeId,round:ROUND,exp:Math.floor(Date.now()/1000)+2592000})).toString('base64url');
 const signature=crypto.createHmac('sha256',sessionSecret()).update(payload).digest('base64url');
 return 'tafakkur_round2_session='+payload+'.'+signature+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000';
}
export function authUser(req){
 const cookie=String(req.headers?.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('tafakkur_round2_session='));
 if(!cookie)throw BAD('Yangi test sessiyasi topilmadi.',401);
 const value=cookie.slice('tafakkur_round2_session='.length).split('.');
 if(value.length!==2)throw BAD('Sessiya noto‘g‘ri.',401);
 const expected=crypto.createHmac('sha256',sessionSecret()).update(value[0]).digest();
 const actual=Buffer.from(value[1],'base64url');
 if(actual.length!==expected.length||!crypto.timingSafeEqual(actual,expected))throw BAD('Sessiya noto‘g‘ri.',401);
 let data;try{data=JSON.parse(Buffer.from(value[0],'base64url').toString())}catch{}
 if(!data||data.round!==ROUND||!/^[a-f0-9]{40}$/.test(data.codeId||'')||!Number.isFinite(data.exp)||data.exp<Math.floor(Date.now()/1000))throw BAD('Sessiya muddati tugagan.',401);
 return {codeId:data.codeId,round:ROUND};
}
const blobConfig=()=>{if(!process.env.BLOB_READ_WRITE_TOKEN)throw BAD('Private Blob ulanmagan.',503)};
async function read(path){
 blobConfig();
 try{
  const r=await get(path,{access:'private',useCache:false});
  if(!r||r.statusCode===404)return null;
  if(r.statusCode!==200)throw new Error('Private Blob read status '+r.statusCode);
  return JSON.parse(await new Response(r.stream).text());
 }catch(e){if(e?.name==='BlobNotFoundError'||e?.status===404)return null;throw e}
}
const conflict=e=>/already.?exists|conflict|duplicate|blobalreadyexists/i.test(String(e?.name||'')+' '+String(e?.message||''));
async function saveOnce(path,data){
 blobConfig();
 try{await put(path,JSON.stringify(data),{access:'private',addRandomSuffix:false,allowOverwrite:false,contentType:'application/json'});return true}
 catch(e){if(conflict(e))return false;throw e}
}
const answerKey=()=>{
 const key=String(process.env.QUIZ_ANSWER_KEY||'');
 if(!/^[0-3]{30}$/.test(key))throw BAD('30 ta to‘g‘ri javoblar kaliti sozlanmagan.',503);
 return key;
};
export function summaryForAdmin(row){
 if(!row||row.status!=='finished')return null;
 const key=answerKey();
 const choices=row.answers||[];
 const correct=choices.filter((v,i)=>v===Number(key[i])).length;
 const missed=choices.filter(v=>v==null||v===-1).length;
 return {
  points:Math.round(correct/QCOUNT*100),totalPoints:100,
  correct,incorrect:QCOUNT-correct-missed,missed,total:QCOUNT,
  selected:choices.map((v,i)=>({number:i+1,selected:Number.isInteger(v)&&v>=0&&v<4?'ABCD'[v]:'—',correct:'ABCD'[Number(key[i])]}))
 };
}
async function loadAttempt(u){
 const start=await read(keyFor(u.codeId,'start'));
 if(!start)return null;
 if(!Number.isFinite(start.startedAt))throw BAD('Test boshlanish vaqti xato.',503);
 let timestamp=start.startedAt;
 const now=Date.now();
 const entries=[];
 for(let i=0;i<QCOUNT;i++){
  const path=keyFor(u.codeId,'answer-'+String(i).padStart(2,'0'));
  let entry=await read(path);
  if(!entry){
   if(now<timestamp+DURATION)break;
   const skipped={choice:-1,at:timestamp+DURATION};
   await saveOnce(path,skipped);
   entry=await read(path)||skipped;
  }
  entries.push(Number.isInteger(entry.choice)&&entry.choice>=-1&&entry.choice<=3?entry.choice:-1);
  timestamp=Math.min(Number(entry.at)||timestamp+DURATION,timestamp+DURATION);
 }
 const status=entries.length===QCOUNT?'finished':'active';
 const [delivered,feedback]=status==='finished'?await Promise.all([read(keyFor(u.codeId,'notification-sent')),read(keyFor(u.codeId,'feedback'))]):[null,null];
 const result={
  status,round:ROUND,code_id:u.codeId,fullname:start.fullname,age:start.age,entered_username:start.entered_username||'',
  answers:entries,question_index:entries.length,
  question_started_at:new Date(timestamp).toISOString(),
  expires_at:new Date(timestamp+DURATION).toISOString(),question_duration_ms:DURATION,
  completed_at:status==='finished'?new Date(timestamp).toISOString():null,
  notification_sent_at:delivered?.at||null,feedback:feedback||null
 };
 if(status==='finished'){
  const snapshotPath=keyFor(u.codeId,'admin-summary');
  // Safe immutable aggregate: only written once after the entire round is complete.
  await saveOnce(snapshotPath,{
   status:'finished',progress:QCOUNT,completedAt:result.completed_at,report:summaryForAdmin(result)
  });
 }
 return result;
}
export async function state(u){return loadAttempt(u)}
export async function begin(u,name,age,username){
 const success=await saveOnce(keyFor(u.codeId,'start'),{
  startedAt:Date.now(),code_id:u.codeId,fullname:name,age,entered_username:username||'',round:ROUND
 });
 if(!success)throw BAD('Bu kod bilan test avval boshlangan.',409);
 return loadAttempt(u);
}
export async function submit(u,index,choice){
 let row=await loadAttempt(u);
 if(!row)throw BAD('NOT_STARTED',409);
 if(row.status==='finished')return row;
 if(row.question_index!==index)throw BAD('STALE_INDEX',409);
 const expires=Date.parse(row.expires_at);
 const now=Date.now();
 const answer=now<expires?choice:-1;
 await saveOnce(keyFor(u.codeId,'answer-'+String(index).padStart(2,'0')),{choice:answer,at:answer===-1?expires:now});
 return loadAttempt(u);
}
export function present(row){
 if(!row)return {status:'new',serverTime:new Date().toISOString()};
 if(row.status==='finished')return {
  status:'finished',total:QCOUNT,retake:false,
  notification:row.notification_sent_at?'sent':'pending',
  feedbackSubmitted:!!row.feedback
 };
 const i=row.question_index;
 if(!Number.isInteger(i)||i<0||i>=QCOUNT)throw BAD('Savollar holati xato.',503);
 return {
  status:'active',round:ROUND,name:row.fullname,index:i,total:QCOUNT,
  question:{text:QUESTIONS[i].q,options:QUESTIONS[i].a,world:!!QUESTIONS[i].world,fun:!!QUESTIONS[i].fun},
  questionStartedAt:row.question_started_at,expiresAt:row.expires_at,questionDurationMs:DURATION,
  serverTime:new Date().toISOString()
 };
}
export async function saveFeedback(u,rating,comment){
 const row=await loadAttempt(u);
 if(!row||row.status!=='finished')throw BAD('Fikrni faqat test tugagach yuborish mumkin.',403);
 const stars=Number(rating);
 const message=String(comment||'').trim();
 if(!Number.isInteger(stars)||stars<1||stars>5)throw BAD('1 dan 5 gacha baho tanlang.');
 if(message.length>600)throw BAD('Fikr 600 belgidan oshmasin.');
 const record={rating:stars,comment:message,createdAt:new Date().toISOString()};
 const created=await saveOnce(keyFor(u.codeId,'feedback'),record);
 if(!created)throw BAD('Bu test uchun fikr oldin yuborilgan.',409);
 return {saved:true};
}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\u0027':'&#39;'}[c]));
export async function maybeNotify(row){
 if(!row||row.status!=='finished'||!process.env.TELEGRAM_BOT_TOKEN)return;
 const sent=keyFor(row.code_id,'notification-sent');
 if(await read(sent))return;
 const lock=keyFor(row.code_id,'notification-lock');
 if(!await saveOnce(lock,{at:Date.now()}))return;
 try{
  const score=summaryForAdmin(row);
  const message=[
   '📚 <b>TAFAKKUR — 30 TA SAVOL NATIJASI</b>',
   '👤 Ism: <b>'+esc(row.fullname)+'</b>',
   '🎂 Yosh: '+esc(row.age),
   '📱 Telegram: '+esc(row.entered_username?'@'+row.entered_username:'—'),
   '🏆 Ball: <b>'+score.points+'/100</b>',
   '✅ To‘g‘ri: '+score.correct+'/'+QCOUNT,
   '❌ Noto‘g‘ri: '+score.incorrect,
   '⏳ Javobsiz: '+score.missed,
   '','<b>Tanlangan / to‘g‘ri javoblar:</b>',
   ...score.selected.map(d=>String(d.number).padStart(2,'0')+'. '+d.selected+' / '+d.correct),
   '🕒 '+esc(row.completed_at)
  ].join('\n');
  const res=await fetch('https://api.telegram.org/bot'+process.env.TELEGRAM_BOT_TOKEN+'/sendMessage',{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({chat_id:process.env.RESULT_CHAT_ID||'7419543322',text:message,parse_mode:'HTML'}),
   signal:AbortSignal.timeout(8000)
  });
  const result=await res.json().catch(()=>({}));
  if(!res.ok||!result.ok)throw Error('Telegram: '+(result.description||res.status));
  await saveOnce(sent,{at:Date.now(),messageId:result.result?.message_id});
  row.notification_sent_at=Date.now();
 }catch(e){
  console.error('Could not send round 2 result:',e.message);
  try{await del(lock)}catch(ex){console.error('Could not release Telegram lock:',ex.message)}
 }
}
export async function allAdminResults(){
 const rows=await Promise.all(registeredCodes().map(async code=>{
  const u=verifyCode(code);
  const base=PREFIX+'/codes/'+u.codeId+'/';
  const start=await read(base+'start.json');
  if(!start)return {code,round:ROUND,status:'unused',progress:0,participant:null,report:null,feedback:null,telegram:'not_applicable'};
  let snapshot=await read(base+'admin-summary.json');
  if(!snapshot||snapshot.status!=='finished'){
   const row=await loadAttempt(u);
   snapshot={
    status:row.status,progress:row.question_index,completedAt:row.completed_at,
    report:row.status==='finished'?summaryForAdmin(row):null
   };
  }
  const [delivery,feedback]=await Promise.all([read(base+'notification-sent.json'),read(base+'feedback.json')]);
  return {
   code,round:ROUND,status:snapshot.status,progress:snapshot.progress,
   participant:{fullname:start.fullname,age:start.age,username:start.entered_username||''},
   completedAt:snapshot.completedAt,report:snapshot.report,feedback,
   telegram:snapshot.status!=='finished'?'not_applicable':delivery?'sent':process.env.TELEGRAM_BOT_TOKEN?'pending':'missing_token'
  };
 }));
 return {
  total:rows.length,started:rows.filter(r=>r.status!=='unused').length,
  finished:rows.filter(r=>r.status==='finished').length,
  active:rows.filter(r=>r.status==='active').length,
  unused:rows.filter(r=>r.status==='unused').length,rows
 };
}
