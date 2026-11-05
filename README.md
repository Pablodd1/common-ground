# Common Ground

A private, full-stack employee community for the people behind the job titles.

## Included

- Kimi account sign-in and persistent employee profiles
- Community posts with topics, photos, camera capture, and voice notes
- Likes and threaded replies
- People search by name, role, location, and outside-work interests
- One-to-one text, image, and audio messages with automatic refresh
- Birthday and work-anniversary timelines with one-click celebration posts
- Birthday-year and location privacy controls
- Responsive desktop navigation and mobile bottom navigation
- Clearly marked sample profiles and posts for first-run exploration

Direct messages have no manager dashboard. This is not an anonymity or encryption guarantee: service administrators may still access stored data when required.

## Run

```bash
npm install
npm run db:push
npx tsx db/seed.ts
npm run dev
```

The app runs on port 3000. Production verification:

```bash
npm run check
npm run build
npm start
```

Uploaded media is stored in platform object storage; only object keys and ownership metadata are stored in MySQL. Presigned media URLs are created on demand and are never persisted.
