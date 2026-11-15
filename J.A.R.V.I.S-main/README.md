# J.A.R.V.I.S.

Iron Man uslubidagi golografik interfeysli ovozli yordamchi. **"Hey Jarvis"**
deysiz — u uyg'onadi, tinglaydi va haqiqiy ishlarni bajaradi: internetdan
qidiradi, rasm yaratadi, sahifalarni o'qib beradi. Yuzi — veb-sahifa (React +
Vite + Three.js), miyasi — sizning kompyuteringizdagi Claude Code.

Bu loyiha [adewaskar/jarvis](https://github.com/adewaskar/jarvis) (MIT
litsenziyasi, © Aditya Dewaskar) asosida qurilgan va unga quyidagilar
qo'shilgan:

- **Telefon rejimi** — bir xil Wi-Fi'dagi telefondan QR kod orqali ochiladi,
  kirish kaliti bilan himoyalangan.
- **Moslashuvchan interfeys** — noutbuk, telefon (tik va yotiq holatda) uchun
  alohida joylashuv.
- **Sensorli boshqaruv** — klaviatura o'rniga mikrofon, Standby va Voice
  tugmalari.
- **Ilova sifatida o'rnatish** — "Bosh ekranga qo'shish" orqali to'liq ekranli
  ilova bo'lib ochiladi; ekran o'chib qolmaydi.

To'liq texnik hujjat (ingliz tilida): [README.en.md](README.en.md).

---

## Nima kerak

| | |
|---|---|
| **Claude Code** | O'rnatilgan va tizimga kirilgan bo'lishi kerak. `npm install -g @anthropic-ai/claude-code`, keyin bir marta `claude` ni ishga tushirib, login qiling. API kalit kerak emas. |
| **Node.js 20+** | <https://nodejs.org> |
| **Chrome yoki Edge** | Oddiy brauzer oynasida (ichki ko'rish oynasida mikrofon ishlamaydi). |
| *Ixtiyoriy:* ElevenLabs kaliti | Ovoz sifati va eshitish aniqligi yaxshilanadi. Usiz ham hammasi ishlaydi. |

> **Muhim:** JARVIS'ning miyasi noutbukda ishlaydi. Telefon — faqat ikkinchi
> ekran va mikrofon. Telefondan foydalanayotganda noutbuk yoqilgan va
> `npm run phone` ishlab turgan bo'lishi kerak.

---

## Eng oson yo'l

1. Repo sahifasida **Code → Download ZIP** ni bosing va arxivni oching.
2. **Windows:** `JARVIS.bat` ni ikki marta bosing. **macOS / Linux:** terminalda
   `./jarvis.sh`.
3. Birinchi safar u Claude Code va kutubxonalarni o'zi o'rnatadi, Claude
   hisobingizga kirishni so'raydi, keyin rejimni tanlaysiz: faqat noutbuk yoki
   noutbuk + telefon.

Node.js o'rnatilmagan bo'lsa, skript yuklab olish sahifasini ochib beradi.

---

## Noutbukda ishga tushirish (qo'lda)

```bash
git clone https://github.com/mustafomakhsudov1595-dotcom/J.A.R.V.I.S.git
cd J.A.R.V.I.S
npm install
npm run setup      # hamma narsa joyidami — tekshirib beradi
npm start
```

So'ng Chrome'da <http://localhost:5173> ni oching, **INITIALISE** ni bosing,
mikrofonga ruxsat bering va **"Hey Jarvis"** deng.

| Tugma | Vazifasi |
|---|---|
| **"Hey Jarvis"** | Uyg'otish |
| **Space** | Uyg'otish so'zisiz gapirish |
| Gapirib yuborish | U gapirayotganda to'xtatish |
| **V** | Ovozni almashtirish |
| **Escape** | Kutish rejimiga o'tkazish |
| **G** | Qo'l harakatlari bilan boshqarish (kamera) |
| **D** / **T** | Diagnostika / ovoz sinovi |

---

## Telefonda ishga tushirish

Telefon va noutbuk **bitta Wi-Fi tarmog'ida** bo'lsin.

1. Noutbukda:

   ```bash
   npm run phone
   ```

2. Terminalda kalitli havola va **QR kod** chiqadi. Telefon kamerasi bilan
   skanerlang.
3. Brauzer sertifikat haqida bir marta ogohlantiradi (bu noutbukning o'zi
   yaratgan sertifikat) — **Advanced → Proceed** (Qo'shimcha → Davom etish) ni
   tanlang.
4. **INITIALISE** ni bosing va mikrofonga ruxsat bering.
5. Pastdagi **mikrofon tugmasini** bosib gapiring. **Standby** — kutish rejimi,
   **Voice** — ovozni almashtirish.
6. Ilova qilib o'rnatish: brauzer menyusi → **Bosh ekranga qo'shish**
   (Add to Home Screen).

Noutbukning o'zida ham shu rejimda ochish uchun terminaldagi
`https://localhost:5173/?key=…` havolasidan foydalaning.

**Maslahatlar**

- Android'da **Chrome** eng yaxshi ishlaydi. iPhone'da Safari'ning nutqni
  tanishi cheklangan, shuning uchun ElevenLabs kaliti tavsiya etiladi.
- Telefonda "Hey Jarvis" uyg'otish so'zi brauzerga bog'liq va har doim ham
  barqaror emas — mikrofon tugmasi ishonchliroq.
- Sahifa ochilmasa: ikkala qurilma bitta tarmoqdami, noutbukning xavfsizlik
  devori (firewall) 5173-portni to'sib qo'ymaganmi — tekshiring.

### Xavfsizlik

- Havoladagi **kalit — parol**. Kimda bu havola bo'lsa, o'sha sizning
  JARVIS'ingiz bilan gaplasha oladi. Hech kimga yubormang.
- Kalit `~/.jarvis/phone-key` faylida saqlanadi. Faylni o'chirsangiz, yangi
  kalit yaratiladi va barcha eski qurilmalar chiqarib yuboriladi.
- Bridge (miya) faqat `127.0.0.1` da tinglaydi; telefon unga kalit tekshirilgan
  `/bridge` yo'li orqali yetadi. Kalitsiz so'rovlar rad etiladi.
- Jamoat Wi-Fi tarmoqlarida ishlatmang.
- Amallarga ruxsat berish (`npm run phone:writes`) JARVIS'ga noutbukda buyruq
  bajarish imkonini beradi. Yoqishdan oldin [README.en.md](README.en.md) dagi
  "Enabling actions" bo'limini o'qing.

---

## Ovoz va til

- JARVIS har qanday savolga **oʻzbek tilida** (lotin yozuvida) javob beradi va
  oʻzbekcha nutqni tinglaydi. Ingliz tiliga qaytarish: `.env.local` fayliga
  `JARVIS_LANGUAGE=en` deb yozing.
- Ovoz — ElevenLabs'dagi `RaNVfTYq3HYeFPLng6XN` ovozi. Boshqasini qoʻyish:
  `.env.local` ga `JARVIS_VOICE_ID=...`.
- Birinchi ishga tushirishda dastur **ElevenLabs API kalitini** soʻraydi va uni
  `.env.local` fayliga saqlaydi. Bu fayl faqat sizning kompyuteringizda turadi
  va GitHub'ga yuklanmaydi. Kalitni almashtirish uchun shu fayldagi
  `ELEVENLABS_API_KEY=` qatorini tahrirlang.
- Kalitsiz JARVIS brauzerning oʻz ovozida gapiradi — unda oʻzbekcha talaffuz
  yoʻq, shuning uchun kalit tavsiya etiladi.
- Oʻzbekcha talaffuz uchun avval `eleven_v3` modeli sinab koʻriladi; hisobingizda
  u ishlamasa, avtomatik `eleven_flash_v2_5` ga oʻtadi (talaffuzda aksent
  boʻlishi mumkin). Modelni `JARVIS_TTS_MODEL` bilan tanlash mumkin.

---

## Buyruqlar

| Buyruq | Vazifasi |
|---|---|
| `npm start` | Noutbuk rejimi (faqat shu kompyuter) |
| `npm run phone` | Telefon rejimi (Wi-Fi orqali, kalit bilan) |
| `npm start -- --writes` / `npm run phone:writes` | Amallarga ruxsat bilan |
| `npm run setup` | Talablarni tekshirish |
| `npm test` · `npm run lint` · `npm run build` | Testlar, lint, yig'ish |

Sozlamalar (model, ElevenLabs kaliti va boshqalar) `.env.example` faylida va
[README.en.md](README.en.md) da batafsil yozilgan.

## Litsenziya

MIT — [LICENSE](LICENSE) ga qarang.
