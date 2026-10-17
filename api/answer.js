import {response,errorResponse,requirePost,authUser,submit,state,present,maybeNotify} from './_lib/server.js';
export default async function handler(req,res){try{
 requirePost(req);const u=authUser(req),i=Number(req.body?.index),choice=Number(req.body?.choice);
 if(!Number.isInteger(i)||i<0||i>24||!Number.isInteger(choice)||choice < -1||choice>3)return response(res,400,{error:'Javob noto‘g‘ri.'});
 let row;try{row=await submit(u,i,choice)}catch(e){if(!['STALE_INDEX','NOT_STARTED'].some(x=>e.message.includes(x)))throw e;row=await state(u)}
 await maybeNotify(row);return response(res,200,present(row));
}catch(e){return errorResponse(res,e);}}