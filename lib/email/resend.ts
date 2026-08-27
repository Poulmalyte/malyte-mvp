import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.malyte.com'
const MALYTE_SITE = 'https://malyte.com'
const SENDER_ADDRESS = 'noreply@malyte.com'

/**
 * Rimuove i caratteri che romperebbero l'header From (RFC 5322)
 * e taglia a 64 char per sicurezza sui client email.
 */
function sanitizeDisplayName(name: string): string {
  return (name || '')
    .replace(/[<>"\\,;:\r\n]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 64)
}

function buildFrom(brandName: string): string {
  const clean = sanitizeDisplayName(brandName)
  return clean ? `${clean} <${SENDER_ADDRESS}>` : `Malyte <${SENDER_ADDRESS}>`
}

function footer(brandName: string): string {
  return `
    <p style="font-size:11px;color:#94A3B8;text-align:center;margin:0 0 6px;">
      ${brandName}
    </p>
    <p style="font-size:11px;color:#94A3B8;text-align:center;margin:0;">
      Powered by <a href="${MALYTE_SITE}" style="color:#7C5CFC;text-decoration:none;font-weight:600;">Malyte</a>
    </p>`
}

export async function sendPlanEmail({
  to, brandName, planUrl, customerSummary, replyTo,
}: {
  to: string, brandName: string, planUrl: string, customerSummary?: string, replyTo?: string
}) {
  return resend.emails.send({
    from: buildFrom(brandName),
    ...(replyTo ? { replyTo } : {}),
    to,
    subject: `Your first routine is waiting`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F7FA;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="margin-bottom:24px;">
      <span style="font-size:22px;font-weight:800;color:#0F172A;">${brandName}</span>
    </div>
    <div style="background:linear-gradient(135deg,#7C5CFC,#06B6D4);border-radius:16px;padding:28px;margin-bottom:20px;color:#fff;">
      <p style="font-size:12px;font-weight:600;opacity:0.8;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.08em;">Your personalised plan</p>
      <h1 style="font-size:22px;font-weight:800;margin:0 0 12px;line-height:1.3;">Your first week starts today</h1>
      ${customerSummary ? `<p style="font-size:14px;opacity:0.9;margin:0;line-height:1.5;">${customerSummary}</p>` : ''}
    </div>
    <div style="background:#fff;border-radius:12px;border:1px solid #E8EDF8;padding:20px;margin-bottom:16px;">
      <p style="font-size:14px;color:#64748B;margin:0 0 16px;line-height:1.6;">
        We analysed your answers and created a routine built around your specific needs. Your first week uses only the essentials — new products are introduced gradually as your skin adapts.
      </p>
      <a href="${planUrl}" style="display:block;text-align:center;padding:14px 24px;background:linear-gradient(135deg,#7C5CFC,#06B6D4);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;">
        View My Plan →
      </a>
    </div>
    <div style="background:#F5F3FF;border-radius:12px;border:1px solid #DDD6FE;padding:16px;margin-bottom:20px;">
      <p style="font-size:12px;color:#5B21B6;margin:0;line-height:1.6;">
        In 7 days we'll ask how things are going — your answers will improve your plan for week 2.
      </p>
    </div>
    ${footer(brandName)}
  </div>
</body>
</html>`,
  })
}

export async function sendCheckinReminderEmail({
  to, brandName, checkinUrl, weekNumber, planUrl, isSecondReminder = false, replyTo,
}: {
  to: string, brandName: string, checkinUrl: string, weekNumber: number, planUrl: string, isSecondReminder?: boolean, replyTo?: string
}) {
  const subject = isSecondReminder
    ? `Your updated plan is waiting`
    : `Your routine evolves with you — week ${weekNumber} check-in`

  const headline = isSecondReminder
    ? `Complete your check-in and unlock week ${weekNumber + 1}`
    : `Your skin has changed over the last 7 days`

  const body = isSecondReminder
    ? `We can't improve your routine without your feedback. It takes less than 2 minutes — answer 4 quick questions and we'll unlock your next personalised update.`
    : `Answer 4 quick questions and we'll improve your plan for next week. Your routine adapts based on how your skin is actually responding.`

  const cta = isSecondReminder ? `Complete Check-In` : `Update My Plan →`

  return resend.emails.send({
    from: buildFrom(brandName),
    ...(replyTo ? { replyTo } : {}),
    to,
    subject,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F7FA;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="margin-bottom:24px;">
      <span style="font-size:22px;font-weight:800;color:#0F172A;">${brandName}</span>
    </div>
    <div style="background:#fff;border-radius:16px;border:1px solid #E8EDF8;padding:28px;margin-bottom:20px;">
      <p style="font-size:12px;font-weight:600;color:#7C5CFC;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.08em;">Week ${weekNumber} check-in</p>
      <h1 style="font-size:22px;font-weight:800;color:#0F172A;margin:0 0 12px;line-height:1.3;">${headline}</h1>
      <p style="font-size:14px;color:#64748B;margin:0 0 20px;line-height:1.6;">${body}</p>
      <a href="${checkinUrl}" style="display:block;text-align:center;padding:14px 24px;background:linear-gradient(135deg,#7C5CFC,#06B6D4);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;">
        ${cta}
      </a>
    </div>
    <p style="font-size:12px;color:#94A3B8;text-align:center;margin:0 0 12px;">
      <a href="${planUrl}" style="color:#7C5CFC;text-decoration:none;">View your current plan</a>
    </p>
    ${footer(brandName)}
  </div>
</body>
</html>`,
  })
}

export async function sendInactiveEmail({
  to, brandName, checkinUrl, replyTo,
}: {
  to: string, brandName: string, checkinUrl: string, replyTo?: string
}) {
  return resend.emails.send({
    from: buildFrom(brandName),
    ...(replyTo ? { replyTo } : {}),
    to,
    subject: `We've paused your personalised journey`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F7FA;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="margin-bottom:24px;">
      <span style="font-size:22px;font-weight:800;color:#0F172A;">${brandName}</span>
    </div>
    <div style="background:#fff;border-radius:16px;border:1px solid #E8EDF8;padding:28px;margin-bottom:20px;">
      <h1 style="font-size:22px;font-weight:800;color:#0F172A;margin:0 0 12px;line-height:1.3;">Your personalised journey has been paused</h1>
      <p style="font-size:14px;color:#64748B;margin:0 0 20px;line-height:1.6;">
        Since we haven't heard from you in a while, we've paused your personalised journey. Whenever you're ready, you can pick up right where you left off.
      </p>
      <a href="${checkinUrl}" style="display:block;text-align:center;padding:14px 24px;background:linear-gradient(135deg,#7C5CFC,#06B6D4);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;">
        Resume My Journey →
      </a>
    </div>
    ${footer(brandName)}
  </div>
</body>
</html>`,
  })
}

export async function sendFollowupEmail({
  to, brandName, followupUrl, replyTo,
}: {
  to: string, brandName: string, followupUrl: string, replyTo?: string
}) {
  return resend.emails.send({
    from: buildFrom(brandName),
    ...(replyTo ? { replyTo } : {}),
    to,
    subject: `Get the most out of your ${brandName} order`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F7FA;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="margin-bottom:24px;">
      <span style="font-size:22px;font-weight:800;color:#0F172A;">${brandName}</span>
    </div>
    <div style="background:#fff;border-radius:16px;border:1px solid #E8EDF8;padding:28px;margin-bottom:20px;">
      <p style="font-size:12px;font-weight:600;color:#7C5CFC;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.08em;">Your order is confirmed</p>
      <h1 style="font-size:22px;font-weight:800;color:#0F172A;margin:0 0 12px;line-height:1.3;">Get a personalised routine for your products</h1>
      <p style="font-size:14px;color:#64748B;margin:0 0 20px;line-height:1.6;">
        Answer 4 quick questions and we'll build a routine specifically around what you just bought — so you get the best possible results from day one.
      </p>
      <a href="${followupUrl}" style="display:block;text-align:center;padding:14px 24px;background:linear-gradient(135deg,#7C5CFC,#06B6D4);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;">
        Build My Personalised Routine →
      </a>
    </div>
    <div style="background:#F5F3FF;border-radius:12px;border:1px solid #DDD6FE;padding:16px;margin-bottom:20px;">
      <p style="font-size:12px;color:#5B21B6;margin:0;line-height:1.6;">
        ✓ Free · Takes less than 2 minutes · Your plan is saved permanently
      </p>
    </div>
    ${footer(brandName)}
  </div>
</body>
</html>`,
  })
}