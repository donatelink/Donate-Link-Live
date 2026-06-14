# DonateLink — Code Documentation

> A complete walkthrough of how the DonateLink codebase is structured and how it
> works. Read this before the viva so you can confidently answer "show me where X
> happens in the code."

---

## 1. What the project is

DonateLink is a web application that lets people **donate to causes through NGOs**
and **track exactly where their money goes**, stage by stage, with proof. It has
**four kinds of users (roles)**:

| Role          | Can do                                                              |
|---------------|--------------------------------------------------------------------|
| **Donor**     | Browse NGOs, donate, track each donation's 5 stages, rate NGOs      |
| **NGO**       | Apply, receive donations, manage beneficiary requests, upload proof |
| **Beneficiary** | Complete a profile, request funding, receive aid                 |
| **Admin**     | Approve/pause/delete NGOs, review feedback, oversee the platform    |

---

## 2. The technology, in plain words

- **Next.js (Pages Router)** — the framework. Every file inside `pages/` becomes a
  URL automatically. For example `pages/donor/dashboard.jsx` becomes the page at
  `/donor/dashboard`.
- **React** — builds the user interface out of reusable components.
- **Tailwind CSS** — styling is written as utility classes directly in the markup
  (e.g. `className="flex gap-2"`), no separate CSS files per component.
- **Supabase** — our backend. It gives us:
  - a **PostgreSQL database** (tables for donations, ngos, etc.),
  - **authentication** (login/signup, including Google),
  - **Row-Level Security (RLS)** — database rules that decide which rows each user
    is allowed to read or change. This is our main security layer.
- **Stripe** — handles card payments.
- **Polygon & Ethereum** — blockchains where a permanent, tamper-proof record of
  the transaction can be written.

---

## 3. Folder structure

```
DonateLink-FYP1/
├── pages/              All routes (each file = one URL)
│   ├── index.jsx               Landing page  (/)
│   ├── _app.js                 App wrapper — loads fonts + global CSS
│   ├── _document.js            Base HTML document
│   │
│   ├── auth/                   Login / signup / password flows
│   │   ├── login.jsx
│   │   ├── register.jsx
│   │   ├── forgot-password.jsx
│   │   ├── reset-password.jsx
│   │   └── accept-invite.jsx   NGO sets password after admin invite
│   │
│   ├── donor/                  Donor area
│   │   ├── dashboard.jsx       Browse NGOs + list of my donations
│   │   ├── track/[id].jsx      Track ONE donation's stages + proof
│   │   └── settings.jsx
│   │
│   ├── ngo/                    NGO area
│   │   ├── dashboard.jsx       Donations received + beneficiary requests
│   │   ├── settings.jsx
│   │   └── [slug].jsx          Public NGO profile page (anyone can view)
│   │
│   ├── beneficiary/            Beneficiary area
│   │   ├── dashboard.jsx
│   │   ├── profile.jsx         8-field profile (required before requesting)
│   │   ├── request/[id].jsx    A single funding request's detail
│   │   └── settings.jsx
│   │
│   ├── admin/                  Admin area
│   │   ├── dashboard.jsx       Approve NGOs, view everything, feedback
│   │   └── settings.jsx
│   │
│   ├── feedback.jsx            Shared feedback form (all roles)
│   ├── landing/                Alternate landing-page designs (1–4)
│   │
│   └── api/                    Server-side endpoints (run on the server, not browser)
│       ├── approve-ngo.js      Admin approves an NGO + emails an invite
│       └── hello.js            Default Next.js sample endpoint
│
├── components/         Reusable UI pieces (see section 6)
├── utils/              supabase.js (DB client) + countries.js
├── hooks/              Custom React hooks
├── styles/             globals.css (Tailwind setup)
├── supabase/           SQL files: schema + security policies (see section 7)
└── public/             Logos, images, static files
```

**Key idea to remember:** In Next.js Pages Router, *the folder structure IS the
routing*. There is no separate router config. `pages/admin/dashboard.jsx` → the URL
`/admin/dashboard`. A file in brackets like `track/[id].jsx` is a *dynamic* route —
`[id]` is filled in at runtime, e.g. `/donor/track/42`.

---

## 4. Where each dashboard lives (quick answer for the teacher)

| Dashboard          | File                              | URL                  |
|--------------------|-----------------------------------|----------------------|
| Donor dashboard    | `pages/donor/dashboard.jsx`       | `/donor/dashboard`   |
| NGO dashboard      | `pages/ngo/dashboard.jsx`         | `/ngo/dashboard`     |
| Beneficiary dash.  | `pages/beneficiary/dashboard.jsx` | `/beneficiary/dashboard` |
| Admin dashboard    | `pages/admin/dashboard.jsx`       | `/admin/dashboard`   |

---

## 5. How a page works (the standard pattern)

Almost every dashboard page follows the **same three-step pattern**. Understanding
this one pattern means you understand 90% of the codebase.

```jsx
export default function DonorDashboard() {
  // 1. STATE — variables that hold the data the page shows
  const [donations, setDonations] = useState([]);
  const [loading, setLoading]     = useState(true);

  // 2. LOAD DATA on first render
  useEffect(() => {
    (async () => {
      // a) Check the user is logged in
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/auth/login"); return; }

      // b) Fetch this user's data from Supabase
      const { data } = await supabase
        .from("donations")
        .select("*")
        .eq("donor_id", session.user.id)
        .order("created_at", { ascending: false });

      setDonations(data);   // c) Save it into state
      setLoading(false);
    })();
  }, []);

  // 3. RENDER — turn the state into UI
  return ( /* ...JSX showing the donations... */ );
}
```

**In words:** when the page opens, it (a) confirms you're logged in, (b) asks
Supabase for the rows that belong to you, (c) stores them, and (d) draws them on
screen. Every dashboard is a variation of this.

**Where security actually happens:** notice we ask Supabase for data and *trust it
to only return rows we're allowed to see*. That filtering is enforced by **RLS
policies in the database** (section 7), not by the front-end. Even if someone
tampered with the browser code, the database would still refuse to hand over other
people's rows.

---

## 6. The reusable components (`components/`)

These are UI building blocks shared across pages:

| Component                    | What it does                                            |
|------------------------------|---------------------------------------------------------|
| `AuthLayout.jsx`             | Shared layout/branding for login & signup screens       |
| `DonationModal.jsx`          | Pop-up where a donor picks an amount/cause and pays      |
| `RequestFundingModal.jsx`    | Beneficiary submits a funding request                   |
| `StageAdvanceModal.jsx`      | NGO moves a donation to the next stage + uploads proof  |
| `BeneficiaryProfileForm.jsx` | The 8-field beneficiary profile                          |
| `UserSettingsForm.jsx`       | Edit name/avatar/account settings                       |
| `FeedbackForm.jsx`           | Submit feedback (used by `/feedback`)                    |
| `RatingModal.jsx` / `StarRating.jsx` / `ReviewsModal.jsx` | Rate & view NGO reviews    |
| `Avatar.jsx`                 | User profile picture (with fallback initials)           |
| `FeeBreakdown.jsx`           | Shows payment/fee split before confirming               |
| `GoogleButton.jsx`           | "Continue with Google" sign-in button                   |
| `PasswordInput.jsx` / `PhoneInput.jsx` / `CountrySelect.jsx` | Smart form inputs        |

A *component* is just a function that returns UI. Pages import these instead of
re-writing the same markup, which keeps the code DRY (Don't Repeat Yourself).

---

## 7. The database & security (`supabase/`)

Each `.sql` file defines one table plus its **RLS policies** (the rules for who can
read/write each row).

| File                                  | Table / purpose                                   |
|---------------------------------------|---------------------------------------------------|
| `ngos.sql`                            | NGO applications & approved NGOs                   |
| `donations.sql`                       | Every donation + its current stage (1–5)          |
| `beneficiaries.sql`                   | Beneficiary funding requests                       |
| `beneficiary_profiles.sql`            | The 8-field beneficiary profile                   |
| `ratings.sql`                         | NGO star ratings & reviews                         |
| `feedback.sql`                        | Feedback submissions                              |
| `donor_views_beneficiary_proof.sql`   | Policy letting donors see the NGO→beneficiary proof |

**Row-Level Security in one sentence:** every query a logged-in user runs is
automatically filtered by Postgres so they only touch rows they own (or are allowed
to see) — e.g. a donor can read their own donations but not someone else's.

---

## 8. The two 5-stage proof tracks (the core idea)

This is the feature that makes DonateLink different. There are **two timelines**:

**A. Donation track** (donor → NGO → beneficiary):
```
1. Pending  →  2. Confirmed  →  3. Allocated  →  4. Transferred  →  5. Completed
                                                  └ proof required ┘
```
(See the `STAGES` array at the top of `pages/donor/dashboard.jsx`.)

**B. Beneficiary-request track** (request → approval → fulfillment), tracked on the
beneficiary side.

- The **NGO advances the stage** using `StageAdvanceModal.jsx`, and must **upload a
  photo/document as proof at stages 4 and 5**.
- The **donor sees that proof** on `pages/donor/track/[id].jsx` — including the
  NGO→beneficiary handover/receipt — closing the trust loop.

---

## 9. Payments: the dual rail

Two independent payment layers (shown side by side, not as one flow):

1. **Stripe** — card payment for everyday convenience.
2. **Blockchain (Polygon & Ethereum)** — writes an immutable on-chain record so the
   transaction can be independently verified and never altered.

The relevant config lives in `.env.local` (contract address, RPC URLs, Stripe key).
`components/FeeBreakdown.jsx` shows the donor the breakdown before confirming.

---

## 10. Authentication flow

- **Sign up / log in:** `pages/auth/register.jsx` and `pages/auth/login.jsx`, using
  Supabase Auth. Google sign-in via `components/GoogleButton.jsx`.
- **Role assignment:** the chosen role (donor/ngo/beneficiary) is stored on the user.
  For Google sign-ups (which carry no role), the role is captured at signup and
  applied on the login callback.
- **NGO onboarding:** an NGO *applies*, the **admin approves** it
  (`pages/api/approve-ngo.js`), which emails the NGO an invite; the NGO then sets a
  password via `pages/auth/accept-invite.jsx`.
- **Password reset:** `forgot-password.jsx` → email link → `reset-password.jsx`.

### Why `approve-ngo.js` is a server-side API route
Most of the app talks to Supabase straight from the browser (safe, because RLS
protects the data). But approving an NGO needs the **service-role key**, which has
admin power and must **never** reach the browser. So that one action runs on the
server in `pages/api/approve-ngo.js`, which: (1) verifies the caller is really an
admin, (2) emails the NGO an invite, (3) marks the application approved. This is a
good example to mention in the viva — it shows you understood the security boundary.

---

## 11. Common viva questions & where to point

| If the teacher asks…                         | Open this file                          |
|----------------------------------------------|-----------------------------------------|
| "Where's the donor dashboard?"               | `pages/donor/dashboard.jsx`             |
| "How do you fetch data?"                     | `useEffect` block in any dashboard      |
| "How do you connect to the database?"        | `utils/supabase.js`                     |
| "How is the data secured?"                   | RLS policies in `supabase/*.sql`        |
| "Show me the stage tracking."                | `StageTracker` in `donor/dashboard.jsx`, `StageAdvanceModal.jsx`, `donor/track/[id].jsx` |
| "How does an NGO get approved?"              | `pages/api/approve-ngo.js`              |
| "Where's the payment logic?"                 | `DonationModal.jsx` + `FeeBreakdown.jsx`|
| "How are routes defined?"                    | The `pages/` folder structure itself    |
| "How do you handle login?"                   | `pages/auth/login.jsx` + `utils/supabase.js` |

---

## 12. How to run it for the demo

```bash
npm install      # first time only — installs dependencies
npm run dev      # starts the local server
```
Open **http://localhost:3000**. Log in with a test account for each role to
demonstrate the four dashboards.

> Tip for FYP-1: demo entirely on `localhost:3000`. Have one test login ready per
> role (donor / ngo / beneficiary / admin) so you can switch and show all four
> dashboards quickly.
