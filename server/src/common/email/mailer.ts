import fs from 'fs'
import path from 'path'
import nodemailer from 'nodemailer'
import { Resend } from 'resend'
import { env } from '../../config/env'
import { LOGO_CID, renderEmail } from './template'
import type { EmailContent } from './template'

interface Email {
  to: string
  subject: string
  html: string
  // A plain-text version, which helps the email reach the inbox rather than spam
  text: string
}

// The logo shown at the top of every email, attached to it and shown from there (see template.ts).
// It's in server/assets, which is three folders up from here, both in src and in a dist build.
const logo = fs.readFileSync(path.resolve(__dirname, '../../../assets/email-logo.png'))

// One way of sending. Returns an error message, or null when the email was accepted.
type Sender = (email: Email) => Promise<string | null>

// Through a Gmail account over SMTP, signed in with an app password
const gmailSender = (): Sender => {
  if (!env.GMAIL_USER || !env.GMAIL_APP_PASSWORD) {
    return async () => 'GMAIL_USER and GMAIL_APP_PASSWORD must be set in .env'
  }
  const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD },
  })
  // Gmail always sends from the account's own address, so that's the default
  const from = env.EMAIL_FROM ?? `outFITless <${env.GMAIL_USER}>`
  return async (email) => {
    await transport.sendMail({
      from,
      ...email,
      attachments: [{ filename: 'outfitless.png', content: logo, cid: LOGO_CID }],
    })
    return null
  }
}

// Through Resend. It doesn't throw when it refuses an email (like the test sender writing to
// someone other than the account owner); it returns an error.
const resendSender = (): Sender => {
  if (!env.RESEND_API_KEY) {
    return async () => 'RESEND_API_KEY must be set in .env'
  }
  const resend = new Resend(env.RESEND_API_KEY)
  const from = env.EMAIL_FROM ?? 'outFITless <onboarding@resend.dev>'
  return async (email) => {
    const { error } = await resend.emails.send({
      from,
      ...email,
      attachments: [{ filename: 'outfitless.png', content: logo, contentId: LOGO_CID }],
    })
    return error ? error.message : null
  }
}

const send: Sender = env.EMAIL_PROVIDER === 'gmail' ? gmailSender() : resendSender()

// Sends one email in the app's design and says whether it was accepted. A failure is logged with the reason.
const sendEmail = async (to: string, subject: string, content: EmailContent) => {
  try {
    const error = await send({ to, subject, ...renderEmail(content) })
    if (error) {
      console.error(`Email "${subject}" was not sent:`, error)
      return false
    }
    return true
  } catch (err) {
    console.error(`Email "${subject}" was not sent:`, err instanceof Error ? err.message : err)
    return false
  }
}

export const sendVerificationEmail = async (to: string, token: string) =>
  sendEmail(to, 'Verify your email', {
    preview: 'One click and your account is ready.',
    heading: 'Verify your email',
    intro: 'Thanks for signing up! Confirm this is your email address and you can start planning your workouts.',
    buttonLabel: 'Verify email',
    url: `${env.CLIENT_URL}/verify-email?token=${token}`,
    note: "This link expires in 24 hours. If you didn't sign up for outFITless, you can ignore this email.",
  })

export const sendPasswordResetEmail = async (to: string, token: string) =>
  sendEmail(to, 'Reset your password', {
    preview: 'Choose a new password for your account.',
    heading: 'Reset your password',
    intro: 'Someone asked to reset the password for your outFITless account. If it was you, choose a new one below.',
    buttonLabel: 'Reset password',
    url: `${env.CLIENT_URL}/reset-password?token=${token}`,
    note: "This link expires in 1 hour. If you didn't ask for this, ignore this email and your password stays the same.",
  })
