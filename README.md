# Tafakkur Kutubxonasi — yangi 30 ta savolli sinov (2026)

**Test:** https://result-pink-eight.vercel.app  
**Admin:** https://result-pink-eight.vercel.app/admin.html

## Yangi bosqich
- 30 savol: **20 ta o‘zbek adabiyoti**, **5 ta jahon adabiyoti**, **5 ta qiziqarli mantiqiy savol**.
- Har savolga **20 soniya**. Savol uchun vaqt serverda hisoblanadi va javobsiz qolgan savol qaytmaydi.
- Yangi bosqich uchun **15 ta noyob 4 xonali kod**. Har bir kod faqat bir marta yangi testni boshlaydi.
- Ism-familiya, yosh va kod majburiy; Telegram username ixtiyoriy; Telegram login yoki telefon raqami talab qilinmaydi.
- Qatnashchining bali ekranda ko‘rsatilmaydi. **Ball 100 lik tizimda**: to‘g‘ri javoblar soni / 30 × 100, eng yaqin butun songa yaxlitlanadi.
- Testdan so‘ng **1–5 yulduz bilan baholash va ixtiyoriy 600 belgigacha fikr yozish** formasi chiqadi. Feedback shart emas, bir marta saqlanadi.
- Admin barcha 15 yangi qatnashchi natijasi va feedbackni birga ko‘radi, CSV eksport qiladi.

## Oldingi natijalar
Oldingi 25 savolli test, uning 20 kodi va javoblar kaliti o‘zgartirilmadi. Kodlar va natijalar Vercel **Private Blob** ning eski `tafakkur-four-digit-v1` prefiksida saqlangan. Admin sahifasidagi **«Oldingi 20 ta natijani ko‘rish»** tugmasi ularni yangi bosqichdan alohida ochadi.

## Vercel maxfiy muhit sozlamalari (Production)
- `QUIZ_ACCESS_CODES`: yangi **15 ta 4 xonali kod** (faqat Vercel muhitida).
- `QUIZ_ANSWER_KEY`: yangi 30 savolning **30 xonali 0–3 javoblar kaliti** (GitHub'da yo‘q).
- `QUIZ_LEGACY_ACCESS_CODES` va `QUIZ_LEGACY_ANSWER_KEY`: eski test arxivi uchun.
- `QUIZ_ID_SECRET`: eski va yangi bosqichning kod identifikatorlari va sessiya imzosi uchun o‘zgarmas kalit.
- `QUIZ_ADMIN_SECRET`: admin panelga kirish uchun kuchli maxfiy kalit.
- `BLOB_READ_WRITE_TOKEN`: private Blob omboridan, saqlangan ma'lumotlarning boshqa foydalanuvchiga chiqishiga yo‘l qo‘ymaydi.
- `RESULT_CHAT_ID`: natijalar yuboriladigan tashkilotchi chat ID.
- `TELEGRAM_BOT_TOKEN`: faqat **yangi, maxfiy** BotFather tokeni. U sozlanmagan bo‘lsa, natijalar admin panelda saqlanib ko‘rinadi, lekin Telegramga avtomatik bormaydi.

**Maxfiy sozlamalarni hech qachon GitHub ochiq repozitoriyiga yoki chatga joylamang.** Chatga avval yuborilgan Telegram tokenlarini BotFather orqali bekor qilish kerak.

`/api/health` javobidagi `ready` yangi kodlar, 30 javoblar kaliti va Blob borligini bildiradi; `services.telegram` alohida status. Mahalliy tekshiruv: `npm run check && npm test`.
