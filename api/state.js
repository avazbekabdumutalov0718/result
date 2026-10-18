import * as current from './_lib/server-v2.js';
import * as previous from './_lib/server.js';
export default async function handler(req,res){
 const v2=String(req.headers?.cookie||'').includes('tafakkur_round2_session=');
 const s=v2?current:previous;
 try{
  s.requirePost(req);
  const u=s.authUser(req);
  const row=await s.state(u);
  await s.maybeNotify(row);
  return s.response(res,200,s.present(row));
 }catch(e){return s.errorResponse(res,e)}
}