# ServiceOps

Shared project notes for Sriram Joshi and his uncle Raghu Movva (co-founders), and for each of their Claude sessions. **Whoever finishes a session updates "Current state" and "Session log" so the other person can pick up where they left off.** Last updated: 2026-11-02 (Raghu's session).

## How this file is shared
- This file and `outreach-tracker.csv` live on the **`outreach` branch** of the private repo (github.com/movvaraghuk-cyber/poolops-demo-claud-built). Both co-founders have access, so nobody passes files back and forth any more.
- The `outreach` branch is never merged into `main`, so changes here never touch the live app.
- Before a session: `git fetch origin outreach && git checkout outreach && git pull`. After a session: commit and push to `outreach`.
- Only one person works from it at a time. Say so in the session log when you start and finish.

## ▶️ Raghu's Claude: start here (outreach task, set up by Sriram 2026-10-30)
Sriram has handed the email outreach to Raghu. Raghu sends from the ServiceOps business email, and his Claude does the work. When Raghu says "start" or "continue the outreach", do the steps below in order.

### 1. Raghu's answers (recorded 2026-11-02)
1. **Phone number:** yes: (503) 376-4303.
2. **Sending address:** `raghu@agileassociatesllcus.com` (an alias on the `hello@` Google Workspace account), sender name "Raghu Movva". The Claude Gmail connector must be signed in to `hello@agileassociatesllcus.com`. On 2026-11-02 it was still on Raghu's personal Gmail: **do not send from that.** Check which account the connector uses before every send.
3. **Business mailing address:** **still needed.** Raghu has no PO box yet. "Lathrop, California" alone does not meet CAN-SPAM, which needs a full postal address (street, PO box, or private mailbox). Plan: smallest USPS PO Box in Lathrop. **Send nothing until the footer has a real address.**
4. **Sending pace:** option A (warm up).
5. Show him **3 finished sample emails** and get his OK before the first batch goes out.

### 2. The email (Sriram's approved text: keep the wording, and personalize only the bracketed parts)
Subject: `Small business help inquiry from a local`

> Hi [Owner first name, or "there" if unknown],
>
> I came across [Business name] while looking at pool companies around [their city / nearby area].
>
> I'm Sriram, a student at UC Berkeley. My uncle and I are building a simple app for small pool service businesses. The app handles all invoicing, contractor contacting, photo logs, etc. all in one place in a seamless fashion. You get paid without having to juggle between multiple different subscription services to manage your business.
>
> Would you be open to a 15-minute chat whenever you're free to discuss how we can help your business?
>
> Thanks,
> Sriram Joshi and Raghu Movva
> (503) 376-4303
>
> ServiceOps · [mailing address] · Reply "no thanks" and we won't email again.

- **The last line is required, so keep it.** It's federal law (CAN-SPAM) for business cold email, and an easy way to say no also means fewer people click "Report spam", which helps delivery.
- **Plain text only:** no links, images, attachments or the demo link in the first email. Send the demo link (https://app.agileassociatesllcus.com, logins `owner` / `contractor1` / `customer1`) only after someone replies with interest. **The demo password is no longer `test123`** (real logins went live 2026-11-02). Ask Raghu for the demo password; don't write it in this file.

### 3. Avoiding the spam folder
**A brand-new domain that sends 50 cold emails on day one will very likely land in spam,** and Google may limit the account. Google Workspace trial accounts also have lower sending limits. Raghu picked **option A**:
- Week 1: 10–15 a day. Week 2: 20–25 a day. From week 3: the full Tue/Thu schedule.
- The first "50" goes out over about 4 days instead of all at once.

Other options, not chosen: B (send 50 now, spaced 2–4 minutes apart) and C (a cold-email tool with warm-up such as Instantly, Smartlead or lemlist, ~$30–40/month).

Do these before any sending:
- SPF and DKIM: **done** 2026-11-02 (Namecheap + Google Admin). **DMARC: still to add.** Namecheap → Advanced DNS → TXT record, Host `_dmarc`, Value `v=DMARC1; p=none; rua=mailto:admin@agileassociatesllcus.com`.
- Send one test to https://www.mail-tester.com and aim for 9/10 or better.
- Set "Raghu Movva" as the sender name, plus a profile photo and signature.
- Personalize the first line of every email, send them one at a time with a few minutes between each, and never BCC a group.
- Answer replies quickly. Back-and-forth replies make the domain look trustworthy.
- **Stop and tell Raghu** if more than 5% of emails bounce, or if anyone complains.

### 4. Finding the businesses (50 now, then 30 per run)
- **Who:** pool service and maintenance businesses with 1–10 techs. Skip pool builders, remodelers, big chains and franchises.
- **Where, in this order:**
  1. Lathrop, Tracy, Manteca, Mountain House, Stockton, Modesto
  2. Pleasanton, Livermore, Dublin, San Ramon, Danville
  3. Brentwood, Discovery Bay, Antioch, Oakley
  4. When those run out: Fremont, San Jose, Walnut Creek, Concord, Sacramento suburbs (Elk Grove, Folsom, Roseville) and Fresno/Clovis
- **Sources:** Google Maps "pool service [city]", the business's own website, Yelp, Thumbtack, Nextdoor.
- **Use only an email the business publishes itself,** on its website or Google/Yelp listing. Never guess addresses like info@, and skip businesses that only have a contact form.
- **Tracking:** log every business in `outreach-tracker.csv` (next to this file) with these columns:
  `business,owner_name,city,email,source_url,date_sent,status,notes`
  Status is one of: to-send / sent / replied / interested / no-thanks / bounced. (`to-send` = found and checked, not emailed yet.)
- **Never email the same business twice,** and never email anyone marked no-thanks or bounced.

### 5. Ongoing schedule: 30 emails every Tuesday and Thursday
- Once the first 50 have gone out (on the warm-up pace), create a scheduled task that runs Tuesday and Thursday at 9:00 AM Pacific. Each run should:
  1. Check the inbox for replies since the last run. Update the tracker, mark opt-outs as no-thanks, and flag interested owners for Raghu.
  2. Find 30 new businesses, following section 4.
  3. Send the section 2 email to each one, spaced a few minutes apart.
  4. Write a short summary in the session log: how many were sent, replies, bounces.
- **Pause the schedule and tell Raghu** if bounces go over 5%, someone complains, or Gmail shows a sending-limit warning.
- On option A, hold the scheduled runs at about 15 a run until week 3.

### 6. When the session ends
Update "Current state", "Session log" and the tracker, then commit and push to the `outreach` branch.

## The business
Small service businesses juggle separate tools: QuickBooks for invoices, a separate photo app for contractors' proof-of-work photos, and manual back-and-forth between owner, contractor and client. They also eat credit-card fees. ServiceOps puts jobs, photos, invoicing and payments in one place.
- Origin: Raghu met a pool-cleaning business owner on a plane who had exactly these problems.
- First customer segment: **pool service businesses in the Tri-Valley / East Bay / Central Valley (Lathrop–Tracy–Manteca)**.
- Validation status: one conversation so far. Goal is 10 conversations, then 1–3 paying pilots. The known competitors are Skimmer, Pool Brain, Jobber and Housecall Pro. Ask every owner why they don't use those tools.

## The app
- Repo: https://github.com/movvaraghuk-cyber/poolops-demo-claud-built (private; Raghu owns it, Sriram is a collaborator)
- Live: https://app.agileassociatesllcus.com (also poolops-demo.vercel.app). It deploys automatically on every push to `main`.
- Stack:
  - one `index.html` (vanilla JS, no build step)
  - Vercel serverless functions in `api/`: `send-invoice`, `create-checkout-session`, `stripe-webhook`, `cleanup-photos` (daily cron)
  - Supabase: project `poolops-claude-built`, ID `uuaobvbrvubuwhymrwle`; photos in the `job-photos` storage bucket
  - Stripe (`stripe@23`, API 2026-09-30: use `allowed_payment_method_types`, not `payment_method_types`)
- Logins (since 2026-11-02): Supabase Auth. Typing `owner` signs in as `owner@serviceops.test`. Each login's role is in the `profiles` table. Add a login: Supabase → Authentication → Users → Add user (Auto Confirm), then re-run `supabase/migrations/20261026_auth_rls.sql` (safe to re-run).
- Roles:
  - **Owner/manager:** adds jobs (with the client's phone/email and how to send bills), approves work from photos, and sends bills per client by text/email.
  - **Contractor:** camera-first job screen with a checklist, then sends the job to the office. Sees addresses only, never client names or contact info (enforced by the database).
  - **Client:** pays from a texted/emailed link with no login (`/?pay=<token>`), choosing bank (no fee) or card (+3%).
- Photos are deleted 30 days after the invoice is paid (`api/cleanup-photos.js` + `vercel.json` cron).
- Texts/emails go out through Twilio/Resend once their env vars are set. Until then, the owner gets "Open text / Open email / Copy link" buttons.

## Current state (2026-11-02)
On `main` and live:
- the proof-first redesign, invoice delivery, per-job billing, photo storage, error handling, the Stripe checkout fix
- PR #2 (dark/light colors), PR #3 (hide client names from contractors), PR #5 (demo contacts point to the owner)
- **PR #4 (real logins + row-level security): merged and live 2026-11-02.** Migration run on live Supabase; logins `owner`, `contractor1`, `customer1` created. Supabase Security Advisor RLS errors should now be cleared.

Still to do from Sriram's PR #4 review:
1. **Drop the `"job photos read"` select policy on `storage.objects`** (created in `20261020_invoices_contacts_photos.sql`). It lets anyone with the anon key list every photo in the bucket. Public-bucket URLs still load without it.
2. **Turn off public sign-ups** in Supabase (Authentication → Sign In / Providers).

Company email (2026-11-02): Google Workspace Business Starter on `agileassociatesllcus.com`. One account, `hello@`, shared by both co-founders. Free aliases: `info@`, `billing@`, `admin@`, `raghu@`, plus the partner's name. Domain verified; MX, SPF and DKIM set in Namecheap. DMARC not yet added.

Outreach (2026-11-02): not started sending. Blocked on (1) a mailing address for the footer and (2) the Gmail connector being signed in to `hello@`. Business research has started; see `outreach-tracker.csv`.

**Not built yet:**
- multi-business support and Stripe Connect (wait until 2–3 pilots are paying; until then, give each pilot its own Supabase and Vercel project)
- job dates, scheduling and recurring visits
- terms of service and a privacy policy
- QuickBooks export

## Working agreements
- **Vercel is on the Hobby plan, so only Raghu's commits deploy.** Commits must use Git identity `movvaraghuk-cyber` / `277414160+movvaraghuk-cyber@users.noreply.github.com`. Sriram's code changes go to Raghu as a patch or text file; Raghu's Claude applies and commits them.
- Don't push to `main` or change production (Vercel, Supabase, Stripe) without the other co-founder knowing. Test on the branch's Vercel preview first. Previews use the **live database**, so test with demo clients only.
- **Outreach rules:**
  - Email outreach runs from the ServiceOps business email through Raghu's Claude. See "Raghu's Claude: start here" above.
  - Every email keeps the mailing address and opt-out line (CAN-SPAM).
  - **No automated or AI-voice calls.** Under the TCPA they need prior written consent, and fines run $500–$1,500 per call.
  - Calls you dial yourself are fine.

## Future feature ideas (not for the MVP)
- **AI assistant for owners and contractors.** Instead of clicking boxes and filling forms, the owner chats or dictates by voice ("Add a pool clean for Maria Chen Tuesday, $85, send Luis, gate code 4417") and the AI fills in the job and passes exactly what they want to the contractor. Contractors do the same when sending their job details. Plain English in, structured job out. Sriram asked to keep this for after the MVP.
- QuickBooks sync, recurring service schedules, route ordering for contractors.

## Folders (on Sriram's Mac)
- `poolops-demo-claud-built/`: local clone of the repo
- `design-options/`: the three clickable frontend directions (A, B, C) from before the redesign
- `handoff/`: patches and text files sent to Raghu
- `marketing/`: outreach plan, target list, email drafts

## Session log
- **2026-10-20 (Sriram):** reviewed the MVP, built three design options, and picked B (proof first). Built the redesign, invoice texts/emails, per-job billing, photo storage and error handling.
- **2026-10-22 (Sriram):** ran the storage/contacts migration on live Supabase and added `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` in Vercel. Sent Raghu the patch because Vercel Hobby blocked Sriram's PR #1, which was then closed.
- **2026-10-23 (Sriram):** found the Stripe v23 checkout error and sent Raghu the one-line fix.
- **2026-10-25/26 (Raghu):** merged the redesign and the checkout fix; added PRs #2, #3 and #5; opened PR #4 (auth + RLS).
- **2026-10-26 (Sriram):** reviewed PR #4 (three additions above). Started local marketing: the target list and first email draft are in `marketing/`. Deleted the four merged GitHub branches, plus Sriram's stale local branches.
- **2026-10-28 (Sriram):** Claude tested the full demo end to end with no errors: job → contractor photo/checklist → approve → bill → pay link → Stripe checkout (sandbox mode, `cs_test_`). Demo is good enough to show prospects. A test Robert Diaz $85 bill was left in the demo.
- **2026-10-30 (Sriram):** handed email outreach to Raghu's Claude: first 50 emails, then 30 every Tue/Thu (see "start here").
- **2026-11-02 (Raghu):** set up Google Workspace (`hello@agileassociatesllcus.com` + aliases, SPF, DKIM). Merged and deployed PR #4: ran the migration on live Supabase, created logins, merged. Moved these notes and the tracker to the `outreach` branch so they no longer have to be emailed back and forth. Outreach answers recorded (section 1). Started researching businesses. Nothing sent yet: waiting on a mailing address and on switching the Gmail connector to `hello@`.
