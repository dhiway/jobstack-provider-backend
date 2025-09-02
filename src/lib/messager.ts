export interface SendSmsOptions {
  phoneNumber: string;
  message: string;
}

export async function sendSmsWithMsg91({
  phoneNumber,
  message,
}: SendSmsOptions) {
  const phone = phoneNumber.startsWith('+')
    ? phoneNumber.slice(1)
    : phoneNumber;
  const authKey = process.env.MSG91_AUTH_KEY!;
  const url = `https://control.msg91.com/api/v5/flow`;
  const body = JSON.stringify({
    template_id: process.env.MSG91_TEMPLATE_ID,
    short_url: 0,
    recipients: [
      {
        mobiles: phone,
        var: message,
      },
    ],
  });

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authkey: authKey,
    },
    body,
  });
  const response = await resp.text();
  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`MSG91 SMS send failed: ${errorText}`);
  }

  return response;
}
