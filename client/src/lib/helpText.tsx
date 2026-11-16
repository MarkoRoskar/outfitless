import type { ReactNode } from 'react'

// The "how this page works" text behind each page's ⓘ, kept here so it's all in one place to edit.
// A few short points per page, saying what the page is for and what can be done on it.
export const helpText: Record<string, { title: string; points: ReactNode[] }> = {
  home: {
    title: 'Home',
    points: [
      <><b>Next up</b> is the next workout of the routine you follow. Start it here, or Skip it to move on to the one after.</>,
      'The numbers show how many workouts you did this week, in total, and how long ago the last one was.',
      <><b>Most recent workouts</b> lists your latest sessions. Tap one to see its sets, or use ⋯ to correct them.</>,
    ],
  },
  workouts: {
    title: 'Workouts',
    points: [
      'A workout is the list of exercises you do in one session, like Push Day.',
      'Tap a workout to open it, add exercises and set their sets, reps and weight.',
      'Drag the grip on the left to change the order. Use ⋯ to rename or delete.',
      <>Use <b>+ New</b> to create a workout. It opens straight away so you can add its exercises.</>,
    ],
  },
  workout: {
    title: 'This workout',
    points: [
      <>Add exercises with <b>+ New</b>, in the order you’ll do them. Drag the grip to reorder.</>,
      <>Each exercise has a <b>target</b>: the weight and reps to aim for next time. Tap a card to see its plan.</>,
      'After each session the target updates by itself: your heaviest set that reached the minimum reps becomes the new target, going over the rep range adds the increment, and missing the minimum on every set takes it off.',
      <><b>Start workout</b> begins a session. <b>Progress</b> at the bottom charts how each exercise has gone.</>,
    ],
  },
  routines: {
    title: 'Routines',
    points: [
      'A routine is your workouts in the order you rotate through them, like Push, Pull, Legs.',
      <><b>Follow</b> a routine and Home shows its next workout. Finishing that workout moves it on to the next one.</>,
      'Only one routine is followed at a time. Following another one switches to it.',
      'Drag the grip to reorder your routines. Use ⋯ to edit or delete.',
    ],
  },
  exercises: {
    title: 'Exercises',
    points: [
      'Your library of exercises, like Bench Press or Pull-up. Each one can be used in any number of workouts.',
      'Search by name, sort, or filter by muscle group. Tap a card to see its note.',
      'Renaming an exercise renames it everywhere, past workouts included.',
      'An exercise that a workout still uses can’t be deleted. Remove it from those workouts first.',
    ],
  },
  history: {
    title: 'History',
    points: [
      'Every workout you finished, newest first. Filter by workout or by date.',
      'Tap a workout to see each set. A dash marks a set you didn’t tick off.',
      <>Use ⋯ to <b>edit</b> a workout’s sets. Editing your latest session of a workout also updates its targets.</>,
      'Only your latest 1,000 workouts are kept.',
    ],
  },
  session: {
    title: 'Workout in progress',
    points: [
      'Fill in the reps and weight you did, then tick the set. Ticked sets are saved right away.',
      'Under each set, Last time shows what you did before, or Target what to aim for.',
      'Ticking a set starts the rest timer. It beeps when it’s time for the next set.',
      <><b>Finish workout</b> saves it and updates your targets. You can leave and come back, and <b>Discard</b> throws it away.</>,
    ],
  },
  settings: {
    title: 'Settings',
    points: [
      'Change your password. Your other devices are logged out, this one stays logged in. Forgot it? The dialog can email you a reset link.',
      'Turn the rest timer’s beep on or off. It’s saved on this device only.',
      <><b>Delete account</b> removes your account and everything in it for good.</>,
    ],
  },
}
