# Codebase Reference

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.1.6 (App Router, TypeScript) |
| Styling | Tailwind CSS 3.4 |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth + `@supabase/ssr` (cookie-based SSR) |
| Realtime | Supabase Realtime (`postgres_changes`) |
| Storage | Supabase Storage |
| Push | Web Push API + VAPID keys |
| PWA | `@ducanh2912/next-pwa`, Service Worker |

---

## Folder Map

```
src/
├── app/
│   ├── (auth)/                    # Public auth pages (no layout guard)
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── callback/route.ts      # OAuth callback
│   ├── (protected)/               # Auth-required pages
│   │   ├── layout.tsx             # Guards all protected routes + BugReportButton
│   │   ├── dashboard/page.tsx     # Landing page after login
│   │   ├── settings/page.tsx      # Push notification settings
│   │   ├── messages/
│   │   │   ├── layout.tsx         # Two-panel chat layout shell
│   │   │   ├── page.tsx           # Empty state (select a conversation)
│   │   │   └── [id]/page.tsx      # Individual chat window
│   │   └── admin/
│   │       ├── layout.tsx         # Admin-only guard
│   │       ├── page.tsx           # Push notification broadcaster
│   │       └── bugs/page.tsx      # Bug report management
│   ├── api/
│   │   ├── conversations/
│   │   │   ├── route.ts           # GET list / POST create
│   │   │   └── [id]/
│   │   │       ├── route.ts       # GET details / PATCH update
│   │   │       ├── messages/route.ts  # GET paginated / POST send / DELETE
│   │   │       └── members/route.ts   # POST add / DELETE remove / PATCH role
│   │   ├── upload/route.ts        # POST multipart file upload
│   │   ├── bugs/route.ts          # GET own reports / POST submit
│   │   ├── users/search/route.ts  # GET search profiles by name
│   │   ├── push/                  # Push notification endpoints
│   │   ├── admin/
│   │   │   ├── subscribers/route.ts
│   │   │   ├── notifications/route.ts
│   │   │   └── bugs/route.ts      # GET all reports / PATCH status
│   │   └── vapid-public-key/route.ts
│   └── layout.tsx                 # Root layout (PWA metadata)
├── components/
│   ├── chat/
│   │   ├── MessagesLayoutClient.tsx   # Two-panel responsive shell (client)
│   │   ├── ConversationList.tsx       # Left sidebar with conversation list
│   │   ├── ChatWindow.tsx             # Full chat view with messages
│   │   ├── MessageBubble.tsx          # Individual message renderer
│   │   ├── MessageInput.tsx           # Text + file input
│   │   ├── NewConversationModal.tsx   # Create DM or group
│   │   └── GroupInfoPanel.tsx         # Slide-in group management panel
│   ├── BugReportButton.tsx            # Floating bug report trigger
│   ├── BugReportModal.tsx             # Bug submission form
│   ├── PushNotificationManager.tsx
│   └── InstallPrompt.tsx              # Android/iOS install prompt
├── hooks/
│   ├── useRealtimeChannel.ts          # Supabase Realtime subscription hook
│   ├── usePushNotifications.ts
│   └── useInstallPrompt.ts
└── lib/
    ├── supabase/
    │   ├── client.ts                  # Browser client (createBrowserClient)
    │   ├── server.ts                  # Server client (createServerClient + cookies)
    │   ├── middleware.ts              # Session refresh + route protection
    │   └── types.ts                   # Manual TypeScript DB types
    └── push/send.ts                   # Server-side web-push send helpers
```

---

## Database Schema

### `profiles`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | = auth.users.id |
| display_name | TEXT | nullable |
| avatar_url | TEXT | nullable |
| is_admin | BOOLEAN | default false |
| created_at | TIMESTAMPTZ | |

Auto-created via trigger on `auth.users` INSERT.

### `conversations`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| type | TEXT | `'direct'` or `'group'` |
| name | TEXT | null for DMs |
| description | TEXT | nullable |
| avatar_url | TEXT | nullable |
| created_by | UUID | → auth.users |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | auto-bumped on new message |

### `conversation_members`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| conversation_id | UUID | → conversations |
| user_id | UUID | → auth.users |
| role | TEXT | `'member'` or `'admin'` |
| joined_at | TIMESTAMPTZ | |
| last_read_at | TIMESTAMPTZ | bumped when fetching messages |

Unique constraint: `(conversation_id, user_id)`.

### `messages`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| conversation_id | UUID | → conversations |
| sender_id | UUID | → auth.users, nullable (system msgs) |
| content | TEXT | nullable |
| type | TEXT | `'text'`, `'image'`, `'file'`, `'system'` |
| file_url | TEXT | public URL for attachments |
| file_name | TEXT | original filename |
| file_size | BIGINT | bytes |
| mime_type | TEXT | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
| deleted_at | TIMESTAMPTZ | soft delete (content nulled) |

### `bug_reports`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID | → auth.users, nullable |
| title | TEXT | required |
| description | TEXT | nullable |
| category | TEXT | `'ui'`, `'crash'`, `'performance'`, `'messaging'`, `'other'` |
| status | TEXT | `'open'`, `'in_progress'`, `'resolved'` |
| created_at | TIMESTAMPTZ | |

### `push_subscriptions`
Web Push device subscriptions (endpoint, p256dh, auth_key, is_ios).

### `notifications_log`
Audit log of sent push notifications.

---

## RLS Approach

All tables have Row Level Security enabled. The key pattern to avoid recursive RLS:

```sql
-- SECURITY DEFINER function bypasses RLS for the subquery
CREATE OR REPLACE FUNCTION is_conversation_member(conv_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = conv_id AND user_id = auth.uid()
  );
$$;
```

Admin API routes use the **service role client** (bypasses all RLS):
```ts
import { createClient as createServiceClient } from '@supabase/supabase-js'
const service = createServiceClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
```

---

## Auth Flow

1. User logs in → Supabase Auth sets cookie
2. `middleware.ts` runs on every request, refreshes session cookie, redirects unauthenticated users from protected routes
3. Protected routes (`/dashboard`, `/messages`, `/admin`, `/settings`) require auth
4. Server components call `createClient()` from `@/lib/supabase/server` — reads cookies
5. Client components call `createClient()` from `@/lib/supabase/client` — uses anon key + session cookie

---

## Messaging Architecture

```
Client opens /messages/[id]
  → ChatWindow fetches GET /api/conversations/[id]/messages
  → useRealtimeChannel subscribes to messages INSERT (filter: conversation_id=eq.{id})
  → New message arrives via Realtime → appended to state immediately
  → User types → MessageInput → POST /api/conversations/[id]/messages
  → Server inserts to DB → triggers update_conversation_on_message() → bumps conversations.updated_at
  → Realtime fires → all subscribed clients receive the new message

ConversationList:
  → Fetches GET /api/conversations on mount
  → useRealtimeChannel on messages (any) → re-fetches list on new messages
  → useRealtimeChannel on conversation_members → re-fetches when added to new group
```

---

## File Upload Flow

```
User selects file in MessageInput
  → POST /api/upload (multipart FormData)
  → Server validates type/size → uploads to chat-attachments Supabase Storage bucket
  → Returns { url, name, size, mimeType, type }
  → Client posts message with file_url, file_name, file_size, mime_type
  → MessageBubble renders: images inline (click to fullscreen), files as download link
```

---

## Push Notification Stack

1. Client registers service worker → subscribes to Web Push with VAPID public key
2. Subscription (endpoint + keys) stored in `push_subscriptions` table
3. Admin sends via `/api/push/send` or `/api/push/broadcast`
4. Server calls `web-push.sendNotification()` with VAPID credentials
5. Service Worker (`public/sw.js`) receives `push` event → shows notification
6. User clicks notification → service worker opens app URL

**iOS note:** Requires iOS 16.4+, app must be installed to Home Screen (standalone mode).

---

## Admin Access

`is_admin` boolean on `profiles` table. To grant:
```sql
UPDATE public.profiles SET is_admin = TRUE WHERE id = '<user-uuid>';
```

Admin features:
- `/admin` — Send push notifications, view subscriber list
- `/admin/bugs` — View and manage bug reports

Non-admin users hitting admin API routes get `403 Forbidden`.

---

## Bug Reporting

- Floating button (bottom-right) on all pages except active conversations
- Submits to `POST /api/bugs` → stored in `bug_reports` table
- Admin views all reports at `/admin/bugs`
- Claude Code reads open bugs automatically at session start (see `CLAUDE.md`)

---

## PWA Install

**Android (Chrome):** `beforeinstallprompt` event fires when PWA criteria met.
`useInstallPrompt` hook captures it → `InstallPrompt` component shows install button.

**iOS (Safari):** No `beforeinstallprompt`. Must manually: Share → Add to Home Screen.
`InstallPrompt` shows step-by-step guide when `isIOS && !isStandalone`.

**Criteria for Android install prompt:**
- Served over HTTPS
- `manifest.json` with `display: standalone`, icons, `start_url`
- Service worker registered

---

## Key Environment Variables

| Variable | Used In | Notes |
|----------|---------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Public anon key (safe to expose) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Bypasses RLS — never expose to client |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Client + baked into next.config.js | Web Push public key |
| `VAPID_PRIVATE_KEY` | Server only | Web Push private key |
| `VAPID_CONTACT_EMAIL` | Server only | Web Push contact email |
| `NEXT_PUBLIC_APP_URL` | Server | For push notification click URLs |

---

## Adding New Features

1. **Migration** — Add SQL to `supabase/migrations/XXXX_name.sql`, apply via Supabase MCP
2. **Types** — Update `src/lib/supabase/types.ts` with new table Row/Insert/Update types
3. **API route** — Create in `src/app/api/...` using `createClient()` from `@/lib/supabase/server`
4. **Component** — Create client component, fetch from API or use `useRealtimeChannel` for live data
5. **Page** — Create server component in `src/app/(protected)/...` that renders the client component
6. **Commit & push** to `claude/debug-broken-functionality-s7X5p`
