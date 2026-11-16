import { Resend } from 'resend'
import { env } from '../../config/env'

const resend = new Resend(env.RESEND_API_KEY)

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const url = `${env.CLIENT_URL}/reset-password?token=${token}`

  await resend.emails.send({
    from: 'outFITless <onboarding@resend.dev>',
    to: email,
    subject: 'Reset your password',
    html: `
      <p>You requested a password reset.</p>
      <p><a href="${url}">Click here to reset your password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    `,
  })
}

export const sendVerificationEmail = async (email: string, token: string) => {
  const url = `${env.CLIENT_URL}/verify-email?token=${token}`

  await resend.emails.send({
    from: 'outFITless <onboarding@resend.dev>',
    to: email,
    subject: 'Verify your email',
    html: `
      <p>Thanks for signing up!</p>
      <p><a href="${url}">Click here to verify your email</a></p>
      <p>This link expires in 24 hours.</p>
    `,
  })
}
