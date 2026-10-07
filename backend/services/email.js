const sendVerificationCode = async (email, code) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  if (!apiKey) {
    console.log(`\n==================================================`);
    console.log(`[STIMZZYVIBE EMAIL] Verification Code for ${email}: [ ${code} ]`);
    console.log(`==================================================\n`);
    return;
  }

  let response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [email],
        subject: 'Your StimzzyVibe verification code',
        text: `Your StimzzyVibe verification code is ${code}. It expires in 15 minutes.`,
        html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #7D1128;border-radius:12px;background:#0D0407;color:#F9F6F0">
          <h1 style="color:#7D1128;margin-bottom:8px">Welcome to StimzzyVibe</h1>
          <p style="color:#A89CA2">Use this secure 6-digit verification code to confirm your email:</p>
          <div style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#D4AF6A;margin:24px 0;text-align:center">${code}</div>
          <p style="color:#6D7280;font-size:12px">This code expires in 15 minutes. If you did not request it, you can safely ignore this email.</p>
        </div>`,
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    console.error('[Email] Resend request could not be completed:', error.message);
    console.log(`[FALLBACK DEV] Verification code for ${email}: ${code}`);
    return;
  }

  if (!response.ok) {
    console.error(`[Email] Resend rejected the verification email (HTTP ${response.status}).`);
    console.log(`[FALLBACK DEV] Verification code for ${email}: ${code}`);
  }
};

const sendPasswordResetOtp = async (email, code) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  if (!apiKey) {
    console.log(`\n==================================================`);
    console.log(`[STIMZZYVIBE EMAIL] Password Reset OTP for ${email}: [ ${code} ]`);
    console.log(`==================================================\n`);
    return;
  }

  let response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [email],
        subject: 'StimzzyVibe Password Reset OTP',
        text: `Your StimzzyVibe password reset OTP is ${code}. It expires in 15 minutes.`,
        html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #7D1128;border-radius:12px;background:#0D0407;color:#F9F6F0">
          <h1 style="color:#7D1128;margin-bottom:8px">StimzzyVibe Password Recovery</h1>
          <p style="color:#A89CA2">We received a request to reset your password. Enter this secure OTP code:</p>
          <div style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#D4AF6A;margin:24px 0;text-align:center">${code}</div>
          <p style="color:#6D7280;font-size:12px">This code expires in 15 minutes. Never share this code with anyone.</p>
        </div>`,
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    console.error('[Email] Resend request could not be completed:', error.message);
    console.log(`[FALLBACK DEV] Password reset OTP for ${email}: ${code}`);
    return;
  }

  if (!response.ok) {
    console.error(`[Email] Resend rejected reset email (HTTP ${response.status}).`);
    console.log(`[FALLBACK DEV] Password reset OTP for ${email}: ${code}`);
  }
};

module.exports = { sendVerificationCode, sendPasswordResetOtp };
