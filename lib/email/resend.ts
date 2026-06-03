import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = 'Malyte <onboarding@resend.dev>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.malyte.com'

export async function sendPlanEmail({
  to,
  brandName,
  planUrl,
  checkinUrl,
  customerSummary,
}: {
  to: string
  brandName: string
  planUrl: string
  checkinUrl?: string
  customerSummary?: string
}) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Your personalised plan from ${brandName} is ready`,
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
      <p style="font-size:12px;font-weight:600;opacity:0.8;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.08em;">Your personalised plan is ready</p>
      <h1 style="font-size:22px;font-weight:800;margin:0 0 12px;line-height:1.3;">Week 1 starts now</h1>
      ${customerSummary ? `<p style="font-size:14px;opacity:0.9;margin:0;line-height:1.5;">${customerSummary}</p>` : ''}
    </div>

    <div style="background:#fff;border-radius:12px;border:1px solid #E8EDF8;padding:20px;margin-bottom:16px;">
      <p style="font-size:14px;color:#64748B;margin:0 0 16px;line-height:1.6;">
        Your personalised routine is ready. It will adapt every week based on your progress — new products introduced at exactly the right moment.
      </p>
      <a href="${planUrl}" style="display:block;text-align:center;padding:14px 24px;background:linear-gradient(135deg,#7C5CFC,#06B6D4);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;">
        View my plan →
      </a>
    </div>

    <div style="background:#F5F3FF;border-radius:12px;border:1px solid #DDD6FE;padding:16px;margin-bottom:20px;">
      <p style="font-size:12px;font-weight:700;color:#7C5CFC;margin:0 0 6px;">How it works</p>
      <p style="font-size:12px;color:#5B21B6;margin:0;line-height:1.6;">
        Week 1 starts with only the essentials. After 7 days you'll receive a check-in — answer 4 quick questions and your plan updates automatically for Week 2.
      </p>
    </div>

    <p style="font-size:11px;color:#94A3B8;text-align:center;margin:0;">
      This plan was created by ${brandName} · <a href="${APP_URL}" style="color:#94A3B8;">app.malyte.com</a>
    </p>

  </div>
</body>
</html>
    `,
  })
}

export async function sendCheckinReminderEmail({
  to,
  brandName,
  checkinUrl,
  weekNumber,
  planUrl,
}: {
  to: string
  brandName: string
  checkinUrl: string
  weekNumber: number
  planUrl: string
}) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `Week ${weekNumber} check-in — how did your routine go?`,
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
      <h1 style="font-size:22px;font-weight:800;color:#0F172A;margin:0 0 12px;line-height:1.3;">How did your routine go this week?</h1>
      <p style="font-size:14px;color:#64748B;margin:0 0 20px;line-height:1.6;">
        Answer 4 quick questions and your plan will automatically update for Week ${weekNumber + 1} — with any adjustments based on how your skin responded.
      </p>
      <a href="${checkinUrl}" style="display:block;text-align:center;padding:14px 24px;background:linear-gradient(135deg,#7C5CFC,#06B6D4);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;">
        Complete Week ${weekNumber} check-in →
      </a>
    </div>

    <div style="background:#F0FDF4;border-radius:12px;border:1px solid #6EE7B7;padding:16px;margin-bottom:20px;">
      <p style="font-size:12px;color:#065F46;margin:0;line-height:1.6;">
        ✓ Takes less than 2 minutes · Your plan updates immediately after
      </p>
    </div>

    <p style="font-size:12px;color:#94A3B8;text-align:center;margin:0 0 8px;">
      <a href="${planUrl}" style="color:#7C5CFC;text-decoration:none;">View your current plan</a>
    </p>

    <p style="font-size:11px;color:#94A3B8;text-align:center;margin:0;">
      This plan was created by ${brandName} · <a href="${APP_URL}" style="color:#94A3B8;">app.malyte.com</a>
    </p>

  </div>
</body>
</html>
    `,
  })
}