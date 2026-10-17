import crypto from 'node:crypto';
import {QUESTIONS} from './questions.js';
import {put, get, del} from '@vercel/blob';
const BAD=(message,status=401)=>Object.assign(new Error(message),{status});
const secret=()=>{const t=process.env.TELEGRAM_BOT_TOKEN;if(!t)throw BAD('Botning yangi tokeni hali sozlanmagan.',503);return t;};
export function response(res,code,obj){res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');return res.status(code).json(obj);}
export function errorResponse(res,e){console.error('[quiz]',e.message);return response(res,e.status||500,{error:e.status?e.message:'Server sozlamalarida xatolik. Tashkilotchiga murojaat qiling.'});}
export function requirePost(req){if(req.method!=='POST')throw BAD('Faqat POST ruxsat etiladi.',405);}

const codeSecret=()=>{
 const s=process.env.QUIZ_ADMIN_SECRET;
 if(!s||s.length<20)throw BAD('QUIZ_ADMIN_SECRET hali sozlanmagan.',503);
 return s;
};
const configuredCodes=()=>{
 const raw=String(process.env.QUIZ_ACCESS_CODES||'').trim();
 if(!raw)throw BAD('20 ta maxsus kod hali sozlanmagan (QUIZ_ACCESS_CODES).',503);
 const values=raw.split(/[\s,;]+/).filter(Boolean);
 if(values.length!==20||new Set(values).size!==20||values.some(code=>!/^\d{4}$/.test(code)))
  throw BAD('QUIZ_ACCESS_CODES da 20 ta noyob 4 xonali kod bo‘lishi shart.',503);
 return values;
};
export function registeredCodes(){return [...configuredCodes()];}
export function verifyCode(raw){
 const code=String(raw||'').trim();
 if(!/^\d{4}$/.test(code))throw BAD('Kod 4 ta raqamdan iborat bo‘lishi kerak.',400);
 // Compare against the private allowlist; never expose this list to the client.
 const a=Buffer.from(code);
 let accepted=false;
 for(const valid of configuredCodes()){const b=Buffer.from(valid);accepted=crypto.timingSafeEqual(a,b)||accepted;}
 if(!accepted)throw BAD('Kod noto‘g‘ri yoki ro‘yxatda yo‘q.',403);
 const codeId=crypto.createHmac('sha256',codeSecret()).update('otp4:'+code).digest('hex').slice(0,40);
 return {codeId};
}
export function requireAdmin(req){
 const provided=Buffer.from(String(req.headers?.['x-quiz-admin-key']||'')),expected=Buffer.from(codeSecret());
 if(provided.length!==expected.length||!crypto.timingSafeEqual(provided,expected))throw BAD('Administrator kaliti noto‘g‘ri.',403);
}
const sessionKey=()=>crypto.createHmac('sha256',codeSecret()).update('tafakkur:code-session:v2').digest();
export function cookieFor(u){
 const payload=Buffer.from(JSON.stringify({codeId:u.codeId,exp:Math.floor(Date.now()/1000)+2592000})).toString('base64url');
 const h=crypto.createHmac('sha256',sessionKey()).update(payload).digest('base64url');
 return 'tafakkur_session='+payload+'.'+h+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000';
}
export function authUser(req){
 const raw=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('tafakkur_session='));
 if(!raw)throw BAD('Bu brauzerda faol test sessiyasi topilmadi.',401);
 const parts=raw.slice('tafakkur_session='.length).split('.');
 if(parts.length!==2)throw BAD('Sessiya noto‘g‘ri.',401);
 const exp=crypto.createHmac('sha256',sessionKey()).update(parts[0]).digest();
 let provided;try{provided=Buffer.from(parts[1],'base64url')}catch{throw BAD('Sessiya noto‘g‘ri.',401)}
 if(provided.length!==exp.length||!crypto.timingSafeEqual(exp,provided))throw BAD('Sessiya noto‘g‘ri.',401);
 let v;try{v=JSON.parse(Buffer.from(parts[0],'base64url').toString())}catch{}
 if(!v||!Number.isFinite(v.exp)||v.exp<Math.floor(Date.now()/1000)||!/^[a-f0-9]{40}$/.test(v.codeId||''))throw BAD('Sessiya muddati tugagan.',401);
 return {codeId:v.codeId};
}

/**
 * No Supabase. One immutable private Blob per event. Only the earliest
 * successful write to an exact pathname counts. No client can erase a try.
 */
const PREFIX='tafakkur-four-digit-v1';
const keyFor=(id,part)=>PREFIX+'/codes/'+String(id)+'/'+part+'.json';
const blobConfig=()=>{if(!process.env.BLOB_READ_WRITE_TOKEN)throw BAD('Vercel Blob hali ulanmagan. Tashkilotchiga xabar bering.',503)};
const toJSON=async(path)=>{
 blobConfig();
 try{
   const r=await get(path,{access:'private',useCache:false});
   if(!r||r.statusCode===404)return null;
   if(r.statusCode!==200)throw new Error('Blob read '+r.statusCode);
   return JSON.parse(await new Response(r.stream).text());
 }catch(e){if(e?.name==='BlobNotFoundError'||e?.status===404)return null;throw e;}
};
const isConflict=e=>/already.?exists|conflict|duplicate|blobalreadyexists/i.test(String(e?.name||'')+' '+String(e?.message||''));
const putOnce=async(path,data)=>{
 blobConfig();
 try{await put(path,JSON.stringify(data),{access:'private',addRandomSuffix:false,allowOverwrite:false,contentType:'application/json'});return true;}
 catch(e){if(isConflict(e))return false;throw e;}
};
async function loadAttempt(u){
 const start=await toJSON(keyFor(u.codeId,'start'));
 if(!start)return null;
 if(!Number.isFinite(start.startedAt))throw BAD('Urinish vaqti xato.',503);
 const entries=[];
 let started=start.startedAt;
 const NOW=Date.now();
 for(let i=0;i<25;i++){
   const answerPath=keyFor(u.codeId,'answer-'+String(i).padStart(2,'0'));
   let entry=await toJSON(answerPath);
   if(!entry){
     if(NOW<started+20000)break;
     const miss={choice:-1,at:started+20000};
     await putOnce(answerPath,miss);
     entry=await toJSON(answerPath) || miss;
   }
   entries.push(Number.isInteger(entry.choice)&&entry.choice>=-1&&entry.choice<4?entry.choice:-1);
   started=Math.min(Number(entry.at)||started+20000,started+20000);
 }
 const status=entries.length===25?'finished':'active';
 const delivery=status==='finished'?await toJSON(keyFor(u.codeId,'notification-sent')):null;
 return {
  status,code_id:u.codeId,fullname:start.fullname,age:start.age,
  entered_username:start.entered_username||null,
  answers:entries,question_index:entries.length,
  question_started_at:new Date(started).toISOString(),
  expires_at:new Date(started+20000).toISOString(),
  completed_at:status==='finished'?new Date(started).toISOString():null,
  notification_sent_at:delivery?.at||null
 };
}
export async function state(u){return await loadAttempt(u);}
export async function begin(u,name,age,entered){
 const start={
  code_id:u.codeId,fullname:name,age,
  entered_username:entered||'',
  startedAt:Date.now()
 };
 const first=await putOnce(keyFor(u.codeId,'start'),start);
 if(!first)throw BAD('Ushbu kod ishlatilgan. Yangi kod oling.',409);
 const r=await loadAttempt(u);
 if(!r)throw BAD('Urinish yozilmadi. Qayta urinib ko‘ring.',503);
 return r;
}
export async function submit(u,i,choice){
 let row=await loadAttempt(u);
 if(!row)throw BAD('NOT_STARTED',409);
 if(row.status==='finished')return row;
 if(row.question_index!==i)throw BAD('STALE_INDEX',409);
 const expiry=Date.parse(row.expires_at);
 const now=Date.now();
 const valid=now<expiry?choice:-1;
 const answerPath=keyFor(u.codeId,'answer-'+String(i).padStart(2,'0'));
 await putOnce(answerPath,{choice:valid,at:valid===-1?expiry:now});
 row=await loadAttempt(u);
 if(!row)throw BAD('Savollar yuklanmadi.',503);
 return row;
}
export function present(r){
 if(!r)return {status:'new',serverTime:new Date().toISOString()};
 if(r.status==='finished')return {status:'finished',retake:false,notification:r.notification_sent_at?'sent':'pending'};
 const i=r.question_index;
 if(!Number.isInteger(i)||i<0||i>=25)throw BAD('Savollar holati xato.',503);
 return {status:'active',name:r.fullname,index:i,total:25,
   question:{text:QUESTIONS[i].q,options:QUESTIONS[i].a,world:!!QUESTIONS[i].world},
   questionStartedAt:r.question_started_at,expiresAt:r.expires_at,serverTime:new Date().toISOString()};
}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\u0027':'&#39;'}[c]));
// The key is server-only at runtime (not included in browser HTML).
// Can be overridden using QUIZ_ANSWER_KEY in Vercel.

export async function maybeNotify(r){
 if(!r||r.status!=='finished')return;
 const key=String(process.env.QUIZ_ANSWER_KEY||'');
 if(!/^[0-3]{25}$/.test(key)){console.error('Answer key format invalid');return;}
 const statusPath=keyFor(r.code_id,'notification-sent');
 if(await toJSON(statusPath))return;
 const claimPath=keyFor(r.code_id,'notification-lock');
 if(!await putOnce(claimPath,{at:Date.now()}))return;
 try{
   const choices=Array.isArray(r.answers)?r.answers:[];
   let correct=0,missed=0;
   const details=QUESTIONS.map((q,i)=>{
     const v=choices[i];
     if(v===Number(key[i]))correct++;
     if(v===-1||v==null)missed++;
     const symbol=v===Number(key[i])?'✅':v===-1||v==null?'⏳':'❌';
     return String(i+1).padStart(2,'0')+'. '+symbol+' '+(Number.isInteger(v)&&v>=0&&v<4?'ABCD'[v]:'—')+' / '+'ABCD'[Number(key[i])];
   });
   const msg=[
    '📚 <b>TAFAKKUR — YANGI NATIJA</b>',
    '👤 Ism: <b>'+esc(r.fullname)+'</b>',
    '🎂 Yosh: <b>'+r.age+'</b>',
    '🎟 Kod ID: <code>'+esc(r.code_id.slice(0,12))+'</code>',
    '📱 Telegram username: '+esc(r.entered_username?'@'+r.entered_username:'—'),
    '🏆 Natija: <b>'+correct*4+'/100</b>',
    '✅ To‘g‘ri: '+correct+'/25',
    '❌ Noto‘g‘ri: '+(25-correct-missed),
    '⏳ Javobsiz: '+missed,
    '','<b>Tanlangan / to‘g‘ri variant:</b>',
    ...details,
    '🕘 Yakunlangan: '+esc(r.completed_at)
   ].join('\n');
   const token=secret(),chat=process.env.RESULT_CHAT_ID||'7419543322';
   const rr=await fetch('https://api.telegram.org/bot'+token+'/sendMessage',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({chat_id:chat,text:msg,parse_mode:'HTML'}),
    signal:AbortSignal.timeout(8000)
   });
   const result=await rr.json().catch(()=>({}));
   if(!rr.ok||!result.ok)throw Error('Telegram delivery failed: '+(result.description||rr.status));
   await putOnce(statusPath,{at:Date.now(),messageId:result.result?.message_id});
   r.notification_sent_at=Date.now();
 }catch(e){
   console.error('Saved result but Telegram send failed:',e.message);
   try{await del(claimPath)}catch(ex){console.error('Failed to unlock notification',ex.message)}
 }
}
