# NATEA — Toronto IT Community

A bilingual (English / 繁體中文) community website for Taiwanese in Toronto who love tech — whether you work in IT or are just starting to learn it.

**Live site:** https://toronto-natea.org
**Also live at:** https://natea-event-website.vercel.app

## New here? How to use this website — 新手使用流程

Welcome to NATEA! This is a short guide for first-time visitors. No account is needed to browse events — you only need one to RSVP or host an event.

歡迎加入 NATEA！這是給第一次來的新成員的簡單指南。瀏覽活動不需要帳號，只有要報名或主辦活動時才需要註冊。

### 1. Browse events — 瀏覽活動

- Go to the home page and scroll to **Upcoming events**.
- Use the filters at the top: **All / Workshops / Free / Paid**.
- Click any event card to see the details: date and time, location (with a map), ticket price, what's included, what to bring, and who's going.
- You can switch language at any time — **EN / 繁體中文** in the header.

### 2. Create an account — 建立帳號

- Click **Log in** (top right), then **Sign up**.
- Sign up with your **email** (you'll get a confirmation code) or with **Google**.
- After signing up, you'll be taken to your **Profile** page — add a display name and an avatar (photo or emoji) so other members can recognize you.
- Forgot your password? Click **Forgot password** on the login page — you'll get an 8-digit code by email to reset it.

### 3. RSVP to an event — 報名活動

- On an event page, click **RSVP**.
- **Free event:** you're in right away — no payment needed.
- **Paid event:** RSVP first, then pay (see step 4). Your spot is held while you pay.
- **Bringing a guest?** Tick **Bring a guest** — your guest pays the same ticket price and counts as one extra spot. A guest name is optional.
- **Event full?** Click **Join waitlist** instead — no payment needed. If a spot opens up, the earliest person on the waitlist is automatically moved in and gets an email. You only pay if you're promoted.

### 4. Pay by e-Transfer — 以 e-Transfer 付款

NATEA uses **Interac e-Transfer only** — no card payments.

1. RSVP to the event first.
2. Send an e-Transfer for the ticket amount to the **organizer's email** shown on the event page / in your RSVP confirmation email. Pay before the **payment deadline** shown on the event page.
3. Go to **My Events → Events I'm going to**, find the event, and click **"I've sent it"**.
4. The host checks their e-Transfer and clicks **Confirm** — you'll get a confirmation email, and your status changes to **Paid**. You're all set!

### 5. My Events — 我的活動

- **My Events** (in the header, after logging in) is your home base:
  - **Events I'm going to** — your RSVPs, payment status (Free / Unpaid / Pending / Paid), the e-Transfer box, and **Cancel my RSVP / Request cancellation** on the same line as your status.
  - **Events I'm hosting** — events you created, payments to confirm, and refund requests.
  - **Payments you received** — a summary of confirmed payments for your events.

### 6. Cancel or ask for a refund — 取消報名 / 申請退款

- **Free or unpaid RSVP:** click **Cancel my RSVP** — it cancels immediately, and the host gets an email.
- **Paid RSVP:** click **Request cancellation**, enter the **e-Transfer email where you want your refund sent**, and click **Send refund request**. The host is emailed, confirms it in My Events, and sends your refund by e-Transfer. You'll get an email when the refund is on its way.
- If you were on the waitlist, cancelling frees your spot for the next person automatically.

### 7. Host an event — 主辦活動

- Click **Host an event** in the header.
- Fill in the title, date and time, location (start typing and pick a suggestion — the end time fills in automatically, 2 hours after the start), price (0 = free), capacity, description, agenda, and what's included / what to bring.
- If the event costs money, set a **payment deadline** — attendees must pay by then.
- Submit it — an admin reviews it, and it goes public once approved. You'll get an email when it's approved.
- As host, you confirm payments and handle refunds in **My Events → Events I'm hosting**.

### 8. Join us on Line — 加入 Line 群組

- On the home page, find the **Join us on Line** section and scan the QR code (or click the link) to join the NATEA Line group — that's where members chat, share updates, and ask questions.

### Quick FAQ — 常見問題

| Question | Answer |
|---|---|
| Do I need an account to browse? | No — only to RSVP or host. |
| How do I pay? | Interac e-Transfer to the organizer, then click "I've sent it". No card payments. |
| I paid but my status is still "Pending"? | The host hasn't confirmed yet — they'll confirm after checking their e-Transfer. You'll get an email when they do. |
| Can I bring a guest? | Yes — 1 guest per RSVP, same ticket price, guest name optional. |
| The event is full — what now? | Join the waitlist. You'll be emailed if a spot opens, and you only pay then. |
| How do I cancel? | My Events → find the event → Cancel my RSVP (free/unpaid) or Request cancellation (paid, with a refund email). |
| I didn't get an email? | Check spam/junk, and make sure you're using the email on your profile. |

---

## What it does

- Browse and search community events, see who's going
- RSVP, with plus-ones (0 or 1 guest per RSVP)
- Pay by Interac e-Transfer directly to the event host — RSVP → "I've sent it" → host confirms → Paid
- Waitlist — join when an event is full, auto-promoted when a spot opens
- Host an event (admin approval required before it goes public)
- Sign up / log in with email or Google, My Events, profile with avatar (photo or emoji)
- Online events with a meeting link shown only after RSVP
- Transactional emails via Brevo (RSVP confirmation, payment reported / confirmed, cancel / refund, waitlist promotion, password reset via 8-digit code)

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres + Auth + Storage, Row Level Security)
- Brevo (transactional email + custom SMTP for Supabase Auth emails)
- next-intl (`en` / `zh-TW` locales)
- Google Maps Places (new `PlaceAutocompleteElement`) for location search
- Deployed on Vercel

## Getting started

```bash
npm install
npm run dev