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
- Authenticated company-manual assistant grounded in public UNITEC USA Design website sources
- English and Spanish company answers with exact source links and per-user private history
- Browsable manual sections covering the company, products, logistics, contact details, and public policies
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

The company assistant retrieves relevant passages from a dated public-source snapshot before calling the platform AI model. It does not fine-tune a model or invent internal HR/staff knowledge. AI calls use server-only credentials, are billed to the site owner's quota, and are never retried automatically after a billed request fails. The public manual was retrieved on November 5, 2026; refresh `api/lib/company-manual.ts` when website content changes. Private internal policies should be added separately with an explicit visibility and review process.
