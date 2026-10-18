import {response,errorResponse,requirePost,verifyCode,cookieFor,begin,present,maybeNotify} from './_lib/server-v2.js';
export default async function handler(req,res){
 try{
  requirePost(req);
  const name=String(req.body?.name||'').trim().replace(/\s+/g,' ');
  const age=Number(req.body?.age);
  const username=String(req.body?.telegramUsername||'').trim().replace(/^@/,'');
  if(name.length<2||name.length>80)return response(res,400,{error:'Ism va familiya 2–80 belgidan iborat bo‘lsin.'});
  if(!Number.isInteger(age)||age<7||age>100)return response(res,400,{error:'Yosh 7–100 oralig‘ida bo‘lsin.'});
  if(username&&!/^[A-Za-z0-9_]{5,32}$/.test(username))return response(res,400,{error:'Telegram username kiritilgan bo‘lsa, 5–32 belgi bo‘lsin.'});
  const user=verifyCode(req.body?.oneTimeCode);
  const row=await begin(user,name,age,username);
  res.setHeader('Set-Cookie',cookieFor(user));
  await maybeNotify(row);
  return response(res,200,present(row));
 }catch(e){return errorResponse(res,e)}
}