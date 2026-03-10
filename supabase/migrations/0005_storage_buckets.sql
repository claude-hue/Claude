-- Create storage buckets

-- Public avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT DO NOTHING;

-- Private uploads bucket (user files)
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', FALSE)
ON CONFLICT DO NOTHING;

-- Storage RLS policies

-- Avatars: anyone can view, authenticated users can upload their own
CREATE POLICY "Public avatar access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own avatar"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Uploads: users access only their own files
CREATE POLICY "Users access own uploads"
  ON storage.objects FOR ALL
  USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
