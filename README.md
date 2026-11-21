# NATEA — Toronto IT Community

A bilingual (English / 繁體中文) community website for Taiwanese in Toronto who love tech — whether you work in IT or are just starting to learn it.

**Live site:** https://natea-event-website.vercel.app

## What it does

- Browse and search community events, see who's going
- RSVP, with plus-ones (0 or 1 guest per RSVP)
- Pay by Interac e-Transfer directly to the event host — RSVP → "I've sent it" → host confirms → Paid
- Host an event (admin approval required before it goes public)
- Sign up / log in with email or Google, My Events, profile with avatar (photo or emoji)
- Online events with a meeting link shown only after RSVP
- Transactional emails via Brevo (RSVP confirmation, payment reported / confirmed, password reset via 8-digit code)

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres + Auth + Storage, Row Level Security)
- Brevo (transactional email + custom SMTP for Supabase Auth emails)
- next-intl (`en` / `zh-TW` locales)
- Deployed on Vercel

## Getting started

```bash
npm install
npm run dev
