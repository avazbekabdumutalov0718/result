import {response,errorResponse,requirePost,authUser,begin,present,maybeNotify} from './_lib/server.js';
export default async function handler(req,res){try{
 requirePost(req);const u=authUser(req);const name=String(req.body?.name||'').trim().replace(/\s+/g,' ');
 const age=Number(req.body?.age),typed=String(req.body?.telegramUsername||'').trim().replace(/^@/,'');
 if(name.length<2||name.length>80)return response(res,400,{error:'Ism 2–80 belgidan iborat bo‘lsin.'});
 if(!Number.isInteger(age)||age<7||age>100)return response(res,400,{error:'Yosh 7–100 oralig‘ida bo‘lsin.'});
 if(typed&&!/^[a-zA-Z0-9_]{5,32}$/.test(typed))return response(res,400,{error:'Telegram username noto‘g‘ri.'});
 const row=await begin(u,name,age,typed||null);await maybeNotify(row);return response(res,200,present(row));
}catch(e){return errorResponse(res,e);}}