import {response,errorResponse,requirePost,authUser,state,present,maybeNotify} from './_lib/server-v2.js';
export default async function handler(req,res){
 try{
  requirePost(req);
  // Old-round cookies never prevent a participant from entering the new competition.
  if(!String(req.headers?.cookie||'').includes('tafakkur_round2_session='))return response(res,200,{status:'new'});
  const user=authUser(req),row=await state(user);
  await maybeNotify(row);
  return response(res,200,present(row));
 }catch(e){return errorResponse(res,e)}
}