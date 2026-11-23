# Kalimat

A web app for keeping a choir's Arabic song lyrics: right-to-left text in Arial, works offline, and installs on an iPhone home screen or an e-reader browser.

## Features

- Add a song by title and singer; lyrics are looked up automatically (LRCLIB, then lyrics.ovh) and only accepted when title and singer match
- Edit lyrics by hand; your edits are never overwritten by automatic searches
- Song lists (setlists) in a chosen order, for concerts and rehearsals
- Export the whole songbook or one list to a Word (.docx) file with a cover page, linked table of contents and one song per page
- Google sign-in for editors; a shared view-only code for members (no account needed)
- Backup export / import (JSON)

Built with plain JavaScript and Firebase (Hosting, Firestore, Auth). No build step.

## Setup

1. Create a Firebase project with Firestore, Google sign-in and Anonymous sign-in enabled.
2. Put your project's web config in `public/firebase-config.js` and its id in `.firebaserc`.
3. `cp firestore.rules.example firestore.rules` and fill in the editors' Gmail addresses and a member code.
4. `cp public/site.example.js public/site.js` and set your group's name.
5. Deploy:

```bash
firebase deploy --only hosting,firestore:rules
```

## Credits

Created by [JustWanderer42](https://github.com/JustWanderer42), built with [Claude](https://claude.com/claude-code).
