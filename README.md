# DEV Speech & Hearing Clinic — Full-stack starter

## Included
- Responsive frontend, supplied clinic logo, supplied service photographs
- Three-dot menu with English/Hindi selector and four themes
- Help chat: clinic FAQ works without an AI key; optional AI answers when `OPENAI_API_KEY` is configured
- Appointment API with server-side validation and SQLite persistence
- Email notification attempt to `CLINIC_EMAIL` when SMTP is configured
- WhatsApp click-to-chat link prepared after appointment submission
- Protected basic admin API to list/update appointments
- Helmet security headers and rate limiting

## Run locally
1. Install Node.js 18.17+.
2. In this project directory run `npm install`.
3. Copy `.env.example` to `.env` and configure the values you need.
4. Run `npm start`.
5. Open `http://localhost:3000`.

## Email setup
The clinic notification address is `devspeechandhearingclinic01@gmail.com`. To send mail, configure an SMTP provider in `.env`. If using Gmail SMTP, use a Google App Password where supported, not your normal account password. Keep `.env` private. The server reports whether email was sent; if SMTP is not configured, the appointment is still saved but email is not delivered.

## AI help setup
Without `OPENAI_API_KEY`, the help chat uses a small built-in clinic FAQ. For generative AI replies, configure a valid server-side API key in `.env`. Never expose the key in frontend JavaScript. AI output is not medical diagnosis.

## WhatsApp limitation
This version opens a prefilled WhatsApp message after the appointment has been saved. The visitor must tap Send. Automatically sending WhatsApp messages to the clinic requires WhatsApp Business Platform/API credentials and an approved setup; this project does not pretend that a click-to-chat link is automatic delivery.

## Admin API
Set a long random `ADMIN_TOKEN` in `.env`.
- List appointments: `GET /api/admin/appointments` with header `x-admin-token: YOUR_TOKEN`
- Change status: `PATCH /api/admin/appointments/:id` with JSON `{"status":"confirmed"}` and the same header
Valid statuses: `new`, `confirmed`, `cancelled`, `completed`.

This is a starter API, not a polished admin UI. Do not expose the token in browser code. For production, use a proper authenticated admin interface, HTTPS, database backups, persistent storage, and privacy/data-retention controls.

## Production deployment notes
- Deploy this Node.js app to a host that supports Node.js server processes, not a static-only host.
- Attach persistent storage for `data/appointments.sqlite`; ephemeral disks may lose appointments during redeploys.
- Set environment variables in the hosting dashboard. Do not upload `.env`.
- Configure SMTP, then test a real booking and confirm the clinic inbox receives it.
- Configure `OPENAI_API_KEY` only if you want AI-generated help replies.
- Set a strong unique `ADMIN_TOKEN`.
- Set up HTTPS and backups.
- Domain availability and hosting plan costs vary.
