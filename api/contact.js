// Vercel Serverless Function — 聯絡表單寄信 API
// 環境變數（在 Vercel 專案 Settings → Environment Variables 設定）：
//   SMTP_HOST   郵件伺服器主機（必填）
//   SMTP_PORT   埠號，預設 465
//   SMTP_SECURE 是否使用 SSL，預設 true；用 587/STARTTLS 時設為 "false"
//   SMTP_USER   寄件帳號（通常就是 service@chanting-green.com）
//   SMTP_PASS   帳號密碼（建議使用「應用程式密碼」，勿用主密碼）
//   MAIL_TO     收件信箱，預設與 SMTP_USER 相同
//   MAIL_FROM   顯示的寄件人，預設與 SMTP_USER 相同
"use strict";

const nodemailer = require("nodemailer");

// 簡易記憶體限流：同一信箱每 60 秒最多一封信
// （Serverless 為分散實例，此為軟性防護，避免惡意灌爆；一般流量完全足夠）
const rateLimit = new Map();

function validate(payload) {
  const name = (payload.name || "").trim();
  const email = (payload.email || "").trim();
  const phone = (payload.phone || "").trim();
  const message = (payload.message || "").trim();
  const errors = [];
  if (!name || name.length > 100) errors.push("name");
  if (!email || email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("email");
  if (phone.length > 50) errors.push("phone");
  if (!message || message.length > 5000) errors.push("message");
  return { name, email, phone, message, errors };
}

function buildMail({ name, email, phone, message }) {
  const lines = [
    `姓名 / Name：${name}`,
    `信箱 / Email：${email}`,
    `電話 / Phone：${phone || "—"}`,
    "",
    "訊息內容 / Message：",
    message,
  ];
  const text = lines.join("\n");
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e0e8e0;border-radius:10px;overflow:hidden">
    <div style="background:#1a5276;color:#fff;padding:16px 24px;font-size:18px;font-weight:bold">🌱 宸廷綠色工程｜網站聯絡表單</div>
    <div style="padding:24px">
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        <tr><td style="padding:6px 0;color:#666;width:90px">姓名</td><td style="padding:6px 0"><b>${escapeHtml(name)}</b></td></tr>
        <tr><td style="padding:6px 0;color:#666">信箱</td><td style="padding:6px 0"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
        <tr><td style="padding:6px 0;color:#666">電話</td><td style="padding:6px 0">${escapeHtml(phone || "—")}</td></tr>
        <tr><td style="padding:6px 0;color:#666">時間</td><td style="padding:6px 0">${new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}</td></tr>
      </table>
      <div style="margin-top:16px;padding:16px;background:#f4f7fa;border-radius:8px;white-space:pre-wrap;line-height:1.7">${escapeHtml(message)}</div>
    </div>
    <div style="background:#f4f7fa;padding:10px 24px;font-size:12px;color:#999">來自 eco-material.chanting-green.com 聯絡表單</div>
  </div>`;
  return { text, html };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  // 解析 body（Vercel 會自動 parse JSON body）
  const payload = req.body || {};
  if (typeof payload !== "object") {
    return res.status(400).json({ ok: false, error: "Invalid body" });
  }

  // Honeypot：人類看不見的欄位，機器人會填；填了就當成功、實際丟棄
  if (payload.website) {
    return res.status(200).json({ ok: true });
  }

  const { name, email, phone, message, errors } = validate(payload);
  if (errors.length) {
    return res.status(400).json({ ok: false, error: "Invalid input: " + errors.join(", ") });
  }

  // 限流：同一信箱 60 秒內重複送出直接拒絕
  const now = Date.now();
  const last = rateLimit.get(email) || 0;
  if (now - last < 60000) {
    return res.status(429).json({ ok: false, error: "Too many requests" });
  }
  rateLimit.set(email, now);
  if (rateLimit.size > 2000) {
    for (const [k, t] of rateLimit) if (now - t > 3600000) rateLimit.delete(k);
  }

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  if (!host || !user) {
    console.error("SMTP_HOST / SMTP_USER 未設定");
    return res.status(500).json({ ok: false, error: "Server not configured" });
  }

  const transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || "true") !== "false", // true=SSL(465)，false=STARTTLS(587)
    auth: { user, pass: process.env.SMTP_PASS || "" },
  });

  const { text, html } = buildMail({ name, email, phone, message });

  try {
    await transport.sendMail({
      from: `"宸廷綠色工程網站" <${process.env.MAIL_FROM || user}>`,
      to: process.env.MAIL_TO || user,
      replyTo: `"${name}" <${email}>`,
      subject: `[網站表單] ${name} 的聯絡訊息`,
      text,
      html,
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Send mail failed:", err.message);
    return res.status(500).json({ ok: false, error: "Send failed" });
  }
};
