// /api/chat.js

import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// لیست مدل‌ها برای فallback
const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-70b-versatile",
  "llama-3.1-8b-instant",
];

// تابع مشترک تماس با Groq با فallback
async function callGroqWithFallback(systemPrompt, userPrompt) {
  let lastError = null;

  for (const model of GROQ_MODELS) {
    try {
      console.log("Trying Groq model:", model);

      const completion = await groq.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 800,
      });

      const text =
        completion.choices?.[0]?.message?.content?.trim() ||
        "نتیجه‌ای از مدل دریافت نشد.";
      console.log("Groq model used:", model);
      return text;
    } catch (err) {
      console.error("Groq model failed:", model, err?.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error("هیچ مدلی از Groq جواب نداد.");
}

// پرامپت سیستم برای «کپشن کامل»
const CAPTION_SYSTEM_PROMPT = `
تو یک کپی‌رایتر و استراتژیست حرفه‌ای شبکه‌های اجتماعی هستی.
وظیفهٔ تو نوشتن یک «کپشن کامل و آمادهٔ انتشار» برای پستی است که من توضیح می‌دهم.
کپشن باید هم جذاب باشد، هم واضح و هم به هدفی که مشخص می‌کنم کمک کند.

«ساختار کپشن»
1. خط اول حتماً یک هوک / جمله شروع خیلی جذاب و درگیرکننده باشد که کاربر را مجبور کند ادامه را بخواند.
2. در ادامه، در ۲ تا ۴ پاراگراف کوتاه، موضوع را ساده و روان توضیح بده؛ از مثال، سؤال یا تجربه استفاده کن تا خواننده ارتباط بگیرد.
3. براساس هدف کپشن (مثلاً تعامل، ذخیره، فروش و...) یک CTA کاملاً واضح و کاربردی اضافه کن؛ مثل دعوت به کامنت، ذخیره، اشتراک‌گذاری، خرید، پیام خصوصی و ...
4. اگر پلتفرم اجازه می‌دهد، در انتهای کپشن یک بلوک هشتگ مرتبط بنویس:
   - کوتاه: ۵ تا ۸ هشتگ
   - متوسط: ۸ تا ۱۲ هشتگ
5. متن را کاملاً فارسی روان و قابل فهم برای «عموم مردم» بنویس (مگر این‌که مخاطب چیز دیگری باشد).
6. لحن، میزان رسمی‌بودن و طول متن را دقیقاً مطابق اطلاعات ورودی کاربر رعایت کن.
`;

// پرامپت سیستم برای «تیتر و هوک شروع کپشن»
const HOOK_SYSTEM_PROMPT = `
تو یک کپی‌رایتر خفن برای شبکه‌های اجتماعی هستی و تخصصت نوشتن
«تیترها و هوک‌های کوتاه و ضربه‌ای» برای شروع کپشن و کاور پست است.

قوانین:
- فقط تیترهای کوتاه و خفن بده، هر خط یک تیتر.
- از کلمات روزمره و قابل فهم استفاده کن.
- از دید و زبان خود مخاطب بنویس؛ طوری که بگوید «این دقیقاً مشکل منه!».
- بسته به موضوع، می‌توانی لحن کنجکاوبرانگیز، چالشی، احساسی یا شوخ‌طبع داشته باشی.
- از عدد، سؤال و تضاد (مثلاً: «همه فکر می‌کنند... اما…») هر جا لازم شد استفاده کن.
`;

// پرامپت سیستم برای «پرامپت طراحی کاور / بنر»
const DESIGN_SYSTEM_PROMPT = `
تو یک طراح گرافیک خلاق و در عین حال «نویسندهٔ پرامپت حرفه‌ای» برای ابزارهای طراحی
و هوش مصنوعی هستی (مثل Midjourney, DALL·E, Leonardo, Canva و ...).

وظیفهٔ تو این است که بر اساس اطلاعات کاربر، یک «توضیح کامل و دقیق برای طراحی کاور/بنر» بسازی؛
توضیحی که هم برای طراح گرافیک انسانی قابل فهم باشد و هم بتوان آن را مستقیماً به ابزارهای هوش مصنوعی داد.

«دستورالعمل ساخت پرامپت»
1. ابتدا در یک یا دو جمله، موضوع اصلی و پیام تصویر را شفاف توضیح بده.
2. سپس ترکیب‌بندی کلی تصویر را توصیف کن؛ مثلاً:
   - چه عناصری در مرکز تصویر باشند؟
   - پس‌زمینه چگونه باشد؟ (ساده، شلوغ، بافت‌دار، استودیویی، محیط واقعی و...)
   - آیا متن روی تصویر وجود دارد یا نه؟ اگر بله، جای تقریبی متن و تیتر را به‌صورت کلی توضیح بده (بدون نوشتن متن دقیق).
3. حس و استایل بصری را دقیقاً مطابق با سبک مورد نظر توضیح بده؛ مثلاً:
   - نوع رنگ‌ها (گرم/سرد، پاستلی، نئونی، خنثی و...)
   - میزان کنتراست، نورپردازی و حال‌وهوای کلی (شاد، جدی، رسمی، دوستانه، لوکس، تکنولوژیک و...).
4. اگر کاربر جزئیات مهمی داده (مثل حضور لوگو، نمایش محصول، استفاده از نماد خاص، جای خالی برای متن و...) آن‌ها را حتماً به‌عنوان اجزای ضروری در توضیح بیاور.
5. در انتها در یک خط کوتاه، فرمت و نسبت تصویر را پیشنهاد بده؛
   مثلاً: «مناسب کاور پست اینستاگرام مربع ۱:۱» یا «کاور ریلز عمودی ۹:۱۶» یا «بنر افقی ۱۶:۹».

قوانین مهم:
- متن را به زبان فارسی روان و قابل فهم برای طراح بنویس.
- از bullet point یا جمله‌های کوتاه پشت سر هم استفاده کن تا خواندنش برای طراح آسان باشد.
- هیچ متن تبلیغاتی داخل تصویر ننویس (تیتر یا کپشن کامل ننویس)، فقط توضیح گرافیکی بده.
- خروجی فقط همین «توضیح طراحی» باشد؛ هیچ جملهٔ اضافی مثل «این یک پرامپت است» قبل یا بعدش ننویس.
`;

// تشخیص مود بر اساس بدنهٔ درخواست
function detectMode(body) {
  if (body.section) {
    return body.section; // مثلاً "caption" | "hooks" | "design"
  }

  // اگر section نفرستادی، حدس بزنیم:
  if (body.idea || body.platform) return "caption";
  if (body.topic) return "hooks";
  if (body.mainTopic) return "design";

  return "caption";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST method is allowed" });
  }

  try {
    const body = req.body || {};
    const mode = detectMode(body);

    let systemPrompt = "";
    let userPrompt = "";

    if (mode === "caption") {
      // === کپشن کامل برای پست ===
      const {
        idea = "",
        platform = "",
        tone = "",
        formality = "",
        goal = "",
        length = "",
        audience = "",
      } = body;

      systemPrompt = CAPTION_SYSTEM_PROMPT;

      userPrompt = `
«اطلاعات ورودی کاربر برای کپشن»
- ایده یا توضیح پست: ${idea || "ذکر نشده"}
- پلتفرم: ${platform || "مثلاً اینستاگرام یا ایتا"}
- لحن متن: ${tone || "دلخواه"}
- سطح رسمی بودن: ${formality || "متوسط"}
- هدف کپشن: ${goal || "جلب تعامل"}
- طول متن: ${length || "متوسط"}
- مخاطب هدف: ${audience || "عموم مردم"}

بر اساس این اطلاعات، یک کپشن کامل و آماده انتشار بنویس.
`;

    } else if (mode === "hooks") {
      // === تیتر و هوک برای شروع کپشن ===
      const { topic = "", style = "" } = body;

      systemPrompt = HOOK_SYSTEM_PROMPT;

      userPrompt = `
برای موضوع زیر ۸ تا ۱۲ تیتر / هوک کوتاه و خفن پیشنهاد بده.
هر خط فقط یک تیتر باشد.

«موضوع یا درد مخاطب»
${topic || "مشکل مشخص نشده"}

«سبک تیتر»
${style || "کوتاه و کنجکاوبرانگیز"}
`;

    } else if (mode === "design") {
      // === پرامپت برای طراحی کاور / بنر ===
      const {
        mainTopic = "",
        details = "",
        visualStyle = "",
      } = body;

      systemPrompt = DESIGN_SYSTEM_PROMPT;

      userPrompt = `
«موضوع و پیام اصلی تصویر»
${mainTopic || "ذکر نشده"}

«جزئیات مهم (در صورت وجود)»
${details || "چیزی ذکر نشده؛ در صورت نیاز خودت پیشنهاد بده."}

«حس و سبک بصری مورد نظر»
${visualStyle || "مینیمال و تمیز"}
`;
    } else {
      return res.status(400).json({ error: "Invalid mode / section" });
    }

    const resultText = await callGroqWithFallback(systemPrompt, userPrompt);

    // فرمت خروجی که فرانت قبلی هم باهاش کار کند
    return res.status(200).json({ result: resultText });
  } catch (error) {
    console.error("API /api/chat error:", error);
    return res.status(500).json({
      error: "خطایی در پردازش درخواست رخ داد. لطفاً دوباره تلاش کن.",
    });
  }
}
