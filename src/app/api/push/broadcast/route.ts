import { createClient } from '@/lib/supabase/server'
import { sendPushBroadcast } from '@/lib/push/send'
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: {
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

  if (!body.title) {
    return NextResponse.json({ error: 'Missing required field: title' }, { status: 400 })
  }

  try {
    await sendPushBroadcast({
      title: body.title,
      body: body.body,
      url: body.url,
      triggerType: body.triggerType ?? 'user_action',
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Broadcast push error:', err)
    return NextResponse.json({ error: 'Failed to send broadcast' }, { status: 500 })
  }
}
