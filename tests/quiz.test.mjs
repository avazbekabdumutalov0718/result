import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {QUESTIONS} from '../api/_lib/questions.js';
import {verifyWidget,verifyMiniApp,authUser,cookieFor,present} from '../api/_lib/server.js';
process.env.TELEGRAM_BOT_TOKEN='123456789:FAKE_TEST_TOKEN';
test('Exactly 25 questions and five world-literature questions',()=>{
 assert.equal(QUESTIONS.length,25);
 assert.equal(QUESTIONS.filter(q=>q.world).length,5);
 for(const q of QUESTIONS){assert.equal(q.a.length,4);assert.ok(q.q.length>10);assert.equal(Object.hasOwn(q,'c'),false);}
});
test('Browser Telegram widget signature cannot be forged',()=>{
 const u={id:7419543322,first_name:'Tester',username:'testuser',auth_date:Math.floor(Date.now()/1000)};
 const check=Object.keys(u).sort().map(k=>k+'='+u[k]).join('\n');
 const hash=crypto.createHmac('sha256',crypto.createHash('sha256').update(process.env.TELEGRAM_BOT_TOKEN).digest()).update(check).digest('hex');
 const signed={...u,hash};
 assert.equal(verifyWidget(signed).id,7419543322);
 assert.throws(()=>verifyWidget({...signed,id:7419543323}),/imzosi/i);
});
test('HTTP only signed cookie permits the same verified account',()=>{
 const u={id:999001,username:'tester'};
 const cookie=cookieFor(u);
 assert.match(cookie,/HttpOnly/);
 assert.match(cookie,/Secure/);
 assert.match(cookie,/SameSite=Lax/);
 const req={headers:{cookie:cookie.split(';')[0]}};
 assert.equal(authUser(req).id,999001);
 assert.throws(()=>authUser({headers:{cookie:cookie.split(';')[0]+'BAD'}}),/Sessiya/i);
});
test('MiniApp initData is authenticated, never trusted from client only',()=>{
 const user=JSON.stringify({id:1234567,username:'tester'});
 const p=new URLSearchParams({auth_date:String(Math.floor(Date.now()/1000)),user});
 const check=[...p.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+'='+v).join('\n');
 const key=crypto.createHmac('sha256','WebAppData').update(process.env.TELEGRAM_BOT_TOKEN).digest();
 p.set('hash',crypto.createHmac('sha256',key).update(check).digest('hex'));
 assert.equal(verifyMiniApp(p.toString()).id,1234567);
 p.set('user',JSON.stringify({id:42}));
 assert.throws(()=>verifyMiniApp(p.toString()),/imzosi/i);
});
test('Public state never reveals score, answer or key',()=>{
 assert.deepEqual(present(null).status,'new');
 const a=present({status:'finished',notification_sent_at:null,answers:[0],tg_id:5});
 assert.equal(a.status,'finished');
 assert.equal(a.notification,'pending');
 assert.equal(Object.hasOwn(a,'score'),false);
 assert.equal(Object.hasOwn(a,'answers'),false);
 assert.equal(Object.hasOwn(a,'key'),false);
});
