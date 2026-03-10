# PWA Supabase App

A full-featured Progressive Web App built with **Next.js**, **Supabase**, and **Web Push** — including iOS push notifications (iOS 16.4+).

## Features

- **Authentication** — email/password login via Supabase Auth
- **Database** — PostgreSQL with Row Level Security
- **Realtime** — live data subscriptions via Supabase Realtime
- **Storage** — file uploads via Supabase Storage
- **Push Notifications** — Web Push with VAPID keys, including iOS 16.4+
- **PWA** — installable, offline-ready, full-screen standalone mode

## iOS Push Notification Requirements

All of the following must be true for push to work on iOS:

| Requirement | Status |
|---|---|
| iOS 16.4 or later | User's device |
| HTTPS | Provided by Vercel |
| `display: standalone` in manifest | ✅ Configured |
| `apple-mobile-web-app-capable` meta tag | ✅ Configured |
| App added to Home Screen | User must do this |
| Permission triggered by user gesture | ✅ Button click |
| `userVisibleOnly: true` | ✅ Configured |

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

Go to [supabase.com](https://supabase.com) and create a new project.

### 3. Generate VAPID keys

```bash
npx web-push generate-vapid-keys
```

### 4. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

### 5. Run database migrations

```bash
# Link to your Supabase project
npx supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
npx supabase db push
```

### 6. Deploy Edge Functions

```bash
npx supabase functions deploy send-push-notification
npx supabase functions deploy scheduled-reminders
```

Set the `APP_URL` secret for Edge Functions:

```bash
npx supabase secrets set APP_URL=https://yourdomain.com
```

### 7. Run locally

```bash
npm run dev
```

### 8. Deploy to Vercel

```bash
vercel --prod
```

Add all environment variables from `.env.local` in the Vercel dashboard.

## App Icons

The `public/icons/` directory contains placeholder icons. Replace them with real PNG images before production:

- `icon-192x192.png` — 192×192px
- `icon-512x512.png` — 512×512px
- `maskable-icon-512x512.png` — 512×512px with safe zone padding
- `apple-touch-icon.png` — 180×180px

Use [maskable.app](https://maskable.app/) to generate maskable icons.

## Architecture

```
src/
├── app/
│   ├── (auth)/          # Login, register, callback
│   ├── (protected)/     # Dashboard, settings (auth-gated)
│   └── api/push/        # Subscribe, unsubscribe, send
├── components/
│   ├── PushNotificationManager.tsx  # SW registration + iOS detection
│   └── InstallPrompt.tsx            # Add-to-Home-Screen guidance
├── hooks/
│   ├── usePushNotifications.ts      # Push subscription lifecycle
│   ├── useRealtimeChannel.ts        # Supabase Realtime subscriptions
│   └── useInstallPrompt.ts          # PWA install detection
├── lib/
│   ├── supabase/                    # Client, server, middleware, types
│   └── push/send.ts                 # Server-side web-push helper
└── sw-src/sw.ts                     # Service worker (push handler)

supabase/
├── migrations/                      # DB schema
└── functions/                       # Edge Functions (Deno)
```
