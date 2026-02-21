# Gym Membership Management Web App PRD

## Original Problem Statement
Build a Gym Membership Management Web Application that supports admin authentication (OTP + Google), member/package/payment management, reminders (email + WhatsApp), configurable reminder rules, and a dashboard with analytics.

## Architecture Decisions
- Frontend: React (Vite) + Material UI + React Router + Axios
- Backend: FastAPI + Motor (MongoDB) + JWT auth + APScheduler for daily reminders
- DB: MongoDB Atlas (connection via MONGO_URL env)
- Integrations: Gmail SMTP for OTP; WhatsApp Cloud API for reminders; Google OAuth 2.0
- Super Admin: role-based access with global dashboards and admin/member management

## Implemented Features
- Admin auth: register (OTP email), verify OTP, login, Google login, forgot/reset password, refresh token, rate-limit login attempts
- Super Admin: auto-provisioned account, role-based navigation, global dashboard, admin management, global member visibility
- Dashboard: member counts, revenue, charts, upcoming expirations
- Members: CRUD, search/filter/sort, pagination, payment status, manual reminders

- Member photos: optional Cloudinary upload with signed URLs; photo shown in list and Add/Edit dialog
- Member form dropdowns: gender and payment method
- Packages: CRUD and assignment to members
- Payments: partial payments + history tracking
- Settings: profile, password change, SMTP/WhatsApp credentials, reminder rules
- Notifications: daily reminder scheduler (expiry + pending payment)

## Backlog
### P0
- Validate Google OAuth domain whitelisting in production
- Validate WhatsApp reminders with real credentials

### P1
- Add member status “Cancelled” workflow + UI actions
- Add export/download reports (CSV)

### P2
- Add advanced analytics (churn, cohort retention)
- Add role-based access (multi-admin roles)

## Next Tasks
- Add WhatsApp Cloud API access token + phone number ID in Settings
- Validate OTP sign-up flow with Gmail SMTP in production
