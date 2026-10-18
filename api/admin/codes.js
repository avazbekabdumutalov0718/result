import {response,errorResponse,requirePost,requireAdmin,registeredCodes} from '../_lib/server-v2.js';
export default function handler(req,res){
 try{requirePost(req);requireAdmin(req);return response(res,200,{codes:registeredCodes()})}
 catch(e){return errorResponse(res,e)}
}