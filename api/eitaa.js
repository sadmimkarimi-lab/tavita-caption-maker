// api/eitaa.js

const BOT_TOKEN = process.env.EITAA_BOT_TOKEN;
const API_BASE = BOT_TOKEN
  ? `https://api.eitaa.com/bot${BOT_TOKEN}`
  : null;

// ارسال پیام به ایتا
async function sendMessage(chat_id, text) {
  if (!API_BASE) {
    console.error("EITAA_BOT_TOKEN تعریف نشده است.");
    return;
  }

  try {
    await fetch(`${API_BASE}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id, text }),
    });
  } catch (err) {
    console.error("خطا در ارسال پیام به ایتا:", err);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    // برای تست ساده
    return res.status(200).send("OK");
  }

  const update = req.body || {};
  const msg = update.message;
  if (!msg) {
    return res.status(200).json({ ok: true });
  }

  const chatId = msg.chat?.id;
  const text = msg.text || "";

  if (!chatId) {
    return res.status(200).json({ ok: true });
  }

  // شروع ربات
  if (text === "/start") {
    await sendMessage(
      chatId,
      "سلام 👋 من طاویتا هستم؛ دستیار هوشمند تولید محتوا در ایتا."
    );
    await sendMessage(
      chatId,
      "ایده پست، توضیح محصول یا هدفت رو بنویس؛ من برات کپشن و تیترهای جذاب می‌سازم 🌿"
    );
    return res.status(200).json({ ok: true });
  }

  // ارسال پیام کاربر به /api/chat روی همین دامین
  try {
    const origin =
      req.headers["x-forwarded-host"] ||
      req.headers.host ||
      "";

    const protocol =
      req.headers["x-forwarded-proto"] || "https";

    const baseUrl = origin
      ? `${protocol}://${origin}`
      : "";

    const apiResponse = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    const data = await apiResponse.json().catch(() => ({}));

    const reply =
      data?.answer ||
      data?.message ||
      "نتونستم جواب بگیرم 😔 لطفاً بعداً دوباره امتحان کن.";

    await sendMessage(chatId, reply);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("خطا در اتصال به /api/chat:", err);
    await sendMessage(
      chatId,
      "❌ خطا در اتصال به سرور. کمی بعد دوباره تلاش کن."
    );
    return res.status(200).json({ ok: false });
  }
}
