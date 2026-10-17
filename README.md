# Tafakkur Kutubxonasi — 25 savolli test

Tayyorlangan: HTML, Telegram orqali browser login yoki Telegram Mini App, 20 soniyalik savollar, 25 ta savol (5 ta jahon adabiyoti), Telegram ID bo‘yicha bitta urinish, qatnashchiga ball ko‘rsatilmaydi, xabar faqat 7419543322 chat ID ga yuboriladi.

## ISHGA TUSHIRISH UCHUN MAJBURIY QADAMLAR
1. @BotFather orqali oldin chatda oshkor qilingan bot tokenini REVOKE qiling va yangi bot tokenini oling.
2. Supabase loyihangiz SQL Editor ida schema.sql ni ishga tushiring.
3. Vercel loyiha Settings > Environment Variables bo‘limida:
   TELEGRAM_BOT_TOKEN = yangi token, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
   RESULT_CHAT_ID = 7419543322, QUIZ_ANSWER_KEY = 25 raqamli maxfiy javob kaliti.
4. Vercelga yangi Production deployment qiling (env o‘zgartirilganda redeploy).
5. @BotFather -> /setdomain -> Tafakkur_kutubxonasi_result_bot -> deploy qilgan domeningiz (masalan result-abc.vercel.app). Shu bilan Telegram Login Widget Vercel havolasining o‘zida ishlaydi. Telegram Mini App sifatida ham /setmenubutton orqali ulangan linkni ochsa bo‘ladi.
6. Admin 7419543322 ID dagi akkaunt botga oldin /start yuborgan bo‘lishi kerak (yuborgan). Qatnashchilar botga /start yuborishi shart EMAS: Telegram Login orqali tasdiqlaydi.

## Muhim
GitHubga bot token va service-role key, QUIZ_ANSWER_KEY yuborilmaydi. Ularni faqat Vercel'da saqlang.
Bitta Telegram akkaunti uchun qayta topshirish boshqa qurilmadan ham taqiqlanadi. Boshqa Telegram hisobidan kiritilganini aynan bitta shaxs deb aniqlash mumkin emas.
Serverless funksiya natija xabarini yakunda jo‘natadi; bot vaqtinchalik ishlamasa, natija bazada qoladi, lekin hech kim so‘rov yubormasa avtomatik takrorlash bo‘lmaydi.
Savollar HTMLga oldindan berilmaydi, faqat faol savol serverdan keladi; kalit QUIZ_ANSWER_KEY muhit o‘zgaruvchisida.
