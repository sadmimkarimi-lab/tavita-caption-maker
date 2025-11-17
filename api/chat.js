// api/chat.js

// تمیز کردن خروجی: کمی مرتب‌تر برای نمایش داخل حباب
function cleanAnswer(text) {
  if (!text || typeof text !== "string") {
    return "نتوانستم پاسخی تولید کنم.";
  }

  let t = text.trim();

  // نرمال‌سازی خط‌ها
  t = t.replace(/\r\n/g, "\n");

  // حداکثر دو خط خالی پشت سر هم
  t = t.replace(/\n{3,}/g, "\n\n");

  return t;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Only POST allowed." });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("GROQ_API_KEY تعریف نشده است.");
    return res
      .status(500)
      .json({ ok: false, error: "کلید Groq روی سرور تنظیم نشده است." });
  }

  // ورودی را از بدنه بخوانیم (چند حالت مختلف مثل قبل)
  const userMessage =
    req.body?.text || // فرانت کپشن‌ساز: { text: "..." }
    req.body?.message || // اگر جایی { message: "..." } فرستاده شود
    req.body?.message?.text || // حالت وبهوک شبیه ایتا
    null;

  if (!userMessage || typeof userMessage !== "string") {
    return res
      .status(400)
      .json({ ok: false, error: "پیام کاربر ارسال نشده است." });
  }

  try {
    // هر درخواست مستقل است؛ بدون حافظه
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          temperature: 0.6,
          max_tokens: 500,
          messages: [
            {
              role: "system",
              content: `
تو یک دستیار تخصصی «تولید کپشن، تیتر و متن شبکه‌های اجتماعی» برای آکادمی طاویتا هستی.

ماموریتت:
- کمک به تولید کپشن حرفه‌ای، تیتر جذاب، CTA قوی، و پیشنهاد هشتگ‌های مناسب.
- متن‌ها را طوری بنویس که برای اینستاگرام و شبکه‌های اجتماعی ایرانی مناسب باشد.

قوانین:
- هر درخواست را مستقل در نظر بگیر؛ به پیام‌های قبلی دسترسی نداری.
- معمولاً کاربر از تو کپشن، متن، تیتر، ایده محتوا یا پرامپت برای طراحی می‌خواهد.
- بر اساس بهترین اصول نگارش کپشن و متن شبکه‌های اجتماعی (هوک، بدنه جذاب، کال‌تو‌اکشن، هشتگ‌های مناسب) جواب بده؛ مگر این‌که کاربر چیز دیگری خواسته باشد.
- اگر کاربر مشخصات دقیق داده (پلتفرم، لحن، هدف، مخاطب و...) حتماً آن‌ها را رعایت کن.
- متن‌ها را واضح، خوش‌خوان و کاربردی بنویس؛ از پرحرفی و پاراگراف‌های خیلی طولانی خودداری کن.
- در صورت نیاز می‌توانی از بولت‌پوینت استفاده کنی.
- لحن: صمیمی، محترمانه و حرفه‌ای.
              `.trim(),
            },
            {
              role: "user",
              content: userMessage,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("Groq API error:", response.status, errorText);
      return res.status(500).json({
        ok: false,
        error: "خطا در ارتباط با مدل هوش مصنوعی. کمی بعد دوباره امتحان کن.",
      });
    }

    const data = await response.json().catch(() => ({}));
    const rawAnswer = data?.choices?.[0]?.message?.content || "";
    const answer = cleanAnswer(rawAnswer);

    return res.status(200).json({ ok: true, answer });
  } catch (err) {
    console.error("Internal error:", err);
    return res.status(500).json({
      ok: false,
      error: "خطای داخلی سرور. کمی بعد دوباره تلاش کن.",
    });
  }
}
