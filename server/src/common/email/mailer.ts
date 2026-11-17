import fs from 'fs'
import path from 'path'
import nodemailer from 'nodemailer'
import { env } from '../../config/env'
import { LOGO_CID, renderEmail } from './template'
import type { EmailContent } from './template'

// Emails go out through the Gmail account's web API over HTTPS. Free hosts like Render block
// SMTP, the usual way to send, but not HTTPS. The email really comes from the Gmail address
// through Google's servers, so other inboxes trust it at once. It signs in with a refresh token
// made once with scripts/get-gmail-token.mjs.

// How long sending may take before it counts as failed, so a request never waits on it for long
const SEND_TIMEOUT_MS = 10_000

// The logo shown at the top of every email, attached to it and shown from there (see template.ts).
// It's in server/assets, which is three folders up from here, both in src and in a dist build.
const logo = fs.readFileSync(path.resolve(__dirname, '../../../assets/email-logo.png'))

// Builds the finished email (with the logo attached) without sending it
const composer = nodemailer.createTransport({ streamTransport: true, buffer: true })

// An access token lasts about an hour, so one is kept and renewed shortly before it runs out
let accessToken: { value: string; expiresAt: number } | null = null

const getAccessToken = async () => {
  if (accessToken && Date.now() < accessToken.expiresAt) return accessToken.value
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: env.GMAIL_CLIENT_ID!,
      client_secret: env.GMAIL_CLIENT_SECRET!,
      refresh_token: env.GMAIL_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`Google sign-in failed (${res.status}): ${await res.text()}`)
  const data = (await res.json()) as { access_token: string; expires_in: number }
  accessToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 }
  return accessToken.value
}

// Sends one email in the app's design and says whether it was accepted. A failure is logged with the reason.
const sendEmail = async (to: string, subject: string, content: EmailContent) => {
  try {
    if (!env.GMAIL_USER || !env.GMAIL_CLIENT_ID || !env.GMAIL_CLIENT_SECRET || !env.GMAIL_REFRESH_TOKEN) {
      throw new Error('GMAIL_USER, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and GMAIL_REFRESH_TOKEN must be set in .env')
    }
    const { message } = await composer.sendMail({
      from: `outFITless <${env.GMAIL_USER}>`,
      to,
      subject,
      ...renderEmail(content),
      attachments: [{ filename: 'outfitless.png', content: logo, cid: LOGO_CID }],
    })
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { authorization: `Bearer ${await getAccessToken()}`, 'content-type': 'application/json' },
      body: JSON.stringify({ raw: (message as Buffer).toString('base64url') }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    })
    if (!res.ok) throw new Error(`Gmail answered ${res.status}: ${await res.text()}`)
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
