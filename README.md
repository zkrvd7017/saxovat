# Saxovat restoran sayti

React/TanStack frontend va Django REST backend. Mehmonlar menyuni kirishsiz ochadi. Admin taomlar, narxlar, tayyorlanish daqiqalari, kategoriyalar, istoriyalar va stol QR kodini boshqaradi. Keshbek va mijoz kartalari o‘chirilgan.

- `frontend/` — sayt va admin interfeysi
- `backend/` — API, migratsiyalar va menyu uchun boshlang‘ich ma’lumotlar
- Telegram: https://t.me/SAXOVAT_OILAVIY
- Telefon: +998 97 353-00-00

## Local ishga tushirish

Node.js va Python o‘rnatilgan bo‘lishi kerak. Quyidagi buyruqlar PowerShell uchun.

Backend, birinchi terminalda:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py seed_saxovat
.\.venv\Scripts\python.exe manage.py create_restaurant_admin --phone +998901234567 --name Admin
.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8010
```

Admin yaratishda o‘zingizning raqamingizni kiriting. Parol terminalda yashirin so‘raladi; tayyor admin paroli repozitoriyga joylanmagan. `seed_saxovat` mavjud 52 ta taom, kategoriyalar, istoriyalar va ularning rasmlarini yuklaydi. Bu buyruqni ma’lumotlar tahrirlangandan keyin qayta ishlatmang: boshlang‘ich qiymatlar tiklanadi.

Frontend, ikkinchi terminalda:

```powershell
cd frontend
npm ci
npm run dev -- --host 127.0.0.1 --port 5180 --strictPort
```

Sayt: http://127.0.0.1:5180/

Admin kirishi: http://127.0.0.1:5180/staff-login

Bosh sahifadagi **Saxovat** nomini bosib ham admin loginni ochish mumkin. Login va admin panelidagi **Orqaga — menyuga** tugmasi restoran menyusiga qaytaradi.

Backend porti o‘zgarsa, `frontend/.env.example`ni `.env.local` nomi bilan nusxalang va `VITE_API_PROXY_TARGET`ni o‘zgartiring.

## Telegram bot

Bot `/start` bosgan mehmonni Telegram profili bilan ro‘yxatga oladi, iliq salomlashadi va matn ostida **🍽 Menyuni ko‘rish** tugmasini chiqaradi. Tugma Telegram ichida https://saxovat.easymenu.uz/ menyusini ochadi. `/menu` menyu tugmasini, `/aloqa` esa restoran telefonini ko‘rsatadi. Ro‘yxat telefon/parol yoki keshbek hisobini yaratmaydi.

Backend papkasida `.env.bot.example`ni `.env.bot` nomiga nusxalang va `TELEGRAM_BOT_TOKEN`ni kiriting. Token Gitga kiritilmaydi. Migratsiyalarni bajargach, alohida terminalda botni ishga tushiring:

```powershell
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py run_saxovat_bot
```

Bot ishlashi uchun kompyuter yoki hostingdagi jarayon doim ishlab turishi kerak. Menyu havolasi `SAXOVAT_MENU_URL` orqali almashtiriladi. Telegram mehmonlari Django adminining **Telegram mehmonlari** bo‘limida ko‘rinadi. Bot cursorni bazada saqlaydi; qayta ishga tushganda eski xabarlarni takroran qayta ishlamaydi. Bir token uchun bitta polling jarayoni ishlating.

## Tayyorlanish vaqti

Admin → Menyu bo‘limida yangi taomning tayyorlanish vaqtini butun daqiqada kiriting. Mavjud taom jadvalidagi qiymatni o‘zgartirib, **Saqlash**ni bosing. Mehmonlar menyusidagi taom kartasi va batafsil oynada shu vaqt chiqadi. `0` — **Tayyor**.

## Stol QR kodi

Adminning **Menyu QR** tugmasi joriy sayt bosh sahifasiga QR yaratadi. `/menu` va `/table` eski havolalari ham to‘liq saytga yo‘naltiriladi. `127.0.0.1` QR kodi boshqa telefonda kompyuteringizni ochmaydi; restoran uchun internetdagi sayt domenidan QR yarating.

## Server sozlamalari

Bu repozitoriyga push qilish saytni internetga joylashtirmaydi. Hostingda frontendning `/api/` va `/media/` so‘rovlarini backendga yo‘naltiring. Backend uchun `DJANGO_DEBUG=0`, kuchli `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS` va `DJANGO_CORS_ORIGINS` muhit o‘zgaruvchilarini belgilang. Baza, local kalit, yuklangan yangi rasmlar va parollar Git orqali yuborilmaydi. Local rejimda Django kaliti avtomatik yaratiladi va Git e’tiborsiz qoldiradigan `.django-secret` faylida saqlanadi.

Tekshiruvlar: frontend `npx tsc --noEmit` va `npm run build`; backend `python manage.py check`. Asosiy funksiyalar va tayyorlanish vaqti saqlanishi API hamda brauzerda tekshirilgan.
