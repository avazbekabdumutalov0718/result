export default function handler(req,res){
 const flags={
  blob:Boolean(process.env.BLOB_READ_WRITE_TOKEN),
  codes:Boolean(process.env.QUIZ_ADMIN_SECRET&&process.env.QUIZ_ADMIN_SECRET.length>=20),
  telegram:Boolean(process.env.TELEGRAM_BOT_TOKEN),
  answerKey:/^[0-3]{25}$/.test(String(process.env.QUIZ_ANSWER_KEY||''))
 };
 res.setHeader('Cache-Control','no-store');
 res.status(200).json({ok:true,ready:Object.values(flags).every(Boolean),services:flags});
}