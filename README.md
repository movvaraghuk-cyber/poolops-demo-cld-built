# ServiceOps

One app for small service businesses to run jobs, proof-of-work photos, invoicing and payments. We started with pool service companies, and the same workflow fits any route-based trade.

**Live:** https://app.agileassociatesllcus.com

**Try it:** log in as each of the three roles to see the whole workflow.

| Role | Username | Password |
|---|---|---|
| Owner | `owner` | `test123` |
| Contractor | `contractor1` | `test123` |
| Client | `customer1` | `test123` |

1. As the **owner**, create a job and assign it to Contractor 1.
2. As the **contractor**, open the job, add a photo, tick off the checklist and send it to the office.
3. As the **owner** again, approve the photos and send the bill.
4. As the **client**, open the bill and pay with Stripe's test card `4242 4242 4242 4242` (any future date, any CVC). Payments run in Stripe's test mode, so no real money moves.

## The problem
A typical small pool company uses QuickBooks for invoices, a separate app for its techs' photos, and group texts to keep the owner, crew and clients in sync. It also pays card fees on every bill. ServiceOps puts all of that in one flow:

1. **Owner** creates a job: client, service, price, assigned tech, and how the client wants bills (text, email or both).
2. **Contractor** opens the job on their phone, takes before/after photos and ticks off a checklist, then sends it to the office.
3. **Owner** reviews the photos, approves the work (or asks for a redo), and sends one bill per client covering any mix of jobs.
4. **Client** opens a pay link with no login, sees the photos and pays by bank transfer (no fee) or card (+3%) through Stripe.

## Tech
- **Frontend:** a single `index.html` in vanilla JavaScript with no build step. It has a separate layout for phones and desktops, and dark and light themes.
- **Backend:** serverless functions on Vercel (`api/`):
  - `create-checkout-session`: Stripe Checkout for card or ACH payments
  - `stripe-webhook`: marks invoices paid
  - `send-invoice`: texts with Twilio, email with Resend, and a fallback to the owner's phone
  - `cleanup-photos`: a daily cron that deletes photos 30 days after payment
- **Database:**
  - Supabase Postgres, with Supabase Auth logins and row-level security so each role sees only its own data
  - Supabase Storage for job photos
- **Payments:** Stripe Checkout with signed webhooks. The pay links use unguessable tokens.

## Who built what
ServiceOps is a project I'm building with my uncle, Raghu Movva.
- **Raghu** built the first MVP (job assignment, the customer view and the Stripe integration) and owns the hosting accounts.
- **Sriram:**
  - redesigned the app around photo proof
  - built invoice delivery by text and email
  - built per-job billing and the client pay page
  - added photo storage with automatic 30-day cleanup
  - added error handling and output escaping
  - fixed a breaking Stripe API change
  - reviewed the row-level security rollout
  - also leads customer discovery and outreach

We built ServiceOps with AI-assisted development (Claude Code). We made the product, design and architecture decisions, and we review and test every change.

## Status
- **Working:** the full flow, from creating a job through the contractor's photos, approval, billing and payment, is tested end to end.
- **Next:** support for multiple businesses (each company gets its own workspace, and Stripe Connect pays each company directly), plus job scheduling and recurring visits.
