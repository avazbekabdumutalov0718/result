import {response,errorResponse,requirePost,requireAdmin,allAdminResults} from '../_lib/server.js';

export default async function handler(req,res){
 try{
  requirePost(req);
  // Required on every request; participants cannot access other participants' results.
  requireAdmin(req);
  const overview=await allAdminResults();
  return response(res,200,overview);
 }catch(error){
  return errorResponse(res,error);
 }
}
