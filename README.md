# SCP Anomaly Tracker: Field Command

A full-stack MERN application for community-sourced anomaly reporting, built in
the fiction of the SCP Foundation. Users register as Foundation personnel, browse
verified anomalies, submit sightings of unexplained phenomena, and earn rank
through contributions. Submissions become official records only after review by
an overseer.

**Stack:** MongoDB Atlas, Express 5, React 19 (Vite), Node.js
**API:** https://capstone-kgru.onrender.com
**Frontend:** https://scpdetect.netlify.app (deployment in progress; see Known
limitations; the application runs fully on localhost)

## The core loop

1. An agent registers and submits a **Potential Anomaly** title, description,
   optional image URL and coordinates. It enters the database as `pending` and
   earns the submitter 10 points.
2. An **overseer** reviews the queue and either verifies the report assigning
   an item number, object class, and containment procedures or rejects it.
3. Verification converts the record into a full SCP, visible to everyone, and
   awards the original submitter 50 points.
4. Points determine rank: Recruit → Field Agent → Containment Specialist →
   Site Director. Rank is **computed**, never stored.

## Architecture

```text
capstone/
├── backend/
│   ├── config/constants.js       points values, rank thresholds, rankForPoints()
│   ├── controllers/              route logic (auth, scps)
│   ├── db/conn.js                single mongoose connection
│   ├── middleware/               JWT protect, requireOverseer, error handler
│   ├── models/                   Scp, User, IncidentReport
│   ├── routes/                   auth, scps, users
│   ├── scripts/geo-check.mjs     geospatial validation harness
│   ├── seed.js                   15 SCPs, 2 pending reports, mock personnel
│   └── index.js                  entry point
└── frontend/
    ├── src/api/client.js         single fetch wrapper, attaches JWT
    ├── src/context/              AuthContext, AnomalyContext
    ├── src/components/NavBar.jsx
    └── src/pages/                Dashboard, Login, Submit, Command,
                                  Personnel, AccessDenied
```


## Database design

Three collections, referenced by ObjectId and resolved with `populate`.

**Pending reports and verified SCPs share one collection**, distinguished by a
`status` field (`pending` / `verified` / `rejected`). Verification is a one-field
update rather than a copy between collections, and the map queries one place.

This creates a problem: `itemNumber` must be unique, but a recruit's submission
doesn't have one yet and a plain unique index treats every missing value as
`null`, so the *second* pending report would collide with the first. The fix is a
**sparse unique index**, which skips documents lacking the field entirely.
Uniqueness is enforced among records that have item numbers; pending reports are
invisible to it.

Indexes:

| Collection | Index | Purpose |
|---|---|---|
| scps | `itemNumber` unique + sparse | uniqueness without blocking pending reports |
| scps | `status` | every dashboard and queue query filters on it |
| scps | `objectClass` | class filtering |
| scps | `lastSeenLocation` 2dsphere | `$near` proximity queries |
| users | `username` unique | login lookup |
| incidentreports | `scp` + `occurredAt` desc | sightings per anomaly, newest first |

`encounterCount` and `points` are deliberately **not** indexed; both are
write-heavy counters, and at this scale index maintenance would cost more than
faster reads would save.

## Authentication and authorization

JWT with bcrypt-hashed passwords. Several decisions are worth calling out:

- **`role` is never read from the request body.** Registration always creates an
  `agent`; overseers are seeded directly in the database. Accepting a role from
  the client would let anyone grant themselves verification power.
- **`passwordHash` uses `select: false`** so it is excluded from every query by
  default, plus a `toJSON` transform that strips it from responses. The login
  controller opts back in explicitly with `.select('+passwordHash')`.
- **Login failures return one message** for both unknown username and wrong
  password, and a dummy bcrypt comparison runs when no user is found so the two
  paths take the same amount of time. Different messages or timings let an
  attacker enumerate valid usernames.
- **`protect` re-fetches the user on every request** rather than trusting the
  token payload, so a change to an account's role or status takes effect
  immediately instead of when the token expires.
- **Personnel status is enforced at both doors.** An account flagged MIA or
  Deceased is rejected at login *and* on every subsequent request, so an
  already-issued token dies the moment the account is flagged.
- Passwords are capped at 72 bytes bcrypt silently truncates beyond that, so
  a longer password would create a false sense of strength.

## What took the most time

Not the features the guard rails around them. The verification endpoint is
maybe fifteen lines of logic wrapped in far more validation: item number present,
object class valid, containment procedures written, record not already verified,
requester actually an overseer, item number not already taken. Each check exists
because the alternative is a corrupt record or an escalation path.

The same pattern held throughout. Sightings can't be logged against unverified
reports. The roster returns an explicit field whitelist rather than whole user
documents, so `role` and `isSeeded` never reach the client. Coordinates are
range-validated on the way in. `$inc` is used for counters so two concurrent
updates can't overwrite each other. Getting the happy path working took an
afternoon; making it hard to misuse took the rest of the project.

## Verification tooling

`npm run geo-check` (in `backend/`) is a standalone harness that validates the
geospatial layer against live data: it confirms every stored coordinate is a
valid GeoJSON Point, verifies all five indexes exist, runs a `$near` query, and
attempts an insert with deliberately invalid coordinates to confirm the database
rejects it. It cleans up after itself and reports document counts before and
after.

It exists because a swapped `[lat, lng]` pair is silently valid it just puts
the anomaly in the wrong hemisphere. The script can't catch that (both orders are
legal coordinates), which is documented in its own output.

## Running locally

**Backend:**

```bash
cd backend
npm install
```

Create `backend/.env`:

```ini
ATLAS_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/fieldCommand
JWT_SECRET=<random string>
CLIENT_ORIGIN=http://localhost:5173
PORT=3000
```

```bash
npm run seed
npm run dev
```


**Frontend:**

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```ini
VITE_API_URL=http://localhost:3000
```

```bash
npm run dev
```


Seeded overseer account: `o5_command` / `containment-breach-9` (override with
`SEED_OVERSEER_PASSWORD`). This is a demo credential in a public repository; a
real deployment would not ship one.

## Known limitations

Documented deliberately rather than hidden:

- **Netlify deployment is not finished.** The frontend builds and deploys, but
  browser requests to the API are being blocked. The application runs correctly
  end to end on localhost. Resolution is the first task after submission.
- **Writes are not atomic.** Creating a submission and awarding its points are
  two separate operations; a failure between them leaves points unawarded. The
  correct fix is a MongoDB transaction.
- **No pagination** on any list endpoint. Fine at 17 documents, not at 17,000.
- **`GET /scps/:id/sightings` returns `[]` for a nonexistent anomaly**, which is
  indistinguishable from a real record with no sightings.
- **Rejection doesn't record who rejected it**, unlike verification which stores
  `verifiedBy`.
- **The navbar's point total is stale** until refresh after a submission.
- **Images are URL references only.** No upload pipeline; `imageUrl` is an
  https-only string. Anomalies without one render a `[data expunged]` placeholder.

## Roadmap

- **Finish the Netlify deployment** (immediate).
- **3D facility map.** The current map layer is 2D Leaflet over OpenStreetMap.
  The plan is a 3D Foundation site model with a coordinate grid overlay, letting
  sightings be plotted inside facilities rather than only on a world map.
- **Visual design pass.** The current interface is functional and consistently
  themed but minimal the styling budget went into correctness this week.
- **Real image uploads** via Cloudinary or S3.
- **Expanded SCP coverage**, continuing to add entries from the SCP wiki.
- **Transactions** for the multi-step writes listed above.
- **A registration path to overseer**, rather than seeding the role directly.

## Attribution

SCP names, object classes, and containment concepts are adapted from the
[SCP Foundation wiki](https://scp-wiki.wikidot.com/), licensed under
[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). Incident records,
personnel, and all application code are original to this project. Map data ©
[OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.
This is unofficial fan work.