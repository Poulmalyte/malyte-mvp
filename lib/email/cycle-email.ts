import { Resend } from 'resend'
import type { EmailContent, QuestionSpec, UsageGuide } from '@/lib/cycle/engine'

/**
 * Emails of the consumption cycle. Kept in a separate file so the existing
 * emails in resend.ts are not touched. Same sender, same look.
 */

const resend = new Resend(process.env.RESEND_API_KEY)
const MALYTE_SITE = 'https://www.malyte.com/shopify/home'
const SENDER_ADDRESS = 'noreply@malyte.com'

function esc(v: string): string {
  return (v || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildFrom(brandName: string): string {
  const clean = (brandName || '').replace(/[<>"\\,;:\r\n]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 64)
  return clean ? `${clean} <${SENDER_ADDRESS}>` : `Malyte <${SENDER_ADDRESS}>`
}

/** Plain text from the model → paragraphs (blank line = new paragraph, single newline = <br>). */
function paragraphs(text: string): string {
  return (text || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="font-size:15px;color:#334155;margin:0 0 14px;line-height:1.6;">${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

function usageGuideBlock(guide: UsageGuide): string {
  if (!guide?.items?.length) return ''
  const items = guide.items
    .map(
      (it) => `
      <tr><td style="padding:0 0 14px;">
        <p style="font-size:14px;font-weight:700;color:#0F172A;margin:0 0 6px;">${esc(it.title)}</p>
        ${it.steps
          .map((s) => `<p style="font-size:14px;color:#475569;margin:0 0 4px;line-height:1.5;">&bull;&nbsp;${esc(s)}</p>`)
          .join('')}
      </td></tr>`,
    )
    .join('')
  const together = guide.together
    ? `<p style="font-size:13px;color:#5B21B6;background:#F5F3FF;border:1px solid #DDD6FE;border-radius:10px;padding:10px 12px;margin:4px 0 0;line-height:1.5;">${esc(guide.together)}</p>`
    : ''
  return `
    <div style="background:#fff;border-radius:16px;border:1px solid #E8EDF8;padding:24px;margin-bottom:16px;">
      <p style="font-size:12px;font-weight:700;color:#7C5CFC;margin:0 0 14px;text-transform:uppercase;letter-spacing:0.08em;">How to use your products</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;"><tbody>${items}</tbody></table>
      ${together}
    </div>`
}

function questionBlock(q: QuestionSpec, answerUrl: (questionId: string, optionIndex: number) => string): string {
  if (!q?.options?.length) return ''
  const isScale = q.type === 'scale'
  const buttons = q.options
    .map((o, i) =>
      isScale
        ? `<td align="center" style="padding:0 3px;"><a href="${answerUrl(q.id, i)}" style="display:block;width:44px;padding:12px 0;border-radius:10px;border:1px solid #DDD6FE;background:#F5F3FF;color:#5B21B6;font-weight:700;font-size:15px;text-decoration:none;">${esc(o.label)}</a></td>`
        : `<a href="${answerUrl(q.id, i)}" style="display:block;padding:12px 16px;margin:0 0 8px;border-radius:10px;border:1px solid #DDD6FE;background:#F5F3FF;color:#5B21B6;font-weight:600;font-size:14px;text-decoration:none;">${esc(o.label)}</a>`,
    )
    .join('')
  return `
    <div style="background:#fff;border-radius:16px;border:1px solid #E8EDF8;padding:24px;margin-bottom:16px;">
      <p style="font-size:16px;font-weight:800;color:#0F172A;margin:0 0 6px;line-height:1.4;">${esc(q.question)}</p>
      <p style="font-size:12px;color:#94A3B8;margin:0 0 14px;">One tap is enough.</p>
      ${isScale ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${buttons}</tr></table>` : buttons}
    </div>`
}

function footer(brandName: string): string {
  return `
    <p style="font-size:11px;color:#94A3B8;text-align:center;margin:0 0 6px;">${esc(brandName)}</p>
    <p style="font-size:11px;color:#94A3B8;text-align:center;margin:0;">
      Powered by <a href="${MALYTE_SITE}" style="color:#7C5CFC;text-decoration:none;font-weight:600;">Malyte</a>
    </p>`
}

type WelcomeEmailParams = {
  to: string
  brandName: string
  email: EmailContent
  usageGuide: UsageGuide
  question: QuestionSpec
  answerUrl: (questionId: string, optionIndex: number) => string
  pageUrl: string
}

/** Builds the welcome email HTML (also used for previews in the dashboard). */
export function renderCycleWelcomeEmail(params: Omit<WelcomeEmailParams, 'to'>): { subject: string; html: string } {
  const { brandName, email, usageGuide, question, answerUrl, pageUrl } = params
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F7FA;font-family:'Inter',Arial,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(email.preheader || '')}</span>
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="margin-bottom:20px;">
      <span style="font-size:22px;font-weight:800;color:#0F172A;">${esc(brandName)}</span>
    </div>
    <div style="background:#fff;border-radius:16px;border:1px solid #E8EDF8;padding:24px;margin-bottom:16px;">
      ${paragraphs(email.body)}
    </div>
    ${usageGuideBlock(usageGuide)}
    ${questionBlock(question, answerUrl)}
    <p style="font-size:12px;color:#94A3B8;text-align:center;margin:0 0 20px;">
      <a href="${pageUrl}" style="color:#7C5CFC;text-decoration:none;">Open your guide in the browser</a>
    </p>
    ${footer(brandName)}
  </div>
</body>
</html>`
  const subject = (email.subject || `Getting started with your ${brandName} order`).slice(0, 120)
  return { subject, html }
}

export async function sendCycleWelcomeEmail(params: WelcomeEmailParams) {
  const { subject, html } = renderCycleWelcomeEmail(params)
  const { error } = await resend.emails.send({
    from: buildFrom(params.brandName),
    to: params.to,
    subject,
    html,
  })
  if (error) throw new Error(`Resend error: ${error.message}`)
}
