// Auto-generate this file with: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/supabase/types.ts
// Manual type definitions until generation is set up

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth_key: string
          user_agent: string | null
          is_ios: boolean
          created_at: string
          last_used_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth_key: string
          user_agent?: string | null
          is_ios?: boolean
          created_at?: string
          last_used_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth_key?: string
          user_agent?: string | null
          is_ios?: boolean
          created_at?: string
          last_used_at?: string
        }
        Relationships: []
      }
      notifications_log: {
        Row: {
          id: string
          user_id: string | null
          title: string
          body: string | null
          url: string | null
          trigger_type: 'user_action' | 'server_event' | 'scheduled' | null
          status: 'pending' | 'sent' | 'failed'
          sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          title: string
          body?: string | null
          url?: string | null
          trigger_type?: 'user_action' | 'server_event' | 'scheduled' | null
          status?: 'pending' | 'sent' | 'failed'
          sent_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          title?: string
          body?: string | null
          url?: string | null
          trigger_type?: 'user_action' | 'server_event' | 'scheduled' | null
          status?: 'pending' | 'sent' | 'failed'
          sent_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
