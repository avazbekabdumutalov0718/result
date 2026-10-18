import * as current from '../_lib/server-v2.js';
import * as previous from '../_lib/server.js';
export default async function handler(req,res){
 try{
  current.requirePost(req);current.requireAdmin(req);
  const isPrevious=req.body?.round==='legacy';
  const results=await (isPrevious?previous.allAdminResults():current.allAdminResults());
  return current.response(res,200,{...results,round:isPrevious?'legacy':'current'});
 }catch(e){return current.errorResponse(res,e)}
}