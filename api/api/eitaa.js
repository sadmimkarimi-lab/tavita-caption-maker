// api/eitaa.js
// نسخه مخصوص کپشن‌ساز تاویتا 🤖✨

// چون در ورسل ESModule استفاده می‌شود:
import fetch from "node-fetch";

const BOT_TOKEN = process.env.EITA_BOT_TOKEN; // از محیط ورسل می‌گیریم
const API_BASE = `https://api.eitaa.com/bot${BOT_TOKEN}`;

// تابع ارسال پیام به ایتا
async function sendMessage(chat_id, text) {
  try {
    await fetch(`${API_BASE}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id, text }),
    });
  } catch (e) {
    console.error("ارسال پیام به ایتا مشکل داشت:", e);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("OK");

  const update = req.body;
  const msg = update.message;

  if (!msg) return res.status(200).json({ ok: true });

  const chatId = msg.chat.id;
  const text = msg.text || "";

  // اگر کاربر /start بزند
  if (text === "/start") {
    await sendMessage(
      chatId,
      "سلام 👋\nمن *تاویتا کپشن‌ساز* هستم!\nمتن پستت رو بفرست تا برات چند کپشن حرفه‌ای بسازم ✨"
    );
    return res.status(200).json({ ok: true });
  }

  // ارسال پیام کاربر به هوش مصنوعی
  const aiResponse = await fetch(`${req.headers.origin}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }), // متن مستقیم فرستاده می‌شود
  }).then((r) => r.json());

  const answer =
    aiResponse?.answer || "نتونستم کپشن بسازم، دوباره امتحان کن 😔";

  // ارسال جواب به کاربر
  await sendMessage(chatId, answer);

  return res.status(200).json({ ok: true });
}
