import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM || "Xenon <no-reply@xenon.ai>";

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
});

// Verify SMTP connection on startup so config errors surface immediately
// instead of silently failing only when the first email is attempted.
if (smtpHost && smtpUser && smtpPass) {
  transporter.verify((err) => {
    if (err) {
      console.error("❌ SMTP connection failed:", err.message);
      console.error("   Check SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env");
    } else {
      console.log("✅ SMTP connection verified — email service ready");
    }
  });
} else {
  console.warn("⚠️ SMTP not configured — password reset emails will not be sent");
}

function buildResetEmailHtml({ username, resetUrl }) {
  const safeName = username ? String(username).replace(/</g, "&lt;").replace(/>/g, "&gt;") : "there";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Reset your password</title>
<style>
  body { font-family: Arial, sans-serif; background: #0b0b0b; margin: 0; padding: 0; }
  .card { max-width: 520px; margin: 40px auto; background: #111; border: 1px solid #222; border-radius: 14px; padding: 28px; color: #e5e5e5; }
  .title { font-size: 22px; margin: 0 0 12px; }
  .text { font-size: 14px; line-height: 1.6; color: #c7c7c7; }
  .btn { display: inline-block; margin-top: 18px; padding: 12px 18px; background: #f59e0b; color: #111; text-decoration: none; border-radius: 10px; font-weight: bold; }
  .muted { margin-top: 18px; font-size: 12px; color: #8a8a8a; }
  .url { word-break: break-all; color: #9ca3af; font-size: 12px; }
</style>
</head>
<body>
  <div class="card">
    <h1 class="title">Reset your Xenon password</h1>
    <p class="text">Hi ${safeName},</p>
    <p class="text">We received a request to reset your password. Click the button below to set a new password.</p>
    <a class="btn" href="${resetUrl}">Reset password</a>
    <p class="muted">This link will expire in 30 minutes. If you did not request this, you can ignore this email.</p>
    <p class="url">${resetUrl}</p>
  </div>
</body>
</html>`;
}

export async function sendResetPasswordEmail({ to, username, resetUrl }) {
  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new Error("SMTP configuration is missing");
  }

  const html = buildResetEmailHtml({ username, resetUrl });

  console.log(`📧 Sending password reset email to: ${to}`);
  console.log(`   SMTP: ${smtpUser} → ${smtpHost}:${smtpPort}`);
  console.log(`   Reset URL: ${resetUrl}`);

  try {
    const info = await transporter.sendMail({
      from: smtpFrom,
      to,
      subject: "Reset your Xenon password",
      html,
    });
    console.log(`✅ Password reset email sent. Message ID: ${info.messageId}`);
  } catch (err) {
    console.error(`❌ Failed to send password reset email to ${to}:`, err.message);
    throw err;   // re-throw so the controller can return a 500 instead of silent 200
  }
}
