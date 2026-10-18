import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {QUESTIONS} from '../api/_lib/questions.js';
import {QUESTIONS as LEGACY_QUESTIONS} from '../api/_lib/questions-legacy.js';
import * as current from '../api/_lib/server-v2.js';
import * as legacy from '../api/_lib/server.js';

process.env.QUIZ_ADMIN_SECRET='strong_local_admin_secret_for_tests_123456789';
process.env.QUIZ_ID_SECRET='stable_local_id_secret_for_tests_987654321';
process.env.QUIZ_ACCESS_CODES=Array.from({length:15},(_,i)=>String(1001+i)).join(',');
process.env.QUIZ_LEGACY_ACCESS_CODES=Array.from({length:20},(_,i)=>String(2001+i)).join(',');
process.env.QUIZ_ANSWER_KEY='0'.repeat(30);
process.env.QUIZ_LEGACY_ANSWER_KEY='0'.repeat(25);

test('Approved round has 30 distinct four-option questions in correct categories',()=>{
 assert.equal(QUESTIONS.length,30);
 assert.equal(QUESTIONS.filter(q=>q.world).length,5);
 assert.equal(QUESTIONS.filter(q=>q.fun).length,5);
 assert.equal(QUESTIONS.filter(q=>!q.world&&!q.fun).length,20);
 assert.equal(new Set(QUESTIONS.map(q=>q.q)).size,30);
 for(const question of QUESTIONS){
  assert.equal(question.a.length,4);
  assert.ok(question.a.every(x=>typeof x==='string'&&x.length>0));
  assert.equal(Object.hasOwn(question,'c'),false);
 }
 assert.equal(LEGACY_QUESTIONS.length,25);
});

test('Only 15 different four-digit codes can launch the new round',()=>{
 const codes=current.registeredCodes();
 assert.equal(codes.length,15);
 assert.equal(new Set(codes).size,15);
 assert.ok(codes.every(c=>/^\d{4}$/.test(c)));
 assert.equal(legacy.registeredCodes().length,20);
 assert.notEqual(current.verifyCode(codes[0]).codeId,legacy.verifyCode(legacy.registeredCodes()[0]).codeId);
 assert.throws(()=>current.verifyCode('0000'),/Kod noto‘g‘ri/);
 assert.throws(()=>current.verifyCode('12345'),/4 ta raqam/);
});

test('Authenticated round-two cookie keeps an independently signed identity',()=>{
 const user=current.verifyCode('1001');
 const cookie=current.cookieFor(user);
 assert.match(cookie,/HttpOnly/);
 assert.match(cookie,/Secure/);
 assert.match(cookie,/tafakkur_round2_session=/);
 assert.equal(current.authUser({headers:{cookie:cookie.split(';')[0]}}).codeId,user.codeId);
 assert.throws(()=>current.authUser({headers:{cookie:cookie.split(';')[0]+'wrong'}}),/Sessiya/);
 const previous=legacy.cookieFor(legacy.verifyCode('2001'));
 assert.match(previous,/tafakkur_session=/);
 assert.doesNotMatch(previous,/tafakkur_round2_session=/);
});

test('Only administrator may access the result endpoints',()=>{
 const input={headers:{'x-quiz-admin-key':process.env.QUIZ_ADMIN_SECRET}};
 assert.doesNotThrow(()=>current.requireAdmin(input));
 assert.throws(()=>current.requireAdmin({headers:{'x-quiz-admin-key':'incorrect'}}),/noto‘g‘ri/);
 for(const api of ['admin/results.js','admin/result.js','admin/codes.js']){
  const source=readFileSync(new URL('../api/'+api,import.meta.url),'utf8');
  assert.ok(source.includes('requireAdmin(req)'));
 }
});

test('Scoring stays 100-based and does not disclose answers to participants',()=>{
 const answers=Array.from({length:30},(_,i)=>i%2===0?0:1);
 const report=current.summaryForAdmin({status:'finished',answers});
 assert.equal(report.total,30);
 assert.equal(report.correct,15);
 assert.equal(report.points,50);
 const result=current.present({status:'finished',notification_sent_at:null,feedback:null});
 assert.equal(result.status,'finished');
 assert.equal(result.total,30);
 assert.equal(result.feedbackSubmitted,false);
 assert.equal(Object.hasOwn(result,'score'),false);
 assert.equal(Object.hasOwn(result,'answers'),false);
 assert.equal(legacy.present({status:'finished',notification_sent_at:null}).status,'finished');
});

test('Phone-friendly participant page shows 30 questions, 20-second timer and feedback',()=>{
 const page=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(page,/const TOTAL=30, DURATION=20000/);
 assert.match(page,/id="timerValue">20/);
 assert.ok(page.includes('20 soniya tugasa'));
 assert.ok(page.includes('id="feedbackForm"'));
 assert.ok(page.includes('id="feedbackComment"'));
 assert.ok(page.includes('feedbackSubmitted'));
 assert.ok(page.includes("'/api/feedback'"));
 assert.ok(page.includes("active.questionDurationMs||DURATION"));
 assert.ok(page.includes('@media(max-width:620px)'));
 assert.ok(!/id="username"[^>]*\brequired\b/.test(page));
});

test('Mobile admin lets organizer view both rounds and submitted ratings',()=>{
 const admin=readFileSync(new URL('../admin.html',import.meta.url),'utf8');
 assert.ok(admin.includes('id="legacyResultsBtn"'));
 assert.ok(admin.includes('selectedRound'));
 assert.ok(admin.includes('r.feedback'));
 assert.ok(admin.includes('tafakkur-yangi-15-natija.csv'));
 assert.ok(admin.includes('#allResultsTable tbody tr{'));
});

test('New API requires completed round-two cookie to leave review',()=>{
 const api=readFileSync(new URL('../api/feedback.js',import.meta.url),'utf8');
 assert.ok(api.includes('authUser(req)'));
 assert.ok(api.includes('saveFeedback(user'));
 const apiServer=readFileSync(new URL('../api/_lib/server-v2.js',import.meta.url),'utf8');
 assert.ok(apiServer.includes("row.status!=='finished'"));
 assert.ok(apiServer.includes("'feedback'"));
 assert.ok(apiServer.includes('DURATION=20000'));
});

test('HTML inline scripts parse as JavaScript',()=>{
 for(const filename of ['index.html','admin.html']){
  const page=readFileSync(new URL('../'+filename,import.meta.url),'utf8');
  const scripts=page.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g);
  let count=0;
  for(const m of scripts){new Function(m[1]);count++}
  assert.ok(count>=1);
 }
});
