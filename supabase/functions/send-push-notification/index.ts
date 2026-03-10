import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendViaNextjsApi, type PushPayload } from '../_shared/push-helpers.ts'

/**
 * Edge Function: send-push-notification
 *
 * Triggered by:
 * - Database webhooks (Postgres → Edge Function via HTTP)
 * - Direct HTTP calls from server code
 * - The scheduled-reminders function
 *
 * Expected body: { userId: string, title: string, body?: string, url?: string, triggerType?: string }
 */
Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const body = await req.json() as {
      userId?: string
      title?: string
      body?: string
      url?: string
      triggerType?: 'user_action' | 'server_event' | 'scheduled'
      // Database webhook format
      record?: { user_id?: string; title?: string; body?: string; url?: string }
      type?: string
    }

    // Support both direct calls and database webhook format
    const userId = body.userId ?? body.record?.user_id
    const title = body.title ?? body.record?.title
    const messageBody = body.body ?? body.record?.body
    const url = body.url ?? body.record?.url
    const triggerType = body.triggerType ?? 'server_event'

    if (!userId || !title) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, title' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const appUrl = Deno.env.get('APP_URL') ?? ''
    if (!appUrl) {
      throw new Error('APP_URL environment variable not set')
    }

    const payload: PushPayload = { title, body: messageBody, url, triggerType }
    await sendViaNextjsApi(userId, payload, appUrl)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('send-push-notification error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
