// pages/api/chat.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: "GROQ_API_KEY در تنظیمات سرور تعریف نشده است." });
  }

  // ✅ فقط این یکی اضافه شده: لیست چند مدل برای fallback
  const GROQ_MODELS = [
    "llama-3.3-70b-versatile", // اصلی
    "llama-3.1-8b-instant",    // پشتیبان ۱
    "mixtral-8x7b-32768",      // پشتیبان ۲
  ];

  // بدنهٔ درخواست را بخوان
  let payload = req.body;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch (e) {
      return res.status(400).json({ error: "فرمت بدنهٔ درخواست معتبر نیست." });
    }
  }

  // mode از فرانت می‌آید: "caption" | "hook" | "cover"
  // اگر نیامده باشد، سعی می‌کنیم از روی فیلدها حدس بزنیم
  let mode = payload.mode || payload.section;

  if (!mode) {
    if (payload.mainTopic || payload.MAIN_TOPIC) {
      mode = "cover";
    } else if (payload.topic || payload.hookTopic || payload.subject) {
      mode = "hook";
    } else {
      mode = "caption"; // پیش‌فرض
    }
  }

  // برای امنیت، فقط سه مقدار مجاز
  const allowedModes = ["caption", "hook", "cover"];
  if (!allowedModes.includes(mode)) {
    mode = "caption";
  }

  // ساخت پرامپت بر اساس mode
  let userPrompt = "";
  let systemPrompt =
    "تو یک دستیار هوش مصنوعی فارسی‌زبان هستی. خروجی را فقط به زبان فارسی و تمیز و قابل کپی بنویس.";

  if (mode === "caption") {
    // -------- کپشن کامل برای پست --------
    const idea = payload.idea || payload.IDEA || "";
    const platform = payload.platform || payload.PLATFORM || "اینستاگرام";
    const tone = payload.tone || payload.TONE || "صمیمی و محاوره‌ای";
    const formality =
      payload.formality || payload.FORMALITY || "نیمه‌رسمی و قابل فهم";
    const goal = payload.goal || payload.GOAL || "جلب تعامل (کامنت و ذخیره)";
    const length = payload.length || payload.LENGTH || "متوسط";
    const audience =
      payload.audience || payload.AUDIENCE || "عموم مردم و کسب‌وکارهای کوچک";

    userPrompt = `
تو یک کپی‌رایتر و استراتژیست حرفه‌ای شبکه‌های اجتماعی هستی.

وظیفهٔ تو نوشتن یک «کپشن کامل و آمادهٔ انتشار» برای پستی است که من توضیح می‌دهم.
کپشن باید خلاقانه، خوش‌خوان، طبیعی و شبیه یک کپشن حرفه‌ای اینستاگرامی باشد؛
هم جذاب باشد، هم واضح و هم به هدفی که مشخص می‌کنم کمک کند.

«اطلاعات ورودی کاربر»
- ایده یا توضیح پست: ${idea}
- پلتفرم: ${platform}
- لحن متن: ${tone}
- سطح رسمی بودن: ${formality}
- هدف کپشن: ${goal}
- طول متن: ${length}
- مخاطب هدف: ${audience}

«ساختار کپشن»
1. خط اول باید یک هوک/جمله شروع خیلی جذاب و درگیرکننده باشد که کاربر را مجبور کند ادامه را بخواند.
2. در ادامه، در ۲ تا ۴ پاراگراف کوتاه، موضوع را ساده و روان توضیح بده. از مثال، سؤال یا تجربه استفاده کن تا خواننده ارتباط بگیرد.
3. براساس "${goal}" یک CTA کاملاً واضح و کاربردی اضافه کن؛ مثلاً دعوت به کامنت، ذخیره، اشتراک‌گذاری، خرید، پیام خصوصی و...
4. در صورت مناسب بودن پلتفرم، در انتهای کپشن یک بلوک هشتگ مرتبط بنویس:
   - اگر طول متن «کوتاه» است: ۵ تا ۸ هشتگ  
   - اگر طول متن «متوسط» است: ۸ تا ۱۲ هشتگ  

قوانین مهم:
- تمام متن را به زبان فارسی روان و طبیعی بنویس.
- از اموجی در حد معقول استفاده کن، نه در حد شلوغ شدن متن.
- کپشن را طوری بنویس که کاربر فقط با کمی ویرایش بتواند مستقیم در پیجش منتشر کند.
- خروجی فقط خود کپشن باشد؛ هیچ توضیح اضافی مثل «این کپشن است» قبل یا بعدش ننویس.
    `;
  } else if (mode === "hook") {
    // -------- تیتر و هوک برای شروع کپشن --------
    const topic =
      payload.topic || payload.hookTopic || payload.subject || "موضوع دلخواه";
    const style =
      payload.style ||
      payload.tone ||
      "کوتاه، کنجکاوبرانگیز و متناسب با اینستاگرام";

    userPrompt = `
تو یک کپی‌رایتر خفن و متخصص نوشتن «تیتر و هوک» برای شبکه‌های اجتماعی هستی.

«اطلاعات ورودی کاربر»
- موضوع یا درد مخاطب: ${topic}
- سبک تیتر: ${style}

خروجی مورد انتظار:
- ۱۰ تیتر/هوک خیلی جذاب و کوتاه برای شروع کپشن یا روی کاور پست.
- هر تیتر حداکثر یک خط باشد و تا حد ممکن مشخص، کنجکاوبرانگیز و مربوط به موضوع باشد.
- از کلی‌گویی و جملات تکراری مثل «فروش ندارم، حالا چی؟» تا حد امکان دوری کن؛ سعی کن خلاق، متفاوت و دقیق بنویسی.
- می‌توانی در صورت مناسب بودن سبک، از اموجی محدود استفاده کنی، اما متن باید قابل استفاده روی کاور باشد.

فرمت خروجی:
۱. تیتر اول
۲. تیتر دوم
۳. تیتر سوم
...
۱۰. تیتر دهم

فقط همین لیست تیترها را بنویس؛ هیچ توضیح اضافی قبل یا بعدش ننویس.
    `;
  } else if (mode === "cover") {
    // -------- پرامپت برای طراحی کاور / بنر --------
    const mainTopic = payload.mainTopic || payload.MAIN_TOPIC || "";
    const details = payload.details || payload.DETAILS || "";
    const visualStyle =
      payload.visualStyle ||
      payload.VISUAL_STYLE ||
      "مدرن، مینیمال و خوانا برای شبکه‌های اجتماعی";

    userPrompt = `
تو یک طراح گرافیک خلاق و در عین حال «نویسندهٔ پرامپت حرفه‌ای» برای ابزارهای طراحی و هوش مصنوعی هستی
(مثل Midjourney, DALL·E, Leonardo, Canva و ...).

وظیفهٔ تو این است که بر اساس اطلاعات کاربر، یک «توضیح کامل و دقیق برای طراحی کاور/بنر» بسازی؛
توضیحی که هم برای طراح گرافیک انسانی قابل فهم باشد و هم بتوان آن را مستقیماً به ابزارهای هوش مصنوعی داد.

«اطلاعات ورودی کاربر»
- موضوع و پیام اصلی تصویر: ${mainTopic}
- جزئیات مهم و الزامی (اختیاری): ${details || "کاربر جزئیات خاصی ذکر نکرده است."}
- حس و سبک بصری: ${visualStyle}

«دستورالعمل ساخت پرامپت»
1. ابتدا در یک یا دو جمله، موضوع اصلی و پیام تصویر را شفاف توضیح بده.
2. ترکیب‌بندی کلی تصویر را توصیف کن؛ مثلاً:
   - چه عناصری در مرکز تصویر باشند؟
   - پس‌زمینه چگونه باشد؟ (ساده، شلوغ، بافت‌دار، استودیویی، محیط واقعی و...)
   - آیا متن روی تصویر وجود دارد یا نه؟ اگر بله، جای تقریبی متن و تیتر را به‌صورت کلی توضیح بده (بدون نوشتن متن دقیق).
3. حس و استایل بصری را دقیقا مطابق با "${visualStyle}" توضیح بده؛ مثلاً:
   - نوع رنگ‌ها (گرم/سرد، پاستلی، نئونی، خنثی و...)
   - میزان کنتراست، نورپردازی و حال‌وهوای کلی (شاد، جدی، رسمی، دوستانه، لوکس، تکنولوژیک و...).
4. اگر در جزئیات مهم، موردی ذکر شده بود، آن‌ها را حتماً به‌عنوان اجزای ضروری در توضیح بیاور
   (مثلاً حضور لوگو، نمایش محصول، استفاده از یک نماد خاص، جای خالی برای متن و...).
5. در انتها در یک خط کوتاه، فرمت و نسبت تصویر را پیشنهاد بده؛
   مثلاً: «مناسب کاور پست اینستاگرام مربع ۱:۱» یا «کاور ریلز عمودی ۹:۱۶» یا «بنر افقی ۱۶:۹».

قوانین مهم:
- متن را به زبان فارسی روان و قابل فهم برای طراح بنویس.
- از bullet point یا جمله‌های کوتاه پشت سر هم استفاده کن تا خواندنش برای طراح آسان باشد.
- هیچ نمونه متن تبلیغاتی داخل تصویر ننویس (تیتر یا کپشن کامل ننویس)، فقط توضیح گرافیکی بده.
- خروجی فقط همین «توضیح طراحی» باشد؛ هیچ جملهٔ اضافی مثل «این یک پرامپت است» قبل یا بعدش ننویس.
    `;
  }

  try {
    // ✅ این بخش عوض شده: حلقه روی چند مدل به‌جای یک مدل ثابت
    let text = "";
    let lastError = null;

    for (const model of GROQ_MODELS) {
      try {
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
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              temperature: mode === "hook" ? 0.9 : 0.75,
              max_tokens: 1024,
            }),
          }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          console.error("Groq API error with model", model, data);
          lastError = data;
          continue; // برو مدل بعدی
        }

        text =
          data.choices?.[0]?.message?.content?.trim() ||
          "";

        if (text) {
          console.log("✅ Groq model used:", model);
          break;
        }
      } catch (err) {
        console.error("Groq request failed with model", model, err);
        lastError = err;
        continue;
      }
    }

    if (!text) {
      return res.status(500).json({
        error:
          lastError?.error?.message ||
          "هیچ‌کدام از مدل‌های هوش مصنوعی نتوانستند پاسخ بدهند.",
      });
    }

    return res.status(200).json({
      mode,
      text,
    });
  } catch (err) {
    console.error("API handler error:", err);
    return res
      .status(500)
      .json({ error: "خطای غیرمنتظره در سرور رخ داد.", details: err.message });
  }
}
