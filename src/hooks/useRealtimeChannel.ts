'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

type PostgresChangesEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

interface UseRealtimeChannelOptions<T extends Record<string, unknown>> {
  table: string
  event?: PostgresChangesEvent
  schema?: string
  filter?: string
  onData: (payload: RealtimePostgresChangesPayload<T>) => void
}

/**
 * Subscribe to Supabase Realtime changes for a table.
 * Automatically cleans up the subscription on unmount.
 */
export function useRealtimeChannel<T extends Record<string, unknown>>({
  table,
  event = '*',
  schema = 'public',
  filter,
  onData,
}: UseRealtimeChannelOptions<T>) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const onDataRef = useRef(onData)
  onDataRef.current = onData

  useEffect(() => {
    const supabase = createClient()

    const channelConfig = {
      event,
      schema,
      table,
      ...(filter ? { filter } : {}),
    }

    const channel = supabase
      .channel(`realtime:${table}:${filter ?? 'all'}`)
      .on(
        'postgres_changes' as Parameters<RealtimeChannel['on']>[0],
        channelConfig,
        (payload: RealtimePostgresChangesPayload<T>) => {
          onDataRef.current(payload)
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, event, schema, filter])
}
