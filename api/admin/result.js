import * as current from '../_lib/server-v2.js';
import * as previous from '../_lib/server.js';
export default async function handler(req,res){
 try{
  current.requirePost(req);current.requireAdmin(req);
  const code=String(req.body?.code||'').trim();
  const action=String(req.body?.action||'lookup');
  if(!['lookup','resend'].includes(action))return current.response(res,400,{error:'Amal noto‘g‘ri.'});
  const v2=current.registeredCodes().includes(code);
  const s=v2?current:previous;
  const user=s.verifyCode(code);
  let row=await s.state(user);
  if(!row)return current.response(res,200,{status:'unused',message:'Ushbu kod bilan hali test boshlanmagan.'});
  if(action==='resend'&&row.status==='finished'){
   await s.maybeNotify(row);row=await s.state(user);
  }
  return current.response(res,200,{
   status:row.status,round:v2?'current':'legacy',
   participant:{fullname:row.fullname,age:row.age,username:row.entered_username||''},
   telegram:row.notification_sent_at?'sent':process.env.TELEGRAM_BOT_TOKEN?'pending':'missing_token',
   completedAt:row.completed_at,
   report:s.summaryForAdmin(row),
   feedback:v2?row.feedback:null
  });
 }catch(e){return current.errorResponse(res,e)}
}