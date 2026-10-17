import {response,errorResponse,requirePost,requireAdmin,verifyCode,state,summaryForAdmin,maybeNotify} from '../_lib/server.js';
export default async function handler(req,res){
 try{
  requirePost(req);
  requireAdmin(req);
  const code=String(req.body?.code||'');
  const action=String(req.body?.action||'lookup');
  if(!['lookup','resend'].includes(action))return response(res,400,{error:'Amal noto‘g‘ri.'});
  const identity=verifyCode(code);
  let attempt=await state(identity);
  if(!attempt)return response(res,200,{status:'unused',message:'Bu kod bilan hali test boshlanmagan.'});
  if(action==='resend'&&attempt.status==='finished'){
   if(!process.env.TELEGRAM_BOT_TOKEN){
    return response(res,200,{status:'finished',telegram:'missing_token',message:'Bot tokeni Vercel’da yo‘q. Natija saqlangan, ammo Telegramga yuborib bo‘lmaydi.',participant:{fullname:attempt.fullname,age:attempt.age,username:attempt.entered_username||''},report:summaryForAdmin(attempt)});
   }
   await maybeNotify(attempt);
   attempt=await state(identity);
  }
  return response(res,200,{
   status:attempt.status,
   participant:{fullname:attempt.fullname,age:attempt.age,username:attempt.entered_username||''},
   telegram:attempt.notification_sent_at?'sent':process.env.TELEGRAM_BOT_TOKEN?'pending':'missing_token',
   completedAt:attempt.completed_at,
   report:summaryForAdmin(attempt)
  });
 }catch(e){return errorResponse(res,e);}
}
