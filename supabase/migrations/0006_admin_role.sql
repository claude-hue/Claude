-- Add admin flag to profiles
ALTER TABLE public.profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE NOT NULL;

-- Admins can read all profiles (needed for subscriber list in admin dashboard)
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );
