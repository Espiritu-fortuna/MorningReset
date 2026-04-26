# MorningReset

Pixel-first offline PWA for the morning routine.

## Features
- installable standalone PWA via GitHub Pages or local static hosting
- portrait-first UI tuned for Pixel
- bundled offline audio with timer cue fallback
- wake lock during the full session
- auto mode and manual mode
- silent 5-second intro window at session start
- silent 2-second post-announcement delay before movement starts
- previous, pause/resume, next, restart-current, stop, and in-session jump
- offline shell and bundled audio cached by the service worker
- global and per-exercise pace controls
- morning presets: standard, day 6 lighter, day 7 rest

## Local use
Open `index.html` through a static host or GitHub Pages, then install from Chrome on Pixel if desired.

## Note on voice
This build prefers bundled prerecorded audio and falls back to device speech only when a phrase asset is missing.
