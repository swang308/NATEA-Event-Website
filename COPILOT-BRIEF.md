# NATEA — Copilot brief (give this to Copilot)

> **How to use this brief:** Paste the whole file into GitHub Copilot Chat at the start of the project, and re-paste the relevant section whenever you start a new step in the Build order. Build one step at a time, run the app, and check it before moving on. If anything below is marked `[TODO]` or is unclear, Copilot should ask — not invent a value.

## What it is

NATEA is the events website for a Toronto IT community. Members discover events, see who is coming before they go, RSVP, and pay the person hosting the event directly by Interac e-Transfer. The site never holds the money and charges no platform fee.

- Logo: CN Tower framed by crossing X shapes in teal, purple, and green. Use the logo file the user provides — do not redraw it.
- Tagline in the preview header: "Meet · Learn · Connect"
- Community discussion stays in the existing Line group chat. This site is the source of truth for events, RSVPs, and payment status — it is not a chat app.
- Email is sent with Brevo.
- Language: bilingual — English and Traditional Chinese. See the Language section. Do not build an English-only site, and never use Simplified Chinese.
- This brief replaces a clickable preview the user already approved. The preview used sample events, sample people, and demo accounts stored in browser localStorage. The real site keeps the preview's pages, layout, colours, and flows, but everything is backed by a real database and real accounts.
- Do not add a "Why not just use Luma?" section anywhere. That comparison was removed on purpose.

## Stack

- Next.js (App Router) with TypeScript and Tailwind CSS.
- Supabase for Postgres, Auth, and Row Level Security. Storage only if event banner images are added later — not required for V1.
- Brevo for email, called only from the server (Next.js Route Handlers / Server Actions). The Brevo API key lives in an environment variable, never in client code and never committed to the repo.
- Hosting: Vercel free tier, connected to the GitHub repo. Supabase free tier for the backend.
- Internationalisation: `next-intl` with two locales — `en` (default) and `zh-TW`. All UI text lives in message files, never hard-coded in components.
- Auth for V1: email/password plus Google sign-in, both through Supabase Auth. Line Login is a later step, not V1 (see Line section).
- No other payment provider. See Rules — out of scope before adding anything.

## Design

Use the exact tokens from the approved preview so the real site looks the same. Set them up as Tailwind theme values / CSS variables with these names and values.

| Token | Value | Used for |
|---|---|---|
| `--teal` | `#2ea6b5` | Primary buttons, Workshop accents |
| `--teal-d` | `#1f7f8c` | Teal hover, links |
| `--purple` | `#7b2d8e` | Sign-up / account actions, Panel accents |
| `--purple-d` | `#5e1f6e` | Purple hover, Pending badge text |
| `--green` | `#8fbf2f` | Paid / success accents, Social accents |
| `--green-d` | `#6f9a1d` | Green hover, Paid badge text |
| `--bg` | `#ffffff` | Page background |
| `--bg2` | `#f6f8f9` | Alternate section background |
| `--card` | `#ffffff` | Cards and panels |
| `--ink` | `#17202b` | Body text, headings |
| `--muted` | `#5b6b7a` | Secondary text |
| `--line` | `#e3e9ec` | Borders and dividers |
| `--chip` | `#eef6f7` | Neutral pills |

Status colours from the preview:

- Unpaid: background `#fff7e0`, text `#7a5b00`
- Paid / free going: background `#eaf7e3`, text `#35660f`
- Pending confirmation: background `#f3e8f7`, text `#5e1f6e`
- Line button green: `#06c755`
- Brevo badge green: `#0b996e`

Category banner gradients:

- `b-teal`: `linear-gradient(120deg, #2ea6b5, #1f7f8c)`
- `b-purple`: `linear-gradient(120deg, #8e3aa3, #5e1f6e)`
- `b-green`: `linear-gradient(120deg, #a5cf4a, #6f9a1d)`
- `b-mix`: `linear-gradient(120deg, #2ea6b5 0%, #7b2d8e 55%, #8fbf2f 110%)`

Fonts: Sora (600 / 700 / 800) for headings and display text, DM Sans (400 / 500 / 700) for body. Load both from Google Fonts. For Traditional Chinese text, use Noto Sans TC as the fallback for both headings and body — Sora and DM Sans have no Chinese glyphs, so without this the zh-TW interface would fall back to a mismatched system font. Load Noto Sans TC from Google Fonts as well.

Layout basics from the preview: content width 1120px, cards with 16–18px radius and a light border, buttons at least 44px tall, event grid 3 columns on desktop, 2 on tablet, 1 on mobile. The preview also defines a dark-mode palette with `prefers-color-scheme: dark` — port it if it is cheap to keep, but light mode is the priority.

## Language — English and Traditional Chinese

Recommendation, and the rule for this build: use both, not one or the other.

English is the default and the public face of the site — NATEA is in Toronto, and English works for new members, partners, venues, and anyone who finds the site from a search or a portfolio link. Traditional Chinese is for the community itself — many members are more comfortable reading event details, payment instructions, and reminders in 繁體中文, especially in the Line group. A language switcher lets each person choose, instead of the site choosing for them.

- Locales are `en` (default) and `zh-TW`. Use Traditional Chinese only — 繁體中文, locale code `zh-TW`. Never Simplified Chinese, never the `zh-CN` locale, and do not auto-convert characters.
- Put a language switcher in the header on every page, labelled `EN | 繁體中文`. Switching language keeps the user on the same page and the same event — it only changes the locale.
- Use locale-prefixed routes with `next-intl`: `/en/...` and `/zh-TW/...`. The root `/` redirects to `/en` unless the visitor has a saved preference or a `zh-TW` browser language.
- Translate all interface text: nav, buttons, headings, form labels and errors, filter chips, category names, payment badges (Paid / Pending confirmation / Unpaid / Going · Free), the How payment works steps, and empty states. Keep every string in `messages/en.json` and `messages/zh-TW.json` with the same keys — no hard-coded English in components.
- Event content is different from interface text. An organizer writes a title, description, and agenda once, in whichever language they prefer, and that text is shown as written in both locales — do not machine-translate it and do not require two versions in V1. The date, location, price, and payment instructions around it are still translated.
- Dates, times, and numbers follow the active locale: `en-CA` formatting in English, `zh-TW` formatting in Chinese. Prices always stay in Canadian dollars.
- Save the choice: store `preferred_language` on the profile at sign-up (defaulting to the locale they signed up in), and remember a guest's choice in a cookie. Signed-in users can change it in My Events.
- Brevo emails follow the recipient's `preferred_language`: subject and body in that language, from the matching template. If there is no saved preference, send English. A public newsletter subscriber picks a language on the signup form.
- Check Chinese text properly before launch: Traditional characters throughout, no Simplified forms mixed in, and line breaks that do not orphan a single character on buttons. Have a Traditional Chinese speaker review `messages/zh-TW.json` once — do not ship Copilot's first translation unchecked.

## Pages and routes

### `/` — Home

- Header: logo + NATEA, nav links to Events, How payment works, Line group, Email updates, the `EN | 繁體中文` language switcher, plus Sign up / Log in for guests and My Events + avatar + Log out for signed-in users.
- Hero: headline, one-paragraph intro, buttons for Browse upcoming events, Host an event, and Join us on Line, plus the logo card.
- Upcoming and recent events section: search box, filter chips — All, Workshops, Panels, Socials, Free, Paid, Past events — and the event grid.
- Event card: category banner with date box, title, date and time, location, organizer name, attendee avatar stack with count going, price (or Free), spots left, and a View details button.
- "How payment works" section: the four steps in the RSVP and payment flow below.
- Line section: explanation that discussion lives in Line, an Open the Line group button, and a QR code panel. Both use the placeholder in Open inputs for now.
- Brevo newsletter section: what emails Brevo sends (the four types below), a mailing list signup form (name optional, email required, language choice English / 繁體中文), and a note that preferences can be changed in My Events. A public signup writes to `newsletter_subscribers`; it does not create an account.
- Footer: NATEA name and a one-line description of the stack.

Events on Home come from the database. Do not hard-code the preview's sample events into the real site. If seed data is needed for development, load it through a clearly marked seed script that is not run in production.

### `/events/[id]` — Event detail

- Colour banner with category, title, date and time, location, price, and count going out of capacity.
- About this event: description and agenda list.
- Who's coming: public attendee list. Each row shows avatar initials, display name, and a payment badge — Paid, Pending confirmation, Unpaid, or Going · Free for free events. This list is visible to everyone, signed in or not.
- Organizer card: organizer name, and for paid events the e-Transfer email with a Copy button. The copy must make clear the money goes to the host, never to the platform.
- Discuss this event in Line button (placeholder link for now).
- RSVP panel, which changes by state: ended event, already RSVP'd (shows current payment status, payment instructions if still Unpaid, and Cancel my RSVP), or not RSVP'd (RSVP button if signed in, Sign up / Log in to RSVP if not).

### `/login` and `/signup`

- One auth screen with Sign up / Log in tabs is fine, matching the preview, as long as the routes work as `/login` and `/signup`.
- Sign up fields: display name (shown on attendee lists), email, password, and preferred language (English / 繁體中文, pre-selected from the current locale). Log in fields: email, password. Google sign-in button on both.
- A disabled or clearly marked "Continue with Line — coming later" note is acceptable in V1. Do not fake a working Line Login.
- After login, if the user was trying to RSVP to a specific event, return them to that event and complete the RSVP prompt. Otherwise go to My Events.

### `/my-events` — Dashboard (signed-in only)

- Header with avatar, name, email, Host an event, and Log out.
- Four stat tiles: Upcoming RSVPs, Payments to send, Past events attended, Events I'm organizing.
- Events I'm going to — upcoming: one row per RSVP with event title, date, location, payment badge, and actions that match the status (Pay by e-Transfer / I've sent it when Unpaid, waiting note when Pending, Details and Cancel).
- Past events I attended.
- Events I'm organizing: one panel per hosted event with attendee list, each attendee's badge, a Confirm e-Transfer received button for anyone not yet Paid, and a total of confirmed money so far.
- Email notifications panel: the four Brevo preference toggles from `email_preferences`, saved immediately when toggled.
- Language preference: English / 繁體中文, saved to `profiles.preferred_language`. Changing it switches the interface language and the language of future Brevo emails.

### `/events/new` — Host an event (signed-in only)

Form fields, matching the preview: event title, category (Workshop, Panel, Social, Study Group), date, time, location, ticket price in CAD (0 = free), capacity, your Interac e-Transfer email, description. Add an agenda field (one item per line) and an event status choice of Draft or Published — only Published events appear publicly.

On publish, the creator is the organizer, is automatically RSVP'd, and for a paid event their own status starts as Paid. Prefill the e-Transfer email from the organizer's profile, but store the value on the event itself so later profile changes do not rewrite old events.

## Data model

Create these tables in Supabase with a SQL migration. Keep the names and enums exactly as written so the code and the brief stay in sync.

```sql
-- profiles: one row per Supabase Auth user, created on sign-up
create type user_role as enum ('member', 'admin');
create type site_language as enum ('en', 'zh-TW');

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  email text not null unique,
  avatar_url text,
  role user_role not null default 'member',
  preferred_language site_language not null default 'en',
  etransfer_email text,
  created_at timestamptz not null default now()
);

-- events
create type event_category as enum ('Workshop', 'Panel', 'Social', 'Study Group');
create type event_status as enum ('draft', 'published', 'cancelled');

create table events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references profiles (id),
  title text not null,
  category event_category not null,
  description text not null default '',
  agenda text[] not null default '{}',
  starts_at timestamptz not null,
  location text not null,
  price_cad integer not null default 0 check (price_cad >= 0),
  capacity integer not null check (capacity >= 2),
  etransfer_email text,
  status event_status not null default 'draft',
  created_at timestamptz not null default now()
);

-- rsvps: payment_status is the whole payment system — see flow below
create type payment_status as enum ('free', 'unpaid', 'pending', 'paid');

create table rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  payment_status payment_status not null,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

-- email_preferences: one row per user, all four on by default
create table email_preferences (
  user_id uuid primary key references profiles (id) on delete cascade,
  announce boolean not null default true,
  rsvp_confirm boolean not null default true,
  payment_reminder boolean not null default true,
  reminder_24h boolean not null default true
);

-- newsletter_subscribers: public Brevo list signups, no account needed
create table newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  preferred_language site_language not null default 'en',
  subscribed_at timestamptz not null default now(),
  source text not null default 'home-newsletter'
);
```

Notes for Copilot:

- `price_cad` is whole Canadian dollars as an integer, matching the preview. `0` means a free event.
- `events.etransfer_email` is a snapshot taken when the event is created, prefilled from `profiles.etransfer_email`. It is the address attendees pay for that event.
- Create a profile row and an `email_preferences` row automatically when a new Auth user is created, using a database trigger on `auth.users` or the sign-up server action — pick one approach and use it consistently, including for Google sign-in.
- Add indexes on `rsvps.event_id`, `rsvps.user_id`, `events.organizer_id`, and `events.starts_at`.
- An event is past when `starts_at` is before now. Upcoming, past, and the dashboard counts are all derived from `starts_at`; do not store a separate past flag.

## RSVP and payment flow

Payment is manual Interac e-Transfer. Nothing in the code connects to a bank, Interac, or a payment processor, and nothing automatically verifies that money arrived. The status field is a shared checklist between the attendee and the organizer — that is the whole design.

State machine for `rsvps.payment_status`:

1. **RSVP** — a signed-in user RSVPs. Insert one `rsvps` row: `free` if the event price is 0, otherwise `unpaid`. The user's name appears on the public Who's coming list immediately, with the matching badge.
2. **Send e-Transfer (outside the site)** — the attendee sends the ticket amount from their own bank to the event's `etransfer_email`. The event page and My Events show the amount, the email with a Copy button, and this instruction for the transfer message field: the event name plus the attendee's name.
3. **I've sent it** — the attendee taps this button. Only that attendee can do it, and only from `unpaid`. Status becomes `pending` (badge: Pending confirmation).
4. **Organizer confirms** — the organizer checks their own bank, then taps Confirm e-Transfer received in My Events, under Events I'm organizing. Only the organizer of that event can do it, and only from `pending` or `unpaid`. Status becomes `paid`.

Other transitions:

- **Cancel my RSVP** — the attendee deletes their own `rsvps` row. Their name leaves the Who's coming list and their dashboard counts update. Cancelling does not handle any refund — if they already paid, the refund is arranged between the two people outside the site.
- **Capacity** — do not accept a new RSVP once the attendee count reaches `capacity`. Show the event as full. There is no waitlist in V1.
- **Free events** — status stays `free` the whole time. No payment instructions, no confirm button.
- **Ended and cancelled events** — no new RSVPs, and no status changes except an organizer cancelling their own event.

## Roles and Row Level Security

Enable Row Level Security on every table. The app must work through these policies, not around them with a service-role key in the browser.

- **Public (not signed in)** can read published events, and for each published event the attendee display names and payment badges. Nothing else. To make that work without exposing private profile data, expose the Who's coming list through a view or a query that returns only display name, avatar, and payment status for an event — never attendee email addresses.
- **Signed-in members** can read their own profile and update their own `display_name`, `avatar_url`, `preferred_language`, and `etransfer_email`. They cannot change their own `role`.
- **RSVPs:** a member can insert, read, and delete only their own rows. A member can update only their own row, and only the `unpaid` to `pending` transition. A member must never be able to set their own status to `paid` — in the UI or by calling the API directly.
- **Events:** any signed-in member can create an event and becomes its organizer. Only the organizer can update or cancel their own event. Only the organizer can set an attendee's status to `paid`, and only for their own event.
- **Email preferences and newsletter:** a member can read and update only their own `email_preferences` row. Anyone can insert into `newsletter_subscribers` from the public form; nobody public can read that table.
- **Admin** (`profiles.role = 'admin'`) can read and moderate all events and RSVPs, for community management. Admin is set by hand in the Supabase dashboard for now — there is no admin UI in V1.

Test the `paid` rule specifically: a direct API call from an attendee's account trying to set their own RSVP to `paid` must fail.

## Brevo — email

Brevo sends all email for NATEA. All Brevo calls happen server-side in Next.js Route Handlers or Server Actions, using `BREVO_API_KEY` from the environment. The key must never appear in client components, in the repo, or in any file Copilot commits. Add it to `.env.local` locally and to the Vercel project settings when deploying, and make sure `.env.local` is in `.gitignore`.

The four email types, their triggers, and their preference keys:

| Email | Trigger | Preference key | Type in Brevo |
|---|---|---|---|
| New event announcements | An event is published | `announce` | Campaign to the NATEA list |
| RSVP confirmation | A user RSVPs | `rsvp_confirm` | Transactional, to that user |
| e-Transfer payment reminder | A paid RSVP is still Unpaid — sent by a scheduled check | `payment_reminder` | Transactional, to that user |
| Event reminder — 24h before | 24 hours before `starts_at` | `reminder_24h` | Transactional, to each attendee |

Rules for Copilot:

- Check the recipient's `email_preferences` row before sending any of the four. If that type is off, do not send it.
- Send each email in the recipient's `preferred_language` — English or Traditional Chinese — using the matching Brevo template for that type. Keep both template versions in Brevo; never send a Simplified Chinese version.
- RSVP confirmation includes the event title, date and time, location, and — for paid events — the amount and the organizer's e-Transfer email.
- The payment reminder and the 24-hour reminder need a scheduled job. Use a Vercel Cron Job hitting a protected server route once a day for the 24-hour reminders, and propose the simplest equivalent for payment reminders. Protect the route with a secret header so the public cannot trigger it.
- Sync contacts to Brevo: when a user signs up or changes preferences, update their Brevo contact attributes. When someone uses the public newsletter form, add them to the Brevo list and insert the `newsletter_subscribers` row.
- Every email includes an unsubscribe link, and unsubscribing turns the matching preference off.
- Sender address, sender name, and Brevo list ID are placeholders for now — see Open inputs. Build with environment variables (`BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, `BREVO_LIST_ID`) and a clearly marked fallback that logs "would send email" in development instead of failing when they are not set.

## Line

Line stays the community's group chat. The site links out to it; it does not embed or replace it, because a Line group chat cannot be embedded in a website.

- V1: an Open the Line group button and a QR code on the Home page Line section, plus a Discuss this event in Line button on every event detail page. All three use the same invite link placeholder — see Open inputs. Put the link in one config file / environment variable (`NEXT_PUBLIC_LINE_GROUP_URL`) so swapping in the real link later is a one-line change. The QR code image is a placeholder asset until the real one is provided.
- V1: sign-in is email/password and Google only. The preview's one-tap Line button was a demo. Do not ship a fake Line Login.
- Later, not V1: real Line Login through a custom Supabase OAuth flow, so a member's name and photo match their Line profile.
- Later, not V1: a Line Official Account bot that posts new events to the group and sends reminders. Do not build the bot in V1.

## Build order

Build in this order. Finish and run each step before starting the next.

1. **Project, design, and language setup** — create the Next.js (App Router, TypeScript, Tailwind) app, add the Design tokens, fonts, header, footer, and the logo. Set up `next-intl` with `en` and `zh-TW`, locale-prefixed routes, the header language switcher, and the first `messages/en.json` / `messages/zh-TW.json` files in this step — do not retrofit it later. Deploy the empty shell to Vercel so deployment works from day one.
2. **Supabase and data model** — create the Supabase project, run the Data model migration, enable Row Level Security with the policies in Roles and Row Level Security, and add the profile and email-preferences creation on sign-up.
3. **Auth and profile** — sign up, log in, log out, and Google sign-in. Signed-in users land on an empty My Events page. Test that a signed-out visitor cannot open `/my-events` or `/events/new`.
4. **Events — read** — Home event grid with search and filters, and the event detail page, both reading published events from Supabase. Include the public Who's coming list with badges.
5. **Events — create, and RSVP** — the Host an event form, organizer auto-RSVP, RSVP and Cancel RSVP, capacity check, and the dashboard lists for attendees. Statuses stop at `unpaid` / `free` in this step.
6. **Payment status flow** — the I've sent it button (`unpaid` to `pending`), payment instructions with the copyable e-Transfer email, the organizer's Confirm e-Transfer received action (`pending` / `unpaid` to `paid`), dashboard counts, and the organizer's confirmed total. Re-test the rule that an attendee cannot mark themselves Paid.
7. **Brevo, Line links, and final test** — wire the four Brevo emails with preference checks, the newsletter signup, the Line button and QR placeholders, and the scheduled reminder route. Then run the manual end-to-end test below.

Manual end-to-end test — all of this must pass before calling V1 done:

- Create two accounts: Account A (attendee) and Account B (organizer). Use a second browser or a private window for one of them.
- As B, publish a paid event with B's e-Transfer email and a small capacity.
- As A, find the event on Home, open it, and RSVP. A's name appears under Who's coming as Unpaid, and the event appears in A's My Events under Payments to send.
- As A, tap I've sent it. The badge becomes Pending confirmation in A's dashboard, on the public event page, and in B's organizing panel.
- As B, tap Confirm e-Transfer received. The badge becomes Paid in all three places, and B's confirmed total increases by the ticket price.
- As A, try to break it: confirm there is no button to mark yourself Paid, and a direct Supabase API call to set the status to `paid` fails.
- Repeat the RSVP with a free event: status is Going · Free, with no payment instructions anywhere.
- Fill the event to capacity and confirm a third account cannot RSVP.
- Turn off one email preference for A, trigger that email type, and confirm nothing arrives. Trigger an email type that is on — the RSVP confirmation is the easiest — and confirm a real Brevo test email arrives in A's inbox.
- Switch to 繁體中文 and repeat the core flow: Home, an event page, RSVP, and My Events are fully in Traditional Chinese with no English interface text left over and no Simplified characters. Set A's preferred language to 繁體中文 and confirm the next Brevo email arrives in Traditional Chinese.

## Rules — out of scope

- **e-Transfer only.** No Stripe, no card payments, no Stripe Connect, no PayPal checkout. Do not add a payment SDK.
- **No Zeffy.** NATEA does not have a bank account in the organization's name right now, so Zeffy is not usable. Do not integrate it, and do not suggest collecting money through a personal account as a workaround. Revisit only if NATEA incorporates and opens an organization bank account.
- **No Luma.** Events, RSVPs, and attendee lists live in this site's own database.
- **No in-site chat or comments.** Discussion is the Line group.
- **Bilingual, Traditional Chinese only.** Both `en` and `zh-TW` are required in V1. No Simplified Chinese, no `zh-CN` locale, no third language, and no machine-translated event content.
- **No waitlist, no refunds logic, no promo codes, no multi-ticket purchases.** One RSVP is one person, one seat.
- **No admin UI, no event banner image uploads, no Line Login, no Line bot in V1.** They are listed as later steps where they appear.
- Never invent an organizer's e-Transfer email, a price, a Line invite link, or a Brevo value. Use the placeholders in Open inputs and ask the user.
- Keep it simple: one Next.js app, one Supabase project, server-side Brevo calls. Do not add a separate backend service.

## Open inputs — placeholders to fill in before launch

These are not decided yet. Build with the placeholder, keep each one in a single config spot, and swap in the real value later without code changes elsewhere.

- `[TODO: real Line group invite URL]` — one link used by the Home Line button, the QR code, and every Discuss this event in Line button. Config: `NEXT_PUBLIC_LINE_GROUP_URL`. The real Line group QR code image replaces the placeholder asset at the same time.
- `[TODO: Brevo sender email, sender name, and list ID]` — config: `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, `BREVO_LIST_ID` environment variables.
- `[TODO: Brevo API key]` — config: `BREVO_API_KEY` environment variable only, in `.env.local` and Vercel settings. Never paste the real key into this brief, into code, or into a commit.
- Organizer e-Transfer emails are per-event data, entered in the Host an event form and stored on the event. There is no single NATEA payment address, and the site itself never receives money.
- `[TODO: production domain]` — set the Supabase Auth redirect URLs and the Brevo links to the real domain once it is chosen.
- `[TODO: Traditional Chinese review]` — a Traditional Chinese speaker reviews `messages/zh-TW.json` and both Brevo template languages before launch. The wording is not final until that review happens.
