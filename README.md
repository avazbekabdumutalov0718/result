# Tafakkur Kutubxonasi — 25 ta savolli test (2026)

**Sayt:** https://result-pink-eight.vercel.app

**Admin kod generatori:** https://result-pink-eight.vercel.app/admin.html

## Qatnashchi oqimi

1. Qatnashchi oddiy brauzerda saytni ochadi. Telegram login va SMS talab qilinmaydi.
2. **Bir martalik kod**, **to‘liq ism** va **yosh**ni kiritadi. **Telegram username ixtiyoriy**.
3. Yangi boshlanadigan testlarda har bir savolga **15 soniya** vaqt beriladi; vaqt tugasa javob berilmagan deb belgilanadi. Avval boshlangan testlar eski vaqtini saqlaydi.
4. 25 savol yakunlangach, qatnashchiga ball va to‘g‘ri javoblar ko‘rinmaydi.
5. Natija @Tafakkur_kutubxonasi_result_bot orqali faqat Telegram chat ID **7419543322** ga yuboriladi.

## Administrator kodlarni qanday yaratadi?

1. Vercel > result > Settings > Environment Variables > Production muhitida `QUIZ_ADMIN_SECRET` o‘zgaruvchisini **kamida 20 ta belgilik kuchli va tasodifiy maxfiy kalit** bilan yarating.
2. `/admin.html` sahifasini oching va o‘zingiz belgilagan maxfiy kalitni kiriting.
3. Serverda sozlangan 20 ta to‘rt xonali kodni admin sahifasida ko‘ring, TXT sifatida saqlang va har qatnashchiga bittadan tarqating.
4. Kod formati **4 ta raqam**. Server faqat Vercel Production'dagi `QUIZ_ACCESS_CODES` ro‘yxatida mavjud kodlarni qabul qiladi.
5. Ishlatilgan kod yana hech qachon yangi test boshlamaydi. Birinchi brauzerda mavjud sessiya davom ettirilishi mumkin.

**Diqqat:** Username qo‘lda kiritiladi va Telegram tomonidan tasdiqlanmaydi. Bu usul bir **kodni** qayta ishlatishni to‘sadi, lekin bir odamning boshqa koddan foydalanishini kafolatli aniqlay olmaydi.

## Supabasesiz sozlash

GitHub loyihasi: https://github.com/avazbekabdumutalov0718/result

- **Vercel Blob:** Vercel > result > Storage > Create > Blob > **Private** qilib yarating, Production muhitiga ulang. O‘zi `BLOB_READ_WRITE_TOKEN` beradi. **Public** store yaratmang, chunki foydalanuvchi ma’lumotlari maxfiy.
- **QUIZ_ADMIN_SECRET:** admin sahifasiga kirish uchun. **QUIZ_ID_SECRET:** foydalanilgan kodlarning identifikatori va brauzer sessiyasini barqaror saqlash uchun.
- **QUIZ_ANSWER_KEY:** 25 ta A/B/C/D variantining 0/1/2/3 indekslariga mos **25 raqam**. Faqat Vercel Production env ga saqlang. Kodda zaxira javob kaliti yo‘q, shuning uchun to‘liq ishlashi uchun bu kalit kerak.
- **TELEGRAM_BOT_TOKEN:** BotFather’dan olingan **yangi** maxfiy token; eski token chatda oshkor qilingan va almashtirilishi shart.
- **RESULT_CHAT_ID:** `7419543322` (kodda default, env ixtiyoriy).

Har bir env qo‘shilganidan so‘ng **Production redeploy** qiling. `/api/health` sahifasi hech qanday maxfiy qiymatni qaytarmasdan qaysi sozlama mavjudligini ko‘rsatadi. `ready:true` chiqsa, sozlamalar borligini tasdiqlaydi, ammo haqiqiy natija yuborilganini isbotlamaydi.

## Xavfsizlik va cheklovlar

- Token va admin kaliti hech qachon brauzerga yoki GitHub ochiq kodiga yuborilmaydi.
- `admin.html` oldindan yaratilgan kodlar ro‘yxati va natijalarni ko‘rsatadi; admin maxfiy kalitisiz ishlamaydi.
- Koddan birinchi foydalanish private Vercel Blob'da o‘zgarmas yozuv sifatida saqlanadi; qayta kirish kodi bloklanadi.
- Ishtirokchi birinchi brauzerida testni davom ettirishi uchun HttpOnly cookie ishlatiladi.
- Ball faqat Telegram chatga yuboriladi, sahifaga qaytarilmaydi.
- Vercel Blob bilan imkon qadar kam amallar qiling. Ko‘p qatnashchi bo‘lsa, optimallashtirilgan database yechimi ko‘proq mos kelishi mumkin.
- Browser va internet butunlay uzilganda, final natijani yuborish foydalanuvchi keyingi so‘rov yuborganda tiklanadi. Rejalashtirilgan cron hali qo‘shilmagan.
- Vercel project uchun Deployment Protection yoqilgan bo‘lsa, uni foydalanuvchilar uchun moslashtiring.

Oldin `/setdomain` qilgan bo‘lsangiz, endi Telegram login ishlatilmaydi, domen sozlamasi test uchun kerak emas.
