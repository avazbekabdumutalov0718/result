export default function handler(req,res){
 const flags={
  blob:Boolean(process.env.BLOB_READ_WRITE_TOKEN),
  codes:String(process.env.QUIZ_ACCESS_CODES||'').split(/[\s,;]+/).filter(Boolean).length===15,
  telegram:Boolean(process.env.TELEGRAM_BOT_TOKEN),
  answerKey:/^[0-3]{30}$/.test(String(process.env.QUIZ_ANSWER_KEY||'')),
  legacyArchive:Boolean(process.env.QUIZ_LEGACY_ACCESS_CODES&&process.env.QUIZ_LEGACY_ANSWER_KEY)
 };
 res.setHeader('Cache-Control','no-store');
 res.status(200).json({ok:true,ready:flags.blob&&flags.codes&&flags.answerKey,services:flags});
}