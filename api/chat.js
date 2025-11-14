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

  // حذف فاصله‌های اضافه در انتهای هر خط
  const lines = t.split("\n").map((line) => line.replace(/\s+$/g, ""));
  return lines.join("\n");
}

export default async function handler(req, res) {
  // فقط POST
  if (req.method !== "POST") {
    return res.status(200).send("OK");
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY تعریف نشده");
    return res
      .status(500)
      .json({ ok: false, error: "کلید OpenAI روی سرور تنظیم نشده است." });
  }

  // ورودی را از بدنه بخوانیم (چند حالت مختلف)
  const userMessage =
    req.body?.text ||      // فرانت کپشن‌ساز: { text: "..." }
    req.body?.message ||   // اگر جایی { message: "..." } فرستاده شود
    req.body?.message?.text || // حالت وبهوک شبیه ایتا
    null;

  if (!userMessage || typeof userMessage !== "string") {
    return res
      .status(400)
      .json({ ok: false, error: "پیام کاربر ارسال نشده است." });
  }

  try {
    // هر درخواست مستقل است؛ بدون حافظه
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `
تو دستیار هوشمند فارسی‌زبان طاویتا هستی.

قوانین:
- هر درخواست را مستقل در نظر بگیر؛ به پیام‌های قبلی دسترسی نداری.
- معمولاً کاربر از تو کپشن، متن، تیتر، ایده محتوا یا پرامپت برای طراحی می‌خواهد.
- بر اساس بهترین اصول نگارش کپشن و متن شبکه‌های اجتماعی (هوک، بدنه، CTA، هشتگ‌های مناسب) جواب بده؛ مگر این‌که کاربر چیز دیگری خواسته باشد.
- اگر کاربر مشخصات دقیق داده (پلتفرم، لحن، هدف، مخاطب و...) حتماً آن‌ها را رعایت کن.
- کوتاه، واضح و خوش‌خوان بنویس؛ از پاراگراف‌های خیلی بلند و پرحرفی خودداری کن.
- اگر لازم بود، می‌توانی بولت‌پوینت (با - در ابتدای خط) استفاده کنی.
- لحن: محترمانه، صمیمی و حرفه‌ای.
            `.trim(),
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
        temperature: 0.6,
        max_tokens: 500,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI error:", data);
      const msg =
        data?.error?.message ||
        "پاسخی از OpenAI دریافت نشد، لطفاً دوباره تلاش کنید.";
      return res
        .status(500)
        .json({ ok: false, error: `خطا از سمت OpenAI: ${msg}` });
    }

    const rawAnswer =
      data?.choices?.[0]?.message?.content ||
      "نتوانستم پاسخی تولید کنم، لطفاً دوباره تلاش کنید.";

    const answer = cleanAnswer(rawAnswer);

    // خروجی استاندارد برای فرانت و ایتا
    return res.status(200).json({ ok: true, answer });
  } catch (err) {
    console.error("Internal error:", err);
    return res
      .status(500)
      .json({
        ok: false,
        error: "خطای داخلی سرور. کمی بعد دوباره تلاش کن.",
      });
  }
}
