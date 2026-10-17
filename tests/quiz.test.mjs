import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {QUESTIONS} from '../api/_lib/questions.js';
import {verifyCode,registeredCodes,requireAdmin,cookieFor,authUser,present} from '../api/_lib/server.js';
process.env.QUIZ_ADMIN_SECRET='local_tests_use_long_very_secure_admin_secret_123!';
process.env.QUIZ_ID_SECRET=process.env.QUIZ_ADMIN_SECRET;
test('25 questions and 5 world literature',()=>{
 assert.equal(QUESTIONS.length,25);
 assert.equal(QUESTIONS.filter(q=>q.world).length,5);
 for(const q of QUESTIONS){assert.equal(q.a.length,4);assert.equal(Object.hasOwn(q,'c'),false)}
});
process.env.QUIZ_ACCESS_CODES='1001,1002,1003,1004,1005,1006,1007,1008,1009,1010,1011,1012,1013,1014,1015,1016,1017,1018,1019,1020';
test('Exactly 20 configured codes are four-digit and unique',()=>{
 const codes=registeredCodes();
 assert.equal(codes.length,20);
 assert.equal(new Set(codes).size,20);
 assert.ok(codes.every(c=>/^\d{4}$/.test(c)));
 assert.match(verifyCode(codes[0]).codeId,/^[a-f0-9]{40}$/);
 assert.throws(()=>verifyCode('12345'),/4 ta raqam/);
 assert.throws(()=>verifyCode('0000'),/Kod noto‘g‘ri/);
});
test('Administrator password protects code generation',()=>{
 assert.doesNotThrow(()=>requireAdmin({headers:{'x-quiz-admin-key':process.env.QUIZ_ADMIN_SECRET}}));
 assert.throws(()=>requireAdmin({headers:{'x-quiz-admin-key':'wrong'}}),/noto‘g‘ri/);
});
test('Admin password rotation preserves old completed test identities',()=>{
 const code=registeredCodes()[0];
 const old=verifyCode(code).codeId;
 const beforeCookie=cookieFor({codeId:old}).split(';')[0];
 process.env.QUIZ_ADMIN_SECRET='rotated_long_organizer_password_secret_987654321';
 assert.equal(verifyCode(code).codeId,old);
 assert.equal(authUser({headers:{cookie:beforeCookie}}).codeId,old);
 assert.doesNotThrow(()=>requireAdmin({headers:{'x-quiz-admin-key':process.env.QUIZ_ADMIN_SECRET}}));
});
test('HTTP-only cookie is bound to one code ID',()=>{
 const u=verifyCode(registeredCodes()[0]);
 const cookie=cookieFor(u);
 assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);
 assert.equal(authUser({headers:{cookie:cookie.split(';')[0]}}).codeId,u.codeId);
 assert.throws(()=>authUser({headers:{cookie:cookie.split(';')[0]+'bad'}}),/Sessiya/);
});
test('Public quiz never reveals score or answer key',()=>{
 const p=present({status:'finished',notification_sent_at:null});
 assert.equal(p.status,'finished');assert.equal(p.notification,'pending');
 assert.equal(Object.hasOwn(p,'answers'),false);
 assert.equal(Object.hasOwn(p,'score'),false);
});
test('Participant HTML requires code and Telegram username without Telegram login popup',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/id="oneTimeCode"/);
 assert.match(html,/name="oneTimeCode"[^>]*maxlength="32"/);
 assert.match(html,/id="codeProgress"/);
 assert.ok(html.includes("oneTimeInput.addEventListener('input'"));
 assert.ok(html.includes("replace(/\\D/g,'').slice(0,4)"));
 assert.match(html,/id="username"[^>]*required/);
 assert.ok(!html.includes('telegram-widget.js'));
 assert.ok(!html.includes('Telegram Authorization'));
});
