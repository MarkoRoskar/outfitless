# outFITless

A workout tracker that plans your next session for you. Log every set as you go, and after each
workout outFITless adjusts each exercise's target: more weight when you go over your rep range,
less when you can't reach it.

## What it does

- **Exercises**: your library of movements, with muscle groups and notes.
- **Workouts**: lists of exercises with sets, rep ranges, a target weight and rest times.
- **Routines**: workouts in the order you rotate through them. Follow one and Home shows what's next.
- **Workout in progress**: log reps and weight per set, with a rest timer and last time's numbers.
- **History**: every finished workout, filterable by workout and date, with personal records
  marked and sets that can be corrected later.
- **Progress**: charts of each exercise's heaviest weight and best reps over time.
- **Settings**: change your password, mute the rest timer, delete your account.

## Project layout

| Folder | What's in it |
|---|---|
| `client/` | The app: React 19, TypeScript, Vite, Tailwind CSS 4, React Router, Zustand, Recharts |
| `server/` | The API: Node, Express 5, MongoDB with Mongoose, Zod, JWT login, Resend for email |

## Running it locally

You need Node.js and a MongoDB database (local or MongoDB Atlas).

1. **Server**: create `server/.env` with these variables:

   | Variable | What it is |
   |---|---|
   | `MONGO_URL` | Connection string of your MongoDB database |
   | `JWT_SECRET` | A long random string used to sign logins |
   | `PORT` | Port the API listens on. The client expects `5000`. |
   | `CLIENT_URL` | Address of the client, used in email links. Defaults to `http://localhost:5173`. |
   | `EMAIL_PROVIDER` | How verification and password emails are sent: `gmail` or `resend` (the default) |
   | `GMAIL_USER` | With Gmail: the Gmail address emails are sent from |
   | `GMAIL_APP_PASSWORD` | With Gmail: an app password for that account (see below), not its normal password |
   | `RESEND_API_KEY` | With Resend: API key from [Resend](https://resend.com). Needs a domain verified there to email anyone but yourself. |
   | `EMAIL_FROM` | Optional sender, like `outFITless <hello@yourdomain.com>`. With Gmail it defaults to the Gmail address. |

   To send with Gmail, turn on 2-step verification for the account, then create an app password
   at https://myaccount.google.com/apppasswords and put its 16 characters in `GMAIL_APP_PASSWORD`.

   Then start it:

   ```sh
   cd server
   npm install
   npm run dev
   ```

2. **Client**, in a second terminal:

   ```sh
   cd client
   npm install
   npm run dev
   ```

   Open http://localhost:5173. The client sends `/api` requests to the server on port 5000
   (see `client/vite.config.ts`).

## Scripts

| Where | Command | What it does |
|---|---|---|
| client | `npm run dev` | Starts the app with live reload |
| client | `npm run build` | Type-checks and builds the app into `dist/` |
| client | `npm run preview` | Serves the built app, to check the production build |
| client | `npm run lint` | Checks the code with ESLint |
| server | `npm run dev` | Starts the API and restarts it when a file changes |

## Where things are

- `client/src/pages/`: one file per page.
- `client/src/components/`: shared pieces like dialogs, dropdowns, the navbar and the History list.
- `client/src/lib/styles.ts`: the shared Tailwind class strings (buttons, cards, fields).
- `client/src/lib/helpText.tsx`: the text behind each page's ⓘ button.
- `client/src/index.css`: the colors, fonts and chart colors.
- `server/src/modules/`: one folder per part of the API (auth, exercises, workouts, routines,
  sessions), each with its routes, controller, service, model and validation.
- `server/src/modules/session/session.service.ts`: how targets change after a workout
  (`nextCurrentNumbers`) and how personal records are found (`withRecords`).
