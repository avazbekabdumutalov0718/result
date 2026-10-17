import {response,errorResponse,requirePost,requireAdmin,makeCodes} from '../_lib/server.js';
export default function handler(req,res){
 try{
  requirePost(req);
  requireAdmin(req);
  const number=Number(req.body?.count);
  return response(res,200,{codes:makeCodes(number)});
 }catch(e){return errorResponse(res,e);}
}