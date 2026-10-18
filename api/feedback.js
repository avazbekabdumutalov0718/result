import {response,errorResponse,requirePost,authUser,saveFeedback} from './_lib/server-v2.js';
export default async function handler(req,res){
 try{
  requirePost(req);
  const user=authUser(req);
  const result=await saveFeedback(user,req.body?.rating,req.body?.comment);
  return response(res,200,result);
 }catch(e){return errorResponse(res,e)}
}
