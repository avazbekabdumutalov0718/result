import * as current from './_lib/server-v2.js';
import * as previous from './_lib/server.js';
export default async function handler(req,res){
 const v2=String(req.headers?.cookie||'').includes('tafakkur_round2_session=');
 const s=v2?current:previous;
 try{
  s.requirePost(req);
  const u=s.authUser(req),i=Number(req.body?.index),choice=Number(req.body?.choice);
  if(!Number.isInteger(i)||i<0||i>=(v2?30:25)||!Number.isInteger(choice)||choice < -1||choice>3)
   return s.response(res,400,{error:'Javob noto‘g‘ri.'});
  let row;
  try{row=await s.submit(u,i,choice)}catch(e){
   if(!['STALE_INDEX','NOT_STARTED'].some(x=>e.message.includes(x)))throw e;
   row=await s.state(u);
  }
  await s.maybeNotify(row);
  return s.response(res,200,s.present(row));
 }catch(e){return s.errorResponse(res,e)}
}