// Run once to let the server send email through the Gmail API.
//
// 1. Put GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET (from Google Cloud, an OAuth client of type
//    "Desktop app") in server/.env.
// 2. From the server folder: node scripts/get-gmail-token.mjs
// 3. Open the printed link, sign in with the Gmail account emails should come from, and allow it.
// 4. Copy the printed GMAIL_REFRESH_TOKEN into server/.env and into the host's environment.
//
// It only asks to send email (gmail.send), not to read the inbox.
import http from 'node:http'
import 'dotenv/config'

const clientId = process.env.GMAIL_CLIENT_ID
const clientSecret = process.env.GMAIL_CLIENT_SECRET
if (!clientId || !clientSecret) {
  console.error('Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in server/.env first.')
  process.exit(1)
}

// Google sends the browser back to this little server on this computer after you allow access
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, redirectUri)
  const code = url.searchParams.get('code')
  if (!code) {
    res.end(url.searchParams.get('error') ?? 'Waiting for Google…')
    return
  }
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  const data = await tokenRes.json()
  if (!data.refresh_token) {
    res.end('Something went wrong, see the terminal.')
    console.error('No refresh token in Google\'s answer:', data)
  } else {
    res.end('Done. You can close this tab and go back to the terminal.')
    console.log(`\nAdd this to server/.env and to Render:\n\nGMAIL_REFRESH_TOKEN=${data.refresh_token}\n`)
  }
  server.close()
})

let redirectUri
server.listen(0, '127.0.0.1', () => {
  redirectUri = `http://127.0.0.1:${server.address().port}`
  const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  auth.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.send',
    // offline + consent make Google hand out a refresh token, which lasts until it's revoked
    access_type: 'offline',
    prompt: 'consent',
  })
  console.log(`Open this link and sign in with the Gmail account emails should come from:\n\n${auth}\n`)
})
