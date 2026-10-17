import crypto from 'node:crypto';
import {QUESTIONS} from './questions.js';
const BAD=(message,status=401)=>Object.assign(new Error(message),{status});
const secret=()=>{const t=process.env.TELEGRAM_BOT_TOKEN;if(!t)throw BAD('Botning yangi tokeni hali sozlanmagan.',503);return t;};
export function response(res,code,obj){res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');return res.status(code).json(obj);}
export function errorResponse(res,e){console.error('[quiz]',e.message);return response(res,e.status||500,{error:e.status?e.message:'Server sozlamalarida xatolik. Tashkilotchiga murojaat qiling.'});}
export function requirePost(req){if(req.method!=='POST')throw BAD('Faqat POST ruxsat etiladi.',405);}
function equalHex(expected,sent){
 if(!/^[a-f0-9]{64}$/i.test(String(sent||'')))return false;
 const b=Buffer.from(sent,'hex');return b.length===expected.length&&crypto.timingSafeEqual(expected,b);
}
export function verifyMiniApp(raw){
 if(!raw||typeof raw!=='string'||raw.length>8192)throw BAD('Telegram Mini App tasdig‘i yo‘q.');
 const p=new URLSearchParams(raw),hash=p.get('hash'),t=Number(p.get('auth_date')),now=Math.floor(Date.now()/1000);
 if(!Number.isInteger(t)||t>now+60||now-t>86400)throw BAD('Telegram sessiya muddati tugagan. Sahifani qayta oching.');
 p.delete('hash');p.delete('signature');
 const check=[...p.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+'='+v).join('\n');
 const key=crypto.createHmac('sha256','WebAppData').update(secret()).digest();
 if(!equalHex(crypto.createHmac('sha256',key).update(check).digest(),hash))throw BAD('Telegram imzosi yaroqsiz.');
 let u;try{u=JSON.parse(p.get('user')||'null')}catch{}
 if(!Number.isSafeInteger(u?.id)||u.id<=0)throw BAD('Telegram akkaunti aniqlanmadi.');
 return {id:u.id,username:String(u.username||''),first_name:String(u.first_name||'')};
}
export function verifyWidget(u){
 if(!u||typeof u!=='object')throw BAD('Telegram kirish ma’lumotlari yo‘q.');
 const now=Math.floor(Date.now()/1000),t=Number(u.auth_date);
 if(!Number.isInteger(t)||t>now+60||now-t>3600)throw BAD('Kirish muddati tugagan. Qayta tasdiqlang.');
 if(!Number.isSafeInteger(Number(u.id))||Number(u.id)<=0)throw BAD('Telegram ID xato.');
 const allowed=['id','first_name','last_name','username','photo_url','auth_date'];
 const check=allowed.filter(k=>u[k]!==undefined&&u[k]!==null).sort().map(k=>k+'='+String(u[k])).join('\n');
 const digest=crypto.createHash('sha256').update(secret()).digest();
 if(!equalHex(crypto.createHmac('sha256',digest).update(check).digest(),u.hash))throw BAD('Telegram login tasdig‘i yaroqsiz.');
 return {id:Number(u.id),username:String(u.username||''),first_name:String(u.first_name||'')};
}
const sessionKey=()=>crypto.createHmac('sha256',secret()).update('tafakkur:browser-session:v1').digest();
export function cookieFor(u){
 const payload=Buffer.from(JSON.stringify({id:u.id,username:u.username||'',first_name:u.first_name||'',exp:Math.floor(Date.now()/1000)+86400})).toString('base64url');
 const h=crypto.createHmac('sha256',sessionKey()).update(payload).digest('base64url');
 return 'tafakkur_session='+payload+'.'+h+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400';
}
export function authUser(req){
 const raw=req.headers['x-telegram-init-data'];
 if(raw)return verifyMiniApp(raw);
 const cookie=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('tafakkur_session='));
 if(!cookie)throw BAD('Avval Telegram orqali shaxsingizni tasdiqlang.');
 const value=cookie.slice('tafakkur_session='.length),parts=value.split('.');
 if(parts.length!==2)throw BAD('Sessiya noto‘g‘ri.');
 const h=crypto.createHmac('sha256',sessionKey()).update(parts[0]).digest();
 let got;try{got=Buffer.from(parts[1],'base64url')}catch{throw BAD('Sessiya noto‘g‘ri.');}
 if(h.length!==got.length||!crypto.timingSafeEqual(h,got))throw BAD('Sessiya noto‘g‘ri.');
 let user;try{user=JSON.parse(Buffer.from(parts[0],'base64url').toString())}catch{}
 if(!Number.isSafeInteger(user?.id)||user.id<=0||!Number.isFinite(user.exp)||user.exp<Math.floor(Date.now()/1000))throw BAD('Sessiya muddati tugagan.');
 return {id:user.id,username:String(user.username||''),first_name:String(user.first_name||'')};
}
async function rpc(fn,args){
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw BAD('Test bazasi hali sozlanmagan.',503);
 const r=await fetch(url.replace(/\/$/,'')+'/rest/v1/rpc/'+fn,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(12000)});
 const out=await r.json().catch(()=>null);
 if(!r.ok){console.error('DB',fn,out?.message||r.status); if(out?.message==='STALE_INDEX')throw BAD('STALE_INDEX',409);throw BAD('Bazaga ulanishda xatolik. Admin tekshirsin.',503);}
 return out;
}
export const begin=(u,name,age,entered)=>rpc('quiz_begin',{p_tg_id:u.id,p_name:name,p_age:age,p_entered_username:entered,p_verified_username:u.username});
export const state=u=>rpc('quiz_read',{p_tg_id:u.id});
export const submit=(u,i,choice)=>rpc('quiz_submit',{p_tg_id:u.id,p_index:i,p_choice:choice});
export function present(r){
 if(!r)return {status:'new',serverTime:new Date().toISOString()};
 if(r.status==='finished')return {status:'finished',notification:r.notification_sent_at?'sent':'pending',retake:false};
 const i=r.question_index;
 if(!Number.isInteger(i)||i<0||i>=QUESTIONS.length)throw BAD('Savollar holati xato.',503);
 return {status:'active',name:r.fullname,index:i,total:25,question:{text:QUESTIONS[i].q,options:QUESTIONS[i].a,world:!!QUESTIONS[i].world},questionStartedAt:r.question_started_at,expiresAt:r.expires_at,serverTime:new Date().toISOString()};
}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function maybeNotify(r){
 if(!r||r.status!=='finished'||r.notification_sent_at)return;
 const key=String(process.env.QUIZ_ANSWER_KEY||'');
 if(!/^[0-3]{25}$/.test(key)){console.error('QUIZ_ANSWER_KEY missing');return;}
 const choices=Array.isArray(r.answers)?r.answers:[];
 let correct=0,unanswered=0;
 const details=QUESTIONS.map((q,i)=>{
  const v=choices[i];if(v===Number(key[i]))correct++;if(v===-1||v==null)unanswered++;
  const mark=v===Number(key[i])?'✅':v===-1||v==null?'⏳':'❌';
  return String(i+1).padStart(2,'0')+'. '+mark+' '+(Number.isInteger(v)&&v>=0&&v<4?'ABCD'[v]:'—')+' / '+'ABCD'[Number(key[i])];
 });
 const msg=[
 '📚 <b>TAFAKKUR — YANGI NATIJA</b>','━━━━━━━━━━━━━━━━',
 '👤 Ism: <b>'+esc(r.fullname)+'</b>','🎂 Yosh: <b>'+r.age+'</b>',
 '🆔 Telegram ID: <code>'+esc(r.tg_id)+'</code>',
 '📱 Username: '+esc(r.verified_username?'@'+r.verified_username:'Mavjud emas'),
 '📝 Kiritilgan username: '+esc(r.entered_username||'—'),
 '🏆 Ball: <b>'+(correct*4)+'/100</b>',
 '✅ To‘g‘ri: '+correct+'/25','❌ Noto‘g‘ri: '+(25-correct-unanswered),'⏳ Javobsiz: '+unanswered,
 '','<b>25 ta savol bo‘yicha:</b>',...details,
 '🕘 Yakunlangan: '+esc(r.completed_at||new Date().toISOString())
 ].join('\n');
 const token=secret(),chat=process.env.RESULT_CHAT_ID||'7419543322';
 try{
  const resp=await fetch('https://api.telegram.org/bot'+token+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chat,text:msg,parse_mode:'HTML'}),signal:AbortSignal.timeout(8000)});
  const data=await resp.json().catch(()=>({}));
  if(!resp.ok||!data.ok)throw Error('Telegram delivery: '+(data.description||resp.status));
  await rpc('quiz_mark_notified',{p_tg_id:Number(r.tg_id)});
  r.notification_sent_at=new Date().toISOString();
 }catch(e){console.error('Result saved; message not delivered:',e.message);}
}