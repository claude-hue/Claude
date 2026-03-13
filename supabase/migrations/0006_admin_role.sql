-- Add admin flag to profiles
-- Admin API routes use service_role (bypasses RLS), so no extra policy needed.
-- Own-profile reads are already covered by "Users can view own profile".
ALTER TABLE public.profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE NOT NULL;
