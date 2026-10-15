import { Resend } from 'resend'
import type { EmailContent, QuestionSpec, UsageGuide, WeeklyResult } from '@/lib/cycle/engine'
import type { WeeklyLinks } from '@/lib/cycle/steps'

/**
 * Emails of the consumption cycle. Kept in a separate file so the existing
 * emails in resend.ts are not touched.
 *
 * Deliberately SAME STYLE as sendFollowupEmail (which lands in Gmail Primary):
 * one white card, plain text, underlined text links, order number in the subject,
 * no buttons, no coloured boxes, no hidden preheader, plus a plain-text version.
 * These are the signals that keep a transactional email out of the Promotions tab.
 */

// Created on first send, not at import time: the build must not need RESEND_API_KEY
let resendClient: Resend | null = null
function resend(): Resend {
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY)
  return resendClient
}
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
    .map((p) => `<p style="font-size:14px;color:#334155;margin:0 0 14px;line-height:1.6;">${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

function guideHtml(guide: UsageGuide): string {
  if (!guide?.items?.length) return ''
  const items = guide.items
    .map(
      (it) => `
      <p style="font-size:14px;font-weight:700;color:#0F172A;margin:16px 0 4px;">${esc(it.title)}</p>
      ${it.steps.map((s) => `<p style="font-size:14px;color:#64748B;margin:0 0 3px;line-height:1.55;">&ndash; ${esc(s)}</p>`).join('')}`,
    )
    .join('')
  const together = guide.together
    ? `<p style="font-size:14px;color:#64748B;margin:14px 0 0;line-height:1.55;"><strong style="color:#0F172A;">Together:</strong> ${esc(guide.together)}</p>`
    : ''
  return `
      <h1 style="font-size:19px;font-weight:800;color:#0F172A;margin:24px 0 0;line-height:1.3;">How to use your products</h1>
      ${items}
      ${together}`
}

function questionHtml(q: QuestionSpec, answerUrl: (questionId: string, optionIndex: number) => string): string {
  if (!q?.options?.length) return ''
  const links = q.options
    .map(
      (o, i) =>
        `<p style="margin:0 0 10px;font-size:15px;line-height:1.5;"><a href="${answerUrl(q.id, i)}" style="color:#7C5CFC;font-weight:700;text-decoration:underline;">&rarr; ${esc(o.label)}</a></p>`,
    )
    .join('')
  return `
      <h1 style="font-size:19px;font-weight:800;color:#0F172A;margin:28px 0 8px;line-height:1.3;">${esc(q.question)}</h1>
      <p style="font-size:14px;color:#64748B;margin:0 0 14px;line-height:1.6;">Tap your answer — that's all, it's saved instantly.</p>
      ${links}`
}

function footer(brandName: string): string {
  return `
    <p style="font-size:11px;color:#94A3B8;text-align:center;margin:0 0 6px;">${esc(brandName)}</p>
    <p style="font-size:11px;color:#94A3B8;text-align:center;margin:0;">
      Powered by <a href="${MALYTE_SITE}" style="color:#7C5CFC;text-decoration:none;font-weight:600;">Malyte</a>
    </p>`
}

function welcomeText(p: Omit<WelcomeEmailParams, 'to'>): string {
  const lines: string[] = [p.email.body.trim(), '']
  if (p.usageGuide?.items?.length) {
    lines.push('HOW TO USE YOUR PRODUCTS', '')
    for (const it of p.usageGuide.items) {
      lines.push(it.title, ...it.steps.map((s) => `- ${s}`), '')
    }
    if (p.usageGuide.together) lines.push(`Together: ${p.usageGuide.together}`, '')
  }
  if (p.question?.options?.length) {
    lines.push(p.question.question, 'Tap your answer:', '')
    p.question.options.forEach((o, i) => lines.push(`${o.label}: ${p.answerUrl(p.question.id, i)}`))
    lines.push('')
  }
  lines.push(`${p.brandName} · Powered by Malyte`)
  return lines.join('\n')
}

type WelcomeEmailParams = {
  to: string
  brandName: string
  orderNumber?: string | null
  email: EmailContent
  usageGuide: UsageGuide
  question: QuestionSpec
  answerUrl: (questionId: string, optionIndex: number) => string
  pageUrl: string
}

/** Builds the welcome email (HTML + plain text). Also usable for previews in the dashboard. */
export function renderCycleWelcomeEmail(params: Omit<WelcomeEmailParams, 'to'>): { subject: string; html: string; text: string } {
  const { brandName, orderNumber, email, usageGuide, question, answerUrl } = params
  const orderTag = orderNumber
    ? `<span style="font-size:14px;font-weight:500;color:#94A3B8;"> &middot; Order ${esc(orderNumber)}</span>`
    : ''
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F7FA;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="margin-bottom:24px;">
      <span style="font-size:22px;font-weight:800;color:#0F172A;">${esc(brandName)}</span>${orderTag}
    </div>
    <div style="background:#fff;border-radius:16px;border:1px solid #E8EDF8;padding:28px;margin-bottom:20px;">
      ${paragraphs(email.body)}
      ${guideHtml(usageGuide)}
      ${questionHtml(question, answerUrl)}
    </div>
    ${footer(brandName)}
  </div>
</body>
</html>`

  // Transactional subject tied to the order, like the classic follow-up email
  const subject = orderNumber
    ? `How to use your order ${orderNumber} \u00b7 ${brandName}`
    : (email.subject || `How to use your ${brandName} order`)
  return { subject: subject.slice(0, 120), html, text: welcomeText(params) }
}

export async function sendCycleWelcomeEmail(params: WelcomeEmailParams) {
  const { subject, html, text } = renderCycleWelcomeEmail(params)
  const { error } = await resend().emails.send({
    from: buildFrom(params.brandName),
    to: params.to,
    subject,
    html,
    text,
  })
  if (error) throw new Error(`Resend error: ${error.message}`)
}

// ─────────────────────────────────────────────────────────────
// Weekly email
// ─────────────────────────────────────────────────────────────

const h1 = (text: string, top = 26) =>
  `<h1 style="font-size:19px;font-weight:800;color:#0F172A;margin:${top}px 0 8px;line-height:1.3;">${esc(text)}</h1>`
const muted = (text: string) => `<p style="font-size:14px;color:#64748B;margin:0 0 12px;line-height:1.6;">${esc(text)}</p>`
const arrowLink = (href: string, label: string) =>
  `<p style="margin:0 0 10px;font-size:15px;line-height:1.5;"><a href="${href}" style="color:#7C5CFC;font-weight:700;text-decoration:underline;">&rarr; ${esc(label)}</a></p>`

function weeklyQuestionHtml(q: QuestionSpec, answerUrl: (questionId: string, optionIndex: number) => string): string {
  if (!q?.options?.length) return ''
  if (q.type === 'scale') {
    const nums = q.options
      .map((o, i) => `<a href="${answerUrl(q.id, i)}" style="color:#7C5CFC;font-weight:800;font-size:18px;text-decoration:underline;padding:0 10px 0 0;">${esc(o.label)}</a>`)
      .join('')
    const legend = q.scaleLabels
      ? `<p style="font-size:12px;color:#94A3B8;margin:6px 0 0;">1 = ${esc(q.scaleLabels.low)} &middot; 5 = ${esc(q.scaleLabels.high)}</p>`
      : ''
    return `${h1(q.question)}<p style="margin:0;line-height:1.8;">${nums}</p>${legend}`
  }
  return `${h1(q.question)}${muted('Tap your answer — it is saved instantly.')}${q.options.map((o, i) => arrowLink(answerUrl(q.id, i), o.label)).join('')}`
}

type WeeklyEmailParams = {
  to: string
  brandName: string
  week: number
  result: WeeklyResult
  links: WeeklyLinks
  answerUrl: (questionId: string, optionIndex: number) => string
  pageUrl: string
  runningLowUrl: string
  stopUrl: string
}

export function renderCycleWeeklyEmail(p: Omit<WeeklyEmailParams, 'to'>): { subject: string; html: string; text: string } {
  const { brandName, week, result, links, answerUrl, pageUrl, runningLowUrl, stopUrl } = p
  const refillHtml = links.refill
    ? `${h1(result.refill?.state === 'now' ? 'Time to restock' : 'Running low soon')}${arrowLink(links.refill.url || pageUrl, `Reorder ${links.refill.title}`)}`
    : ''
  const recsHtml = links.recommendations.length
    ? `${h1('To go further')}${links.recommendations
        .map((r) => `${arrowLink(r.url || pageUrl, r.title)}<p style="font-size:13px;color:#64748B;margin:-4px 0 14px;line-height:1.55;">${esc(r.reason)}</p>`)
        .join('')}`
    : ''
  const questionsHtml = (result.emailQuestions || []).map((q) => weeklyQuestionHtml(q, answerUrl)).join('')

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F7FA;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="margin-bottom:24px;">
      <span style="font-size:22px;font-weight:800;color:#0F172A;">${esc(brandName)}</span><span style="font-size:14px;font-weight:500;color:#94A3B8;"> &middot; Week ${week}</span>
    </div>
    <div style="background:#fff;border-radius:16px;border:1px solid #E8EDF8;padding:28px;margin-bottom:20px;">
      ${paragraphs(result.email?.body || '')}
      ${result.usageTip ? `${h1(result.usageTip.title, 14)}${muted(result.usageTip.body)}` : ''}
      ${refillHtml}
      ${recsHtml}
      ${questionsHtml}
      <p style="font-size:13px;margin:22px 0 0;"><a href="${runningLowUrl}" style="color:#64748B;text-decoration:underline;">I'm running low</a></p>
    </div>
    ${footer(brandName)}
    <p style="font-size:11px;color:#94A3B8;text-align:center;margin:8px 0 0;">
      <a href="${stopUrl}" style="color:#94A3B8;text-decoration:underline;">Stop these weekly emails</a>
    </p>
  </div>
</body>
</html>`

  const lines: string[] = [(result.email?.body || '').trim(), '']
  if (result.usageTip) lines.push(result.usageTip.title.toUpperCase(), result.usageTip.body, '')
  if (links.refill) lines.push(`Reorder ${links.refill.title}: ${links.refill.url || pageUrl}`, '')
  if (links.recommendations.length) {
    lines.push('TO GO FURTHER')
    for (const r of links.recommendations) lines.push(`${r.title}: ${r.url || pageUrl}`, r.reason)
    lines.push('')
  }
  for (const q of result.emailQuestions || []) {
    lines.push(q.question)
    q.options.forEach((o, i) => lines.push(`${o.label}: ${answerUrl(q.id, i)}`))
    lines.push('')
  }
  lines.push(`I'm running low: ${runningLowUrl}`, `Stop these weekly emails: ${stopUrl}`, '', `${brandName} · Powered by Malyte`)

  const subject = result.refill?.state === 'now' && links.refill
    ? `Running low on ${links.refill.title}? \u00b7 ${brandName}`
    : `Week ${week}: ${result.usageTip?.title || 'your next tip'} \u00b7 ${brandName}`
  return { subject: subject.slice(0, 120), html, text: lines.join('\n') }
}

export async function sendCycleWeeklyEmail(params: WeeklyEmailParams) {
  const { subject, html, text } = renderCycleWeeklyEmail(params)
  const { error } = await resend().emails.send({
    from: buildFrom(params.brandName),
    to: params.to,
    subject,
    html,
    text,
  })
  if (error) throw new Error(`Resend error: ${error.message}`)
}
