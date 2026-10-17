# Tafakkur Kutubxonasi — Adabiyot bilimi sinovi (Supabasesiz)

**Vercel + GitHub + Telegram + Vercel Blob. Supabase mutlaqo ishlatilmaydi.**

- 25 ta savol, 5 tasi jahon adabiyoti; har biriga 20 soniya.
- Bitta tekshirilgan Telegram ID = bir umrlik bitta urinish (hatto brauzer yoki qurilma almashsa ham).
- Ism va yosh majburiy, Telegram username ixtiyoriy.
- Qatnashchiga ball ko‘rsatilmaydi; natijalar to‘g‘ri/noto‘g‘ri variantlar bilan faqat 7419543322 ga @Tafakkur_kutubxonasi_result_bot dan keladi.
- Botga qatnashchilar **/start bosmaydi**: saytning o‘zida Telegram Login Widget orqali tasdiqlanadi.

## QISQA SOZLASH

1. Vercel > **result** > **Storage** > **Create Database/Store** > **Blob** > **Private**. Nomini `tafakkur-quiz` deb qo‘ying va **result** loyihasining Production muhitiga **Connect** qiling. Vercel avtomatik `BLOB_READ_WRITE_TOKEN` beradi. Bu hech qanday Supabase xizmatini talab qilmaydi. Agar private store mavjud bo‘lmasa, public Blob tanlamang, chunki unda ishtirokchi ma’lumotlari bo‘ladi.
2. BotFather'da avvalgi ochiq tokenni `/revoke` qilib, yangi token oling. Vercel > result > Settings > Environment Variables > `TELEGRAM_BOT_TOKEN` ni yangi token bilan saqlang (faqat Production). Chatda tokenni yubormang!
3. `RESULT_CHAT_ID=7419543322` (ixtiyoriy, kodda default bor). `QUIZ_ANSWER_KEY` ham ixtiyoriy, kodda default mavjud; sir saqlamoqchi bo‘lsangiz, keyin secret variantiga o‘tkaziladi.
4. Vercel > Deployments > so‘nggi build > **Redeploy** (Production) qiling. `/api/health` manzilida `ok:true` chiqishini tekshiring.
5. @BotFather > `/setdomain` > `@Tafakkur_kutubxonasi_result_bot` > `result-pink-eight.vercel.app`. Domenni allaqachon ulangan bo‘lsa, takrorlash shart emas.
6. Vercel > Settings > Deployment Protection > Vercel Authentication'ni Production havoladan o‘chiring, aks holda boshqa qatnashchilar kira olmaydi.
7. Telegram admin akkauntingiz (ID 7419543322) botga `/start` yozgan bo‘lishi kerak; oldin yuborgan bo‘lsangiz qayta kerak emas.

## Asosiy xavfsizlik

- Bot token hech qachon HTML'ga yoki GitHub'ga yozilmaydi.
- Telegram login imzosi serverda tekshiriladi. Cookies `HttpOnly; Secure; SameSite=Lax`.
- Urinish qayta tiklanmaydi. Vercel Blob'da private immutable blobs saqlanadi, takroriy start yangi yozuv qo‘shmaydi.
- Har bir javob server vaqti bilan hisoblanadi, 20 soniya o‘tgach javobsiz qoldiriladi.
- Faqat foydalanuvchi sinovni to‘liq yakunlaganida yoki sahifaga qaytib vaqt tugagani aniqlanganda Telegramga xabar yuboriladi. Sahifa umuman ochilmasa, muddat tugagan natijani fon orqali yuborish uchun qo‘shimcha cron ishini sozlash mumkin.
- Qatnashchi boshqa Telegram akkaunt ochsa, uning aynan o‘sha odamligini kafolatli aniqlash imkonsiz.

## Muhim cheklov

GitHub repo ochiq. Server javob kalitining tayyor zaxira qiymati manba kodida bo‘lgani uchun texnik bilimli qatnashchi uni topishi mumkin. Yuqori xavfsizlikdagi tanlov uchun javob kalitini yashirin sozlamada saqlash va koddagi zaxira kalitini olib tashlash ma'qul.
