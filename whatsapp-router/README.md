# WhatsApp Router

كتبعث من واتساب `#podcast ...` وكيوصل لدوسي `inbox/` ديال المشروع فـ PC ديالك. السيشن local كتقراه.

## الإعداد (مرة وحدة)

1. **Twilio**: دير حساب، وفعّل **WhatsApp Sandbox** (Messaging → Try it out → WhatsApp). دير join بالكود اللي كيعطيك من رقمك.
2. **Python 3** (ما كاين حتى pip install). **ffmpeg** اختياري، باش الفيديو يتحول لـ frames وصوت.
3. `cp config.example.json config.json` وبدّل:
   - `allowed_senders`: رقمك بصيغة `whatsapp:+212...` (غير هو اللي يقدر يبعث).
   - `projects`: كل tag مع مسار دوسي المشروع.
4. **Tunnel** باش Twilio يوصل لـ PC:
   ```
   cloudflared tunnel --url http://localhost:8080     # أو: ngrok http 8080
   ```
   عطاك رابط بحال `https://abc.trycloudflare.com`.
5. فـ Twilio Sandbox settings، **When a message comes in** = `https://abc.trycloudflare.com/whatsapp` (POST).

## التشغيل

Mac/Linux:
```
export TWILIO_ACCOUNT_SID=ACxxxx
export TWILIO_AUTH_TOKEN=xxxx
export PUBLIC_URL=https://abc.trycloudflare.com/whatsapp   # نفس الرابط بالضبط اللي فـ Twilio
python3 router.py
```
Windows (PowerShell): `$env:TWILIO_ACCOUNT_SID="ACxxxx"` وهكذا، من بعد `python router.py`.

الأسرار كتبقى فـ environment، ماشي فالريبو.

## الاستعمال من واتساب

- `#podcast هادي فكرة للحلقة 3` ← تسجل فـ `podcast/inbox/`
- من بعد ما تبعث tag، الصور والفيديوهات اللي من بعد (بلا tag) كيمشيو لنفس المشروع، حتى تبعث tag آخر.
- tag ما كاينش ← كيجاوبك بلائحة الـ tags.

## السيشن ديال Claude

حط محتوى `CLAUDE-snippet.md` فـ `CLAUDE.md` ديال كل مشروع. من بعد قول للسيشن: **"شوف l-inbox"**.

## ملاحظات

- الـ PC خاصو يكون شاعل والسكريبت خدام.
- كل طلب كيتحقق من توقيع Twilio، وغير الأرقام فـ `allowed_senders` كتقبل.
- Sandbox ديال Twilio مخصص للتجربة. للاستعمال الدائم خاصك رقم WhatsApp Business.
- ما كاينش transcription تلقائي للصوت. السكريبت كيحيد `.wav` ويقدر Claude أو Whisper يحولو لنص.
