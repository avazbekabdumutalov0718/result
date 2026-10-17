import {response,errorResponse,requirePost,verifyWidget,cookieFor} from './_lib/server.js';
export default function handler(req,res){try{
 requirePost(req);
 const user=verifyWidget(req.body||{});
 res.setHeader('Set-Cookie',cookieFor(user));
 return response(res,200,{ok:true,username:user.username||''});
}catch(e){return errorResponse(res,e);}}