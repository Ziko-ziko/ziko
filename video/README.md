# Motion as Code — دليل المونتاج

كنصاوبو موشن ݣرافيك بالكود (TypeScript + three.js)، مربوط مع الفوازوفر، بلا After Effects.
الفيديو: 1920x1080، 60 fps.

## الفكرة فجملة

كل مشهد (سميتو **plate**) هو ملف TypeScript كيرسم كل فريم على حساب الوقت.
التوقيت ديال كل كلمة فالفوازوفر هو اللي كيقول للمشهد إمتى يتحرك، داكشي علاش الصورة كتبقى مركبة مع الصوت.
بغيتي تبدل شي حاجة (لون، سرعة، ترانزيشن، مشهد جديد)؟ كتقولها لـ Claude، كيبدل الكود، وكنعاودو الرندر.

```
1 Voiceover  →  2 Align  →  3 Scenes  →  4 Preview  →  5 Render  →  6 Sound
voiceover.mp3   align_vo.py   scenes/*.ts   vite :5173   render.ts    sfx_mix.py
```

## 1. التثبيت (مرة وحدة)

### الأدوات اللي خاصين
| أداة | علاش |
|---|---|
| bun | كيثبت الباكيدجات وكيشغل السكريبتات |
| Google Chrome / Chromium | الرندر كيرسم بيه الفريمات |
| ffmpeg (مع libx264) | كيحول الفريمات لـ MP4 وكيخلط الصوت |
| Python + uv | غير إلا بدلتي الفوازوفر ولا بغيتي تعاود ميكس الصوت |

ف هاد البيئة ديال Claude فالكلاود، هادو كاملين **موجودين ديجا** (تشيكيتهم).

### حط الكيت فالبلاصة ديالو
فك `Motion_as_kit.zip` داخل `video/motion-as-code/` باش يكون عندك:

```
video/motion-as-code/
  app/        المحرك، المشاهد، التايملاين، الفونتات، سكريبت الرندر
  audio/      الفوازوفر + 28 ديال المؤثرات الصوتية
  data/       التوقيتات ديال الكلمات (باش تشوف البروفيو ديريكت)
  analysis/   سكريبتات الـ alignment والميكس
  README.md, LICENSE.pdoom-engine, .claude/
```
خلي الترتيب ديال الفولدرات كيف ما هو، حيت السكريبتات خدامة بـ relative paths.

### شغل السكريبت
```bash
bash video/setup.sh
```
كيتشيكي الأدوات، كيتأكد بلي الكيت فبلاصتو، وكيدير `bun install`. إلا خرجو كلشي `[ok]` راك واجد.

## 2. الخدمة خطوة بخطوة

### البروفيو (اللايف)
```bash
cd video/motion-as-code/app
bunx vite
```
حل http://localhost:5173 — زيد `?t=35` باش تبدا من الثانية 35.

| زر | شنو كيدير |
|---|---|
| space | play / pause |
| ← / → | ثانية لور/لقدام (5 ثواني مع shift) |
| `,` و `.` | فريم بفريم |
| `[` و `]` | المشهد اللي قبل / اللي من بعد |
| l | عاود المشهد الحالي فلوب |
| h | خبي الواجهة |

### صور ثابتة باش تشيكي تفصيل
```bash
cd video/motion-as-code/app
bun scripts/render.ts stills --t 12.5,40.2 --only code --out ../out/wip
```

### رندر الفيديو كامل
```bash
cd video/motion-as-code/app
BROWSER_CHANNEL=chromium bun run render      # الخروج: out/motion-as-code.mp4
```
(`BROWSER_CHANNEL=chromium` غير إلا ما كانش Google Chrome، بحال هنا فالكلاود.)

| فلاݣ | شنو كيدير |
|---|---|
| `--samples 4` | أسرع 4 مرات تقريبا (درافت) |
| `--samples auto` | الافتراضي، motion blur أكثر فين الحركة سريعة |
| `--scale 2` | 4K |

### زيد المؤثرات الصوتية (بلا ما تعاود الرندر)
```bash
cd video/motion-as-code
python -m uv run --no-project --with numpy python analysis/sfx_mix.py
cd out
ffmpeg -i motion-as-code.mp4 -i mix.wav -map 0:v -map 1:a \
  -c:v copy -c:a aac -b:a 320k -shortest motion-as-code_sfx.mp4
```
بغيتي مؤثر يطلع ولا يهبط؟ بدل `db` ديالو فـ `analysis/sfx_mix.py`.

### بدل الفوازوفر بديالك
1. بدل `audio/voiceover.mp3`.
2. بدل `SCRIPT` (و `SPOKEN` للأرقام والاختصارات) فـ `analysis/align_vo.py`.
3. عاود التحليل:
```bash
python -m uv run --no-project --with onnxruntime --with numpy python analysis/align_vo.py
python -m uv run --no-project --with numpy python analysis/audio_vo.py
```
4. إلا تبدل الكلام، بدل الجمل اللي فـ `cut(...)` فـ `app/src/timeline.ts`.

## 3. كيفاش المشروع مركب

| ملف | دورو |
|---|---|
| `app/src/engine/` | المحرك (pdoom-video). **ما تقيسوش.** |
| `app/src/scenes/_vo.ts` | أدوات مشتركة: كاميرا، القلم، الكلمات karaoke، ورقة الرسم |
| `app/src/scenes/*.ts` | المشاهد (9 ديال الـ plates) |
| `app/src/timeline.ts` | إمتى كيدوز كل مشهد |
| `app/scripts/render.ts` | الرندر: Chrome headless → فريمات → ffmpeg |
| `data/lyrics.json` | توقيت كل كلمة |

**مشهد جديد:** صاوب `app/src/scenes/smiya.ts` (class كتورث من `Scene`، export default)، وزيد سطر
`E('smiya', 'smiya', start, end)` فـ `timeline.ts`.
القاعدة: كلشي خاصو يكون function ديال الوقت (`f.t`, `f.lt`, `f.p`) — بلا random وبلا state.

## 4. أمثلة ديال الطلبات لـ Claude
- "دير الترانزيشن للمشهد code أنعم وأبطأ."
- "بدل اللون البرتقالي بالأزرق فكل بلاصة."
- "زيد مشهد جديد بين frames و pipeline فيه loading bar."
- "دير رندر كامل بـ --samples 4 كدرافت."

## 5. مشاكل وحلول
| مشكل | الحل |
|---|---|
| صفحة بيضة فـ localhost:5173 | دير `bun install` فـ `app/`، وشوف الأخطاء فالترمينال ديال vite |
| ما كاينش الصوت فالبروفيو | ورك على space، المتصفح كيبلوكي الصوت حتى تتفاعل |
| الرندر ما لقاش Chrome | `BROWSER_CHANNEL=chromium` (ولا msedge) |
| الرندر بطيء بزاف | `--samples 4` للدرافت، ولا `stills` لمشهد واحد |
| الأنيميشن تزحزح بعد فوازوفر جديد | عاود جوج سكريبتات التحليل وصحح `cut(...)` |

## Credits
المحرك والستايل: pdoom-video ديال mexicat (MIT) — خلي `LICENSE.pdoom-engine` مع المشروع.
الفوازوفر والمؤثرات: ElevenLabs — شوف شروط الترخيص ديال البلان ديالك قبل ما تنشر.
