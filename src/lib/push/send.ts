import webpush from 'web-push'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

// Configure VAPID — called once at module load
webpush.setVapidDetails(
  `mailto:${process.env.VAPID_CONTACT_EMAIL}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

// Service-role client — bypasses RLS for server-side operations
function getServiceClient() {
  return createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export interface PushPayload {
  title: string
  body?: string
  url?: string
  icon?: string
  triggerType?: 'user_action' | 'server_event' | 'scheduled'
}

/**
 * Send a push notification to all of a user's subscribed devices.
 * Automatically removes stale subscriptions (410 Gone responses).
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  const supabase = getServiceClient()

  // Fetch all subscriptions for this user
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)

  if (error || !subscriptions?.length) return

  // Log the notification attempt
  const { data: logEntry } = await supabase
    .from('notifications_log')
    .insert({
      user_id: userId,
      title: payload.title,
      body: payload.body,
      url: payload.url,
      trigger_type: payload.triggerType ?? 'server_event',
      status: 'pending',
    })
    .select('id')
    .single()

  const staleIds: string[] = []
  let successCount = 0

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth_key,
        },
      }

      try {
        await webpush.sendNotification(pushSubscription, JSON.stringify(payload))
        successCount++

        // Update last_used_at
        await supabase
          .from('push_subscriptions')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', sub.id)
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode
        if (statusCode === 410 || statusCode === 404) {
          // Subscription expired or invalid — remove it
          staleIds.push(sub.id)
        }
      }
    })
  )

  // Clean up stale subscriptions
  if (staleIds.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', staleIds)
  }

  // Update notification log status
  if (logEntry?.id) {
    await supabase
      .from('notifications_log')
      .update({
        status: successCount > 0 ? 'sent' : 'failed',
        sent_at: new Date().toISOString(),
      })
      .eq('id', logEntry.id)
  }
}

/**
 * Send a push notification to all users with active subscriptions.
 * Use sparingly — intended for broadcast announcements.
 */
export async function sendPushBroadcast(payload: PushPayload): Promise<void> {
  const supabase = getServiceClient()

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*')

  if (error || !subscriptions?.length) return

  const staleIds: string[] = []

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          JSON.stringify(payload)
        )
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode
        if (statusCode === 410 || statusCode === 404) {
          staleIds.push(sub.id)
        }
      }
    })
  )

  if (staleIds.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', staleIds)
  }
}
