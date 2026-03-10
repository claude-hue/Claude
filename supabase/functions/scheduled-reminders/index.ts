import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendViaNextjsApi } from '../_shared/push-helpers.ts'

/**
 * Edge Function: scheduled-reminders
 *
 * Invoked on a schedule via Supabase cron (configured in the dashboard or config.toml).
 * Queries pending reminder notifications and dispatches them.
 *
 * Example cron schedule (every minute): * * * * *
 * Set in Supabase Dashboard → Edge Functions → scheduled-reminders → Schedule
 */
Deno.serve(async (_req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const appUrl = Deno.env.get('APP_URL') ?? ''

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Fetch pending scheduled notifications (due now or overdue)
    const now = new Date().toISOString()
    const { data: pending, error } = await supabase
      .from('notifications_log')
      .select('*')
      .eq('status', 'pending')
      .eq('trigger_type', 'scheduled')
      .lte('created_at', now)
      .limit(100)

    if (error) {
      throw new Error(`Query error: ${error.message}`)
    }

    if (!pending?.length) {
      return new Response(JSON.stringify({ dispatched: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let dispatched = 0

    await Promise.allSettled(
      pending.map(async (notification) => {
        if (!notification.user_id) return

        try {
          await sendViaNextjsApi(
            notification.user_id,
            {
              title: notification.title,
              body: notification.body ?? undefined,
              url: notification.url ?? undefined,
              triggerType: 'scheduled',
            },
            appUrl
          )

          // Mark as sent
          await supabase
            .from('notifications_log')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', notification.id)

          dispatched++
        } catch (err) {
          console.error(`Failed to send notification ${notification.id}:`, err)

          // Mark as failed
          await supabase
            .from('notifications_log')
            .update({ status: 'failed' })
            .eq('id', notification.id)
        }
      })
    )

    return new Response(JSON.stringify({ dispatched }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('scheduled-reminders error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
