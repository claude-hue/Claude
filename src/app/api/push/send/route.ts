import { createClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/push/send'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    targetUserId?: string
    title?: string
    body?: string
    url?: string
    triggerType?: 'user_action' | 'server_event' | 'scheduled'
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { targetUserId, title, triggerType } = body
  if (!targetUserId || !title) {
    return NextResponse.json({ error: 'Missing required fields: targetUserId, title' }, { status: 400 })
  }

  try {
    await sendPushToUser(targetUserId, {
      title,
      body: body.body,
      url: body.url,
      triggerType: triggerType ?? 'user_action',
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Push send error:', err)
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
}
