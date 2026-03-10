/**
 * Shared push notification helpers for Supabase Edge Functions (Deno runtime).
 *
 * NOTE: The `web-push` npm package uses Node.js crypto APIs not available in Deno.
 * Instead, we delegate push sending to the Next.js API route which runs in Node.js.
 * This Edge Function acts as an orchestrator: it queries subscriptions and
 * forwards send requests to the Next.js server.
 */

export interface PushPayload {
  title: string
  body?: string
  url?: string
  triggerType?: 'user_action' | 'server_event' | 'scheduled'
}

/**
 * Delegates push sending to the Next.js /api/push/send route.
 * The Next.js server uses the `web-push` library which runs in Node.js.
 */
export async function sendViaNextjsApi(
  targetUserId: string,
  payload: PushPayload,
  appUrl: string
): Promise<void> {
  const res = await fetch(`${appUrl}/api/push/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Internal service-to-service calls use the service role key as a bearer token
      Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    },
    body: JSON.stringify({ targetUserId, ...payload }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Push API error ${res.status}: ${text}`)
  }
}
