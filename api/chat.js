// api/chat.js

// تابع تمیز کردن خروجی: کمی مرتب‌تر برای نمایش داخل حباب / خروجی
function cleanAnswer(text) {
  if (!text || typeof text !== "string") {
    return "نتوانستم پاسخی تولید کنم.";
  }

  let t = text.trim();

  // نرمال‌سازی خط‌ها
  t = t.replace(/\r\n/g, "\n");

  // حداکثر دو خط خالی پشت سر هم
  t = t.replace(/\n{3,}/g, "\n\n");

  // حذف فاصله‌های اضافه در انتهای هر خط
  const lines = t.split("\n").map((line) => line.replace(/\s+$/g, ""));
  return lines.join("\n");
}

// مدل‌های Groq برای fallback
const GROQ_MODELS = [
  "llama-3.3-70b-versatile", // اصلی و باکیفیت‌تر
  "llama-3.1-8b-instant",    // سریع و سبک
  "mixtral-8x7b-32768",      // مدل جایگزین
];

export default async function handler(req, res) {
  // فقط POST
  if (req.method !== "POST") {
    return res.status(200).send("OK");
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("GROQ_API_KEY تعریف نشده");
    return res
      .status(500)
      .json({ ok: false, error: "کلید Groq روی سرور تنظیم نشده است." });
  }

  // ورودی را از بدنه بخوانیم (چند حالت مختلف)
  const userMessage =
    req.body?.text ||        // فرانت کپشن‌ساز: { text: "..." }
    req.body?.message ||     // اگر جایی { message: "..." } فرستاده شود
    req.body?.message?.text || // حالت وبهوک شبیه ایتا
    null;

  if (!userMessage || typeof userMessage !== "string") {
    return res
      .status(400)
      .json({ ok: false, error: "پیام کاربر ارسال نشده است." });
  }

  // سیستم‌پرامپت تقویت‌شده برای کپشن‌ساز + تیتر + پرامپت طراحی
  const systemPrompt = `
تو دستیار هوشمند فارسی‌زبان «طاویتا» هستی.

کارهای اصلی که معمولاً از تو می‌خواهند:
1) نوشتن کپشن کامل و حرفه‌ای برای شبکه‌های اجتماعی (ایتا، اینستاگرام و...)  
   - با هوک خیلی جذاب در خط اول  
   - بدنه‌ی روان، واضح و کاربردی  
   - یک CTA (دعوت به اقدام) مشخص و عملی در انتها  
   - هشتگ‌های مرتبط و مفید (نه خیلی زیاد، نه خیلی کم)

2) پیشنهاد تیتر و هوک کوتاه و خفن برای شروع کپشن یا نوشتن روی کاور پست  
   - هر تیتر در یک خط  
   - کوتاه، دقیق و کنجکاوبرانگیز  
   - بدون توضیح اضافه قبل و بعد

3) نوشتن پرامپت دقیق برای طراحی کاور/بنر برای ابزارهای طراحی و هوش مصنوعی  
   - توضیح شفاف موضوع تصویر  
   - عناصر مهم در تصویر  
   - سبک بصری، رنگ‌ها و حس کلی  
   - پیشنهاد نسبت تصویر (مثلاً 1:1 برای پست، 9:16 برای ریلز/استوری)

قوانین کلی:
- همیشه دقیقا طبق دستور و ساختاری که در «پیام کاربر» آمده عمل کن. اگر کاربر قالب، تعداد، یا مراحل مشخص کرد، همان را رعایت کن.
- خروجی را فقط به همان زبانی بده که متن کاربر یا پرامپتی که به تو می‌رسد درخواست کرده؛ اغلب «فارسی» و گاهی «انگلیسی برای پرامپت طراحی».
- متن را خوش‌خوان، تمیز، منظم و آماده‌ی کپی‌پیست بنویس؛ از توضیح اضافهٔ متای مثل «این یک کپشن است» یا «این‌ها تیترها هستند» خودداری کن، مگر خود متن ورودی خواسته باشد.
- از حاشیه رفتن، نصیحت اضافه و جملات کلی و تکراری پرهیز کن. روی نتیجه‌ی کاربردی و حرفه‌ای تمرکز کن.
- اگر ورودی درباره‌ی کپشن است روی هوک، بدنه و CTA تمرکز کن؛ اگر درباره‌ی تیتر است فقط تیترهای کوتاه و خلاق بده؛ اگر درباره‌ی پرامپت طراحی است فقط توضیح تصویری دقیق ارائه کن.
`.trim();

  try {
    let rawAnswer = null;
    let lastError = null;

    // حلقه‌ی fallback روی چند مدل Groq
    for (const model of GROQ_MODELS) {
      try {
        console.log("Calling Groq model:", model);

        const response = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [
                {
                  role: "system",
                  content: systemPrompt,
                },
                {
                  role: "user",
                  content: userMessage,
                },
              ],
              temperature: 0.7,
              max_tokens: 800,
            }),
          }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          console.error("Groq error on model", model, data);
          lastError =
            data?.error?.message ||
            `Groq API error with model ${model}`;
          // برو سراغ مدل بعدی
          continue;
        }

        rawAnswer =
          data?.choices?.[0]?.message?.content ||
          null;

        if (rawAnswer) {
          console.log("Groq model used successfully:", model);
          break; // از حلقه بیا بیرون، چون جواب گرفتیم
        }
      } catch (err) {
        console.error("Groq request failed on model", model, err);
        lastError = err?.message || String(err);
        // می‌رویم سراغ مدل بعدی
        continue;
      }
    }

    if (!rawAnswer) {
      const msg =
        lastError ||
        "هیچ‌کدام از مدل‌های Groq نتوانستند پاسخ بدهند. لطفاً کمی بعد دوباره تلاش کنید.";
      return res.status(500).json({ ok: false, error: msg });
    }

    const answer = cleanAnswer(rawAnswer);

    // خروجی استاندارد برای فرانت و ایتا (تغییر نکرده)
    return res.status(200).json({ ok: true, answer });
  } catch (err) {
    console.error("Internal error:", err);
    return res.status(500).json({
      ok: false,
      error: "خطای داخلی سرور. کمی بعد دوباره تلاش کن.",
    });
  }
}
