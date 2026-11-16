// The look of every email: a dark card in the app's colors with the logo, the outFITless wordmark,
// a heading, a short text, one bright green button and a small note. Email apps only support old
// HTML, so it's built from tables with inline styles, and the logo is an attached PNG (most email
// apps don't show SVG). The plain-text version goes along for apps that don't show HTML.

// Referenced as cid:<LOGO_CID> in the HTML; the mailer attaches the image under this id
export const LOGO_CID = 'outfitless-logo'

const colors = {
  page: '#000000',
  card: '#141414',
  border: '#262626',
  text: '#F5F5F5',
  muted: '#9C9C9C',
  accent: '#AFFA00',
}

const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

// Text from the app goes into HTML, so it's escaped
const escape = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export interface EmailContent {
  // Shown in the inbox list next to the subject, before the email is opened
  preview: string
  heading: string
  intro: string
  buttonLabel: string
  url: string
  // A small line under the button, like when the link expires
  note: string
}

export const renderEmail = ({ preview, heading, intro, buttonLabel, url, note }: EmailContent) => {
  const link = escape(url)

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>${escape(heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:${colors.page};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escape(preview)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${colors.page};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">

          <tr>
            <td align="center" style="padding-bottom:24px;">
              <img src="cid:${LOGO_CID}" width="56" height="61" alt="" style="display:block;border:0;">
              <div style="margin-top:12px;font-family:${font};font-size:24px;font-weight:800;letter-spacing:-0.5px;color:${colors.text};">
                out<span style="color:${colors.accent};">FIT</span>less
              </div>
            </td>
          </tr>

          <tr>
            <td style="background-color:${colors.card};border:1px solid ${colors.border};border-radius:20px;padding:32px 28px;">
              <h1 style="margin:0 0 12px;font-family:${font};font-size:22px;line-height:1.3;font-weight:700;color:${colors.text};">
                ${escape(heading)}
              </h1>
              <p style="margin:0 0 28px;font-family:${font};font-size:15px;line-height:1.6;color:${colors.muted};">
                ${escape(intro)}
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-radius:12px;background-color:${colors.accent};">
                    <a href="${link}" style="display:inline-block;padding:13px 26px;font-family:${font};font-size:15px;font-weight:600;color:#000000;text-decoration:none;border-radius:12px;">
                      ${escape(buttonLabel)}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:28px 0 0;font-family:${font};font-size:13px;line-height:1.6;color:${colors.muted};">
                ${escape(note)}
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 12px 0;font-family:${font};font-size:12px;line-height:1.6;color:${colors.muted};text-align:center;">
              If the button doesn't work, copy this link into your browser:<br>
              <a href="${link}" style="color:${colors.muted};text-decoration:underline;word-break:break-all;">${link}</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `outFITless\n\n${heading}\n\n${intro}\n\n${buttonLabel}: ${url}\n\n${note}`

  return { html, text }
}
