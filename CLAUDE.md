# Claude Code Session Instructions

## Automatic Bug Report Check

At the start of **every session**, run the following query using the Supabase MCP tool (`mcp__Supabase__execute_sql`) to check for open bug reports:

**Project ID:** `atmlbabflhnjakitutcy`

```sql
SELECT
  br.id,
  br.title,
  br.description,
  br.category,
  br.status,
  br.created_at,
  p.display_name AS reporter
FROM public.bug_reports br
LEFT JOIN public.profiles p ON p.id = br.user_id
WHERE br.status = 'open'
ORDER BY br.created_at DESC
LIMIT 20;
```

- If there are **open bugs**: list them briefly at the top of your first response before addressing the user's request. Format as a compact list: `[category] title — reporter (date)`.
- If there are **no open bugs**: proceed normally without mentioning it.

## Project Context

This is a Next.js 16 PWA messaging app (WhatsApp-like) with Supabase backend.
See `CODEBASE.md` for the full architecture reference.

## Development Branch

Always develop on branch: `claude/debug-broken-functionality-s7X5p`
Always push with: `git push -u origin claude/debug-broken-functionality-s7X5p`
