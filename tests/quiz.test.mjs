import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {QUESTIONS} from '../api/_lib/questions.js';
import {makeCodes,verifyCode,requireAdmin,cookieFor,authUser,present} from '../api/_lib/server.js';
process.env.QUIZ_ADMIN_SECRET='local_tests_use_long_very_secure_admin_secret_123!';
test('25 questions and 5 world literature',()=>{
 assert.equal(QUESTIONS.length,25);
 assert.equal(QUESTIONS.filter(q=>q.world).length,5);
 for(const q of QUESTIONS){assert.equal(q.a.length,4);assert.equal(Object.hasOwn(q,'c'),false)}
});
test('One-time access codes cannot be forged',()=>{
 const codes=makeCodes(100);
 assert.equal(codes.length,100);
 assert.equal(new Set(codes).size,100);
 const u=verifyCode(codes[0]);assert.match(u.codeId,/^[a-f0-9]{40}$/);
 assert.throws(()=>verifyCode('TK-AAAAABBBBB-01234567'),/noto‘g‘ri/);
 assert.throws(()=>verifyCode('bad'),/formati/);
});
test('Administrator password protects code generation',()=>{
 assert.doesNotThrow(()=>requireAdmin({headers:{'x-quiz-admin-key':process.env.QUIZ_ADMIN_SECRET}}));
 assert.throws(()=>requireAdmin({headers:{'x-quiz-admin-key':'wrong'}}),/noto‘g‘ri/);
});
test('HTTP-only cookie is bound to one code ID',()=>{
 const u=verifyCode(makeCodes(1)[0]);
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
 assert.match(html,/id="username"[^>]*required/);
 assert.ok(!html.includes('telegram-widget.js'));
 assert.ok(!html.includes('Telegram Authorization'));
});
