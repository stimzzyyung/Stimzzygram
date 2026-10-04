const sendVerificationCode = async (email, code) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    const err = new Error('Email delivery is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.');
    err.status = 503;
    throw err;
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
        html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px"><h1>Welcome to StimzzyVibe</h1><p>Use this code to verify your email address:</p><p style="font-size:32px;font-weight:bold;letter-spacing:8px">${code}</p><p>This code expires in 15 minutes. If you did not request it, you can ignore this email.</p></div>`,
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    console.error('[Email] Resend request could not be completed.');
    const err = new Error('Could not reach the email service. Please try again.');
    err.status = 502;
    throw err;
  }

  if (!response.ok) {
    console.error(`[Email] Resend rejected the verification email (HTTP ${response.status}).`);
    const err = new Error('The verification email could not be sent. Check the Resend sender configuration.');
    err.status = 502;
    throw err;
  }
};

module.exports = { sendVerificationCode };
